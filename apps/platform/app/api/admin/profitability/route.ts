export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import { NextRequest, NextResponse } from "next/server";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachMonthOfInterval,
  eachWeekOfInterval,
  format,
  parseISO,
} from "date-fns";

interface GroupedProfitability {
  label: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
  jobs: number;
}

interface ProfitabilityResponse {
  summary: {
    totalRevenue: number;
    totalCosts: number;
    totalProfit: number;
    avgMargin: number;
    jobCount: number;
  };
  byGroup: GroupedProfitability[];
}

type GroupBy = "month" | "week" | "serviceType";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession();

    // Check authorization - only HQ or MANAGER
    if (session.role !== "HQ" && session.role !== "MANAGER") {
      return NextResponse.json(
        { error: "Unauthorized - HQ or MANAGER access required" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const groupByParam = (searchParams.get("groupBy") || "month") as GroupBy;

    // Validate groupBy parameter
    const validGroupBy: GroupBy[] = ["month", "week", "serviceType"];
    if (!validGroupBy.includes(groupByParam)) {
      return NextResponse.json(
        { error: `Invalid groupBy. Must be one of: ${validGroupBy.join(", ")}` },
        { status: 400 }
      );
    }

    // Parse dates or use defaults (last 90 days)
    let fromDate: Date;
    let toDate: Date = new Date();

    if (fromParam && toParam) {
      try {
        fromDate = parseISO(fromParam);
        toDate = parseISO(toParam);
      } catch {
        return NextResponse.json(
          { error: "Invalid date format. Use YYYY-MM-DD" },
          { status: 400 }
        );
      }
    } else {
      toDate = new Date();
      fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 90);
    }

    // Get all jobs within the date range for this tenant
    const jobs = await prisma.job.findMany({
      where: {
        tenantId: session.tenantId,
        scheduledStart: {
          gte: fromDate,
          lte: toDate,
        },
      },
      include: {
        request: {
          select: {
            id: true,
            serviceType: true,
          },
        },
      },
    });

    const jobIds = jobs.map((job) => job.id);
    const requestIds = [...new Set(jobs.map((job) => job.requestId).filter(Boolean))];

    // Get all revenue (PaymentRecords) for these jobs via requestId
    const paymentRecords = await prisma.paymentRecord.findMany({
      where: {
        requestId: { in: requestIds as string[] },
        status: {
          in: ["CAPTURED", "AUTHORIZED"],
        },
      },
      select: {
        amount: true,
        requestId: true,
      },
    });

    // Get all timesheets for these jobs
    const timesheets = await prisma.timesheet.findMany({
      where: {
        jobId: { in: jobIds },
      },
      include: {
        cleaner: {
          select: {
            hourlyRate: true,
          },
        },
      },
    });

    // Get all job costs for these jobs
    const jobCosts = await prisma.jobCost.findMany({
      where: {
        jobId: { in: jobIds },
      },
    });

    // Build revenue map by requestId → split evenly across jobs with that requestId
    const jobsByRequestId = new Map<string, string[]>();
    for (const job of jobs) {
      if (job.requestId) {
        const existing = jobsByRequestId.get(job.requestId) || [];
        existing.push(job.id);
        jobsByRequestId.set(job.requestId, existing);
      }
    }

    const revenueByJobId = new Map<string, number>();
    for (const payment of paymentRecords) {
      const relatedJobs = jobsByRequestId.get(payment.requestId) || [];
      const perJobRevenue = relatedJobs.length > 0 ? payment.amount / relatedJobs.length : 0;
      for (const jobId of relatedJobs) {
        const current = revenueByJobId.get(jobId) || 0;
        revenueByJobId.set(jobId, current + perJobRevenue);
      }
    }

    // Build costs map by jobId
    const costsByJobId = new Map<
      string,
      { labor: number; supplies: number; travel: number; overhead: number }
    >();

    for (const timesheet of timesheets) {
      if (!timesheet.jobId || !timesheet.hoursWorked) continue;

      const rate = timesheet.cleaner.hourlyRate || 25;
      const laborCost = timesheet.hoursWorked * rate;
      const overheadCost = laborCost * 0.15;

      const existing = costsByJobId.get(timesheet.jobId) || {
        labor: 0,
        supplies: 0,
        travel: 0,
        overhead: 0,
      };

      costsByJobId.set(timesheet.jobId, {
        labor: existing.labor + laborCost,
        supplies: existing.supplies,
        travel: existing.travel,
        overhead: existing.overhead + overheadCost,
      });
    }

    for (const cost of jobCosts) {
      const existing = costsByJobId.get(cost.jobId) || {
        labor: 0,
        supplies: 0,
        travel: 0,
        overhead: 0,
      };

      if (cost.category === "supplies") {
        existing.supplies += cost.amount;
      } else if (cost.category === "travel") {
        existing.travel += cost.amount;
      }

      costsByJobId.set(cost.jobId, existing);
    }

    // Aggregate by group
    const groupedData = new Map<
      string,
      {
        revenue: number;
        costs: number;
        jobCount: number;
      }
    >();

    for (const job of jobs) {
      const revenue = revenueByJobId.get(job.id) || 0;
      const costs = costsByJobId.get(job.id) || {
        labor: 0,
        supplies: 0,
        travel: 0,
        overhead: 0,
      };
      const totalCosts =
        costs.labor + costs.supplies + costs.travel + costs.overhead;

      let groupKey: string;

      if (groupByParam === "month") {
        const jobDate = job.scheduledStart || job.createdAt;
        groupKey = format(jobDate, "yyyy-MM");
      } else if (groupByParam === "week") {
        const jobDate = job.scheduledStart || job.createdAt;
        const weekStart = startOfWeek(jobDate, { weekStartsOn: 0 });
        groupKey = format(weekStart, "yyyy-MM-dd");
      } else {
        // serviceType
        groupKey = job.request.serviceType;
      }

      const existing = groupedData.get(groupKey) || {
        revenue: 0,
        costs: 0,
        jobCount: 0,
      };

      groupedData.set(groupKey, {
        revenue: existing.revenue + revenue,
        costs: existing.costs + totalCosts,
        jobCount: existing.jobCount + 1,
      });
    }

    // Calculate totals
    let totalRevenue = 0;
    let totalCosts = 0;
    let totalProfit = 0;
    let totalMargin = 0;

    const byGroup: GroupedProfitability[] = [];

    for (const [label, data] of groupedData) {
      const profit = data.revenue - data.costs;
      const margin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;

      byGroup.push({
        label,
        revenue: parseFloat(data.revenue.toFixed(2)),
        costs: parseFloat(data.costs.toFixed(2)),
        profit: parseFloat(profit.toFixed(2)),
        margin: parseFloat(margin.toFixed(2)),
        jobs: data.jobCount,
      });

      totalRevenue += data.revenue;
      totalCosts += data.costs;
      totalProfit += profit;
    }

    // Calculate average margin
    const avgMargin =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Sort by label (date/serviceType)
    byGroup.sort((a, b) => a.label.localeCompare(b.label));

    const response: ProfitabilityResponse = {
      summary: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalCosts: parseFloat(totalCosts.toFixed(2)),
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        avgMargin: parseFloat(avgMargin.toFixed(2)),
        jobCount: jobs.length,
      },
      byGroup: byGroup,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching profitability report:", error);
    return NextResponse.json(
      { error: "Failed to fetch profitability report" },
      { status: 500 }
    );
  }
}
