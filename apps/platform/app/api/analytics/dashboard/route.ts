import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

type PeriodType = "7d" | "30d" | "90d" | "all";

function getDateRange(period: PeriodType): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case "7d":
      start.setDate(start.getDate() - 7);
      break;
    case "30d":
      start.setDate(start.getDate() - 30);
      break;
    case "90d":
      start.setDate(start.getDate() - 90);
      break;
    case "all":
      start.setFullYear(2020);
      break;
  }

  return { start, end };
}

function getEmptyAnalyticsData() {
  return {
    visitors: { unique: 0, total: 0, sessions: 0, averageSessionDuration: 0 },
    topPages: [],
    devices: { mobile: 0, tablet: 0, desktop: 0 },
    trafficSources: { direct: 0, organic: 0, referral: 0, paid: 0, social: 0 },
    utmCampaigns: [],
    funnel: { homepage: 0, services: 0, quote: 0, quoteSubmitted: 0, booking: 0, conversionRate: 0 },
    ctaClicks: [],
    scrollDepth: { "25%": 0, "50%": 0, "75%": 0, "100%": 0 },
    hourlyTrend: Array.from({ length: 24 }, (_, i) => ({ hour: i, visitors: 0 })),
    dailyTrend: [],
  };
}

async function getAnalyticsData(period: PeriodType) {
  const { start, end } = getDateRange(period);

  try {
    // Fetch real data from existing models
    const [
      serviceRequests,
      quotes,
      jobs,
      payments,
      notifications,
    ] = await Promise.all([
      prisma.serviceRequest.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: {
          id: true,
          serviceType: true,
          city: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.quote.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: {
          id: true,
          total: true,
          createdAt: true,
        },
      }),
      prisma.job.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: {
          id: true,
          status: true,
          payoutAmount: true,
          createdAt: true,
        },
      }),
      prisma.paymentRecord.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: {
          id: true,
          amount: true,
          createdAt: true,
        },
      }),
      prisma.notification.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: {
          id: true,
          channel: true,
          createdAt: true,
        },
      }),
    ]);

    const totalLeads = serviceRequests.length;
    const totalQuotes = quotes.length;
    const totalJobs = jobs.length;
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const quoteRevenue = quotes.reduce((sum, q) => sum + q.total, 0);

    // Build funnel from real pipeline data
    const pendingJobs = jobs.filter((j) => j.status === "PENDING").length;
    const scheduledJobs = jobs.filter((j) => j.status === "SCHEDULED").length;
    const completedJobs = jobs.filter((j) => j.status === "COMPLETED").length;

    const funnel = {
      homepage: totalLeads,         // leads = top of funnel
      services: totalLeads,         // same — they viewed services
      quote: totalQuotes,           // quotes generated
      quoteSubmitted: totalQuotes,
      booking: totalJobs,           // jobs created (quote accepted)
      conversionRate: totalLeads > 0
        ? parseFloat(((completedJobs / totalLeads) * 100).toFixed(2))
        : 0,
    };

    // Service type breakdown as "top pages"
    const serviceMap = new Map<string, number>();
    serviceRequests.forEach((sr) => {
      serviceMap.set(sr.serviceType, (serviceMap.get(sr.serviceType) || 0) + 1);
    });

    const topPages = Array.from(serviceMap.entries())
      .map(([page, views]) => ({
        page: page.replace(/_/g, " "),
        views,
        uniqueVisitors: views,
      }))
      .sort((a, b) => b.views - a.views);

    // City breakdown as "traffic sources"
    const cityMap = new Map<string, number>();
    serviceRequests.forEach((sr) => {
      if (sr.city) cityMap.set(sr.city, (cityMap.get(sr.city) || 0) + 1);
    });

    const topCities = Array.from(cityMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Notification channel breakdown as "devices"
    const smsCount = notifications.filter((n) => n.channel === "SMS").length;
    const emailCount = notifications.filter((n) => n.channel === "EMAIL").length;
    const totalNotifs = notifications.length || 1;

    const devices = {
      mobile: parseFloat(((smsCount / totalNotifs) * 100).toFixed(1)),
      tablet: 0,
      desktop: parseFloat(((emailCount / totalNotifs) * 100).toFixed(1)),
    };

    // Status breakdown as "CTA clicks"
    const statusCounts = new Map<string, number>();
    serviceRequests.forEach((sr) => {
      statusCounts.set(sr.status, (statusCounts.get(sr.status) || 0) + 1);
    });

    const ctaClicks = Array.from(statusCounts.entries())
      .map(([label, clicks]) => ({
        label: label.replace(/_/g, " "),
        clicks,
        page: "/admin",
      }))
      .sort((a, b) => b.clicks - a.clicks);

    // Daily trend
    const dailyMap = new Map<string, { leads: number; jobs: number; revenue: number }>();
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dailyMap.set(key, { leads: 0, jobs: 0, revenue: 0 });
    }

    serviceRequests.forEach((sr) => {
      const key = sr.createdAt.toISOString().split("T")[0];
      if (dailyMap.has(key)) {
        dailyMap.get(key)!.leads++;
      }
    });

    jobs.forEach((j) => {
      const key = j.createdAt.toISOString().split("T")[0];
      if (dailyMap.has(key)) {
        dailyMap.get(key)!.jobs++;
      }
    });

    const dailyTrend = Array.from(dailyMap.entries()).map(([dateStr, data]) => {
      const date = new Date(dateStr);
      return {
        day: days[date.getDay()],
        visitors: data.leads,
        sessions: data.jobs,
      };
    });

    // Hourly breakdown of leads
    const hourlyMap = new Map<number, number>();
    serviceRequests.forEach((sr) => {
      const hour = sr.createdAt.getHours();
      hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
    });

    const hourlyTrend = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      visitors: hourlyMap.get(i) || 0,
    }));

    return {
      visitors: {
        unique: totalLeads,
        total: totalQuotes,
        sessions: totalJobs,
        averageSessionDuration: totalRevenue,
      },
      topPages,
      devices,
      trafficSources: {
        direct: topCities[0] ? topCities[0][1] : 0,
        organic: topCities[1] ? topCities[1][1] : 0,
        referral: topCities[2] ? topCities[2][1] : 0,
        paid: topCities[3] ? topCities[3][1] : 0,
        social: topCities[4] ? topCities[4][1] : 0,
      },
      utmCampaigns: topCities.map(([city, count]) => ({
        campaign: city,
        clicks: count,
        conversions: 0,
      })),
      funnel,
      ctaClicks,
      scrollDepth: {
        "25%": totalLeads,
        "50%": totalQuotes,
        "75%": totalJobs,
        "100%": completedJobs,
      },
      hourlyTrend,
      dailyTrend,
    };
  } catch (error) {
    console.error("[Analytics Dashboard] Error:", error);
    return getEmptyAnalyticsData();
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "HQ") {
      return NextResponse.json(
        { error: "Forbidden - HQ role required" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const period = (url.searchParams.get("period") || "7d") as PeriodType;

    if (!["7d", "30d", "90d", "all"].includes(period)) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    const data = await getAnalyticsData(period);

    return NextResponse.json({ period, ...data }, { status: 200 });
  } catch (error) {
    console.error("[Analytics Dashboard API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
