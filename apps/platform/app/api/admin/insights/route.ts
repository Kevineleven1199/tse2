import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || !["HQ", "MANAGER"].includes(session.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = session.tenantId;
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);

  try {
    // 1. Revenue metrics
    const [thisMonthRevenue, lastMonthRevenue, totalRevenue] = await Promise.all([
      prisma.paymentRecord.aggregate({
        where: { request: { tenantId }, status: "CAPTURED", createdAt: { gte: thisMonthStart } },
        _sum: { amount: true },
      }),
      prisma.paymentRecord.aggregate({
        where: { request: { tenantId }, status: "CAPTURED", createdAt: { gte: lastMonthStart, lt: thisMonthStart } },
        _sum: { amount: true },
      }),
      prisma.paymentRecord.aggregate({
        where: { request: { tenantId }, status: "CAPTURED" },
        _sum: { amount: true },
      }),
    ]);

    // 2. Conversion metrics
    const [totalRequests, acceptedRequests, recentRequests, recentAccepted] = await Promise.all([
      prisma.serviceRequest.count({ where: { tenantId } }),
      prisma.serviceRequest.count({ where: { tenantId, status: { in: ["ACCEPTED", "SCHEDULED", "COMPLETED"] } } }),
      prisma.serviceRequest.count({ where: { tenantId, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.serviceRequest.count({ where: { tenantId, status: { in: ["ACCEPTED", "SCHEDULED", "COMPLETED"] }, createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    // 3. Job metrics
    const [completedJobs, scheduledJobs, cancelledJobs, avgJobValue] = await Promise.all([
      prisma.job.count({ where: { tenantId, status: "COMPLETED" } }),
      prisma.job.count({ where: { tenantId, status: { in: ["PENDING", "CLAIMED", "SCHEDULED"] } } }),
      prisma.job.count({ where: { tenantId, status: "CANCELED" } }),
      prisma.job.aggregate({
        where: { tenantId, status: "COMPLETED", payoutAmount: { not: null } },
        _avg: { payoutAmount: true }
      }),
    ]);

    // 4. Customer metrics
    const [totalCustomers, newCustomers30d, repeatCustomers] = await Promise.all([
      prisma.user.count({ where: { tenantId, role: "CUSTOMER" } }),
      prisma.user.count({ where: { tenantId, role: "CUSTOMER", createdAt: { gte: thirtyDaysAgo } } }),
      prisma.serviceRequest.groupBy({
        by: ["customerEmail"],
        where: { tenantId, status: { in: ["ACCEPTED", "SCHEDULED", "COMPLETED"] } },
        having: { customerEmail: { _count: { gt: 1 } } },
      }),
    ]);

    // 5. Team metrics
    const [activeCleaners, topCleaners] = await Promise.all([
      prisma.cleanerProfile.count({ where: { active: true, user: { tenantId } } }),
      prisma.cleanerProfile.findMany({
        where: { active: true, user: { tenantId } },
        orderBy: { rating: "desc" },
        take: 5,
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
    ]);

    // 6. Lead pipeline
    const [totalLeads, hotLeads, convertedLeads] = await Promise.all([
      prisma.crmLead.count({ where: { tenantId } }),
      prisma.crmLead.count({ where: { tenantId, priority: { gte: 7 } } }),
      prisma.crmLead.count({ where: { tenantId, status: "CONVERTED" } }),
    ]);

    // 7. Recent activity — last 10 quotes accepted
    const recentAcceptances = await prisma.serviceRequest.findMany({
      where: { tenantId, status: { in: ["ACCEPTED", "SCHEDULED"] } },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { customerName: true, serviceType: true, updatedAt: true },
    });

    // 8. Monthly revenue trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const rev = await prisma.paymentRecord.aggregate({
        where: { request: { tenantId }, status: "CAPTURED", createdAt: { gte: monthStart, lt: monthEnd } },
        _sum: { amount: true },
      });
      monthlyTrend.push({
        month: monthStart.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        revenue: rev._sum.amount || 0,
      });
    }

    // 9. Busiest days (by completed jobs)
    const completedJobsList = await prisma.job.findMany({
      where: { tenantId, status: "COMPLETED", scheduledStart: { not: null } },
      select: { scheduledStart: true },
    });

    const dayCount = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    completedJobsList.forEach(j => {
      if (j.scheduledStart) dayCount[j.scheduledStart.getDay()]++;
    });
    const busiestDays = dayNames
      .map((name, i) => ({ day: name, jobs: dayCount[i] }))
      .sort((a, b) => b.jobs - a.jobs)
      .slice(0, 3);

    // 10. Recurring schedule stats
    const [activeRecurring, totalRecurringRevenue] = await Promise.all([
      prisma.recurringSchedule.count({ where: { tenantId, active: true } }),
      prisma.recurringSchedule.aggregate({
        where: { tenantId, active: true },
        _sum: { basePrice: true },
      }),
    ]);

    const conversionRate = totalRequests > 0 ? ((acceptedRequests / totalRequests) * 100) : 0;
    const recentConversionRate = recentRequests > 0 ? ((recentAccepted / recentRequests) * 100) : 0;
    const retentionRate = totalCustomers > 0 ? ((repeatCustomers.length / totalCustomers) * 100) : 0;

    return NextResponse.json({
      revenue: {
        thisMonth: thisMonthRevenue._sum.amount || 0,
        lastMonth: lastMonthRevenue._sum.amount || 0,
        total: totalRevenue._sum.amount || 0,
        monthlyTrend,
        monthOverMonthGrowth: (lastMonthRevenue._sum.amount || 0) > 0
          ? (((thisMonthRevenue._sum.amount || 0) - (lastMonthRevenue._sum.amount || 0)) / (lastMonthRevenue._sum.amount || 1) * 100)
          : 0,
      },
      conversion: {
        totalRequests,
        acceptedRequests,
        conversionRate: Number(conversionRate.toFixed(1)),
        recentConversionRate: Number(recentConversionRate.toFixed(1)),
      },
      jobs: {
        completed: completedJobs,
        scheduled: scheduledJobs,
        cancelled: cancelledJobs,
        avgValue: Number((avgJobValue._avg.payoutAmount || 0).toFixed(2)),
        busiestDays,
      },
      customers: {
        total: totalCustomers,
        new30d: newCustomers30d,
        repeatCount: repeatCustomers.length,
        retentionRate: Number(retentionRate.toFixed(1)),
      },
      team: {
        activeCleaners,
        topCleaners: topCleaners.map(c => ({
          name: `${c.user.firstName} ${c.user.lastName}`,
          rating: c.rating,
          completedJobs: c.completedJobs,
        })),
      },
      leads: {
        total: totalLeads,
        hot: hotLeads,
        converted: convertedLeads,
      },
      recurring: {
        activeSchedules: activeRecurring,
        monthlyRecurringRevenue: totalRecurringRevenue._sum.basePrice || 0,
      },
      recentAcceptances: recentAcceptances.map(r => ({
        customer: r.customerName,
        service: r.serviceType,
        date: r.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[insights] Failed:", error);
    return NextResponse.json({ error: "Failed to load insights" }, { status: 500 });
  }
}
