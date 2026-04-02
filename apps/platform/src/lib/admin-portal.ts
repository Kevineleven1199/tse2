import { prisma } from "@/lib/prisma";

export type RevenueMetrics = {
  today: number;
  yesterday: number;
  thisWeek: number;
  lastWeek: number;
  thisMonth: number;
  lastMonth: number;
  thisYear: number;
  mtdGrowth: number | null;
  yoyGrowth: number | null;
};

export type ExpenseBreakdown = {
  laborCosts: number;
  supplies: number;
  marketing: number;
  software: number;
  insurance: number;
  other: number;
  total: number;
};

export type ProfitLossData = {
  revenue: RevenueMetrics;
  expenses: ExpenseBreakdown;
  grossProfit: number;
  grossMargin: number | null;
  netProfit: number;
  netMargin: number | null;
  projectedMonthEnd: number | null;
  projectedYearEnd: number | null;
};

export type OperationalMetrics = {
  totalJobsToday: number;
  completedJobsToday: number;
  pendingJobs: number;
  cancelledThisWeek: number;
  rescheduleRate: number | null;
  totalCustomers: number;
  newCustomersThisMonth: number;
  churnRate: number | null;
  avgCustomerLifetimeValue: number | null;
  npsScore: number | null;
  activeCleaners: number;
  avgCleanerRating: number;
  avgJobsPerCleaner: number;
  cleanerUtilization: number | null;
};

export type PipelineItem = {
  id: string;
  customerName: string;
  service: string;
  status: string;
  scheduledDate: Date | null;
  assignedCleaner: string | null;
  amount: number;
  city: string;
  isUrgent: boolean;
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  status: "active" | "inactive" | "pending";
  rating: number | null;
  completedJobs: number;
  earnings: number;
  joinedAt: Date;
};

export type AlertItem = {
  id: string;
  type: "warning" | "error" | "info" | "success";
  title: string;
  message: string;
  actionUrl?: string;
  createdAt: Date;
};

export type ActivityItem = {
  id: string;
  type: "booking" | "payment" | "review" | "cancellation" | "team";
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
};

export type AdminDashboardData = {
  operational: OperationalMetrics;
  pipeline: PipelineItem[];
  team: TeamMember[];
  alerts: AlertItem[];
  recentActivity: ActivityItem[];
  financials: ProfitLossData | null;
  warnings: string[];
};

export type ManagerDashboardData = {
  operational: OperationalMetrics;
  pipeline: PipelineItem[];
  team: TeamMember[];
  alerts: AlertItem[];
  recentActivity: ActivityItem[];
  revenueSnapshot: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  warnings: string[];
};

const createEmptyFinancials = (): ProfitLossData => ({
  revenue: {
    today: 0,
    yesterday: 0,
    thisWeek: 0,
    lastWeek: 0,
    thisMonth: 0,
    lastMonth: 0,
    thisYear: 0,
    mtdGrowth: null,
    yoyGrowth: null,
  },
  expenses: {
    laborCosts: 0,
    supplies: 0,
    marketing: 0,
    software: 0,
    insurance: 0,
    other: 0,
    total: 0,
  },
  grossProfit: 0,
  grossMargin: null,
  netProfit: 0,
  netMargin: null,
  projectedMonthEnd: null,
  projectedYearEnd: null,
});

const createEmptyOperational = (): OperationalMetrics => ({
  totalJobsToday: 0,
  completedJobsToday: 0,
  pendingJobs: 0,
  cancelledThisWeek: 0,
  rescheduleRate: null,
  totalCustomers: 0,
  newCustomersThisMonth: 0,
  churnRate: null,
  avgCustomerLifetimeValue: null,
  npsScore: null,
  activeCleaners: 0,
  avgCleanerRating: 0,
  avgJobsPerCleaner: 0,
  cleanerUtilization: null,
});

const createWarning = (label: string, reason?: unknown) =>
  reason instanceof Error
    ? `${label} unavailable: ${reason.message}`
    : `${label} unavailable`;

const round = (value: number, digits = 1) =>
  Number(value.toFixed(digits));

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfWeek = (date: Date) => {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const result = startOfDay(date);
  result.setDate(result.getDate() + diff);
  return result;
};

const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const startOfYear = (date: Date) =>
  new Date(date.getFullYear(), 0, 1);

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export async function getAdminDashboardData(tenantId: string): Promise<AdminDashboardData> {
  const results = await Promise.allSettled([
    fetchOperationalMetrics(tenantId),
    fetchPipeline(tenantId),
    fetchTeamMembers(tenantId),
    fetchAlerts(tenantId),
    fetchRecentActivity(tenantId),
    fetchFinancials(tenantId),
  ]);

  const [
    operationalResult,
    pipelineResult,
    teamResult,
    alertsResult,
    activityResult,
    financialsResult,
  ] = results;

  const warnings = results.flatMap((result, index) => {
    if (result.status === "fulfilled") return [];
    const labels = [
      "Operational metrics",
      "Pipeline",
      "Team overview",
      "Alerts",
      "Recent activity",
      "Financial reporting",
    ];
    return [createWarning(labels[index], result.reason)];
  });

  return {
    operational: operationalResult.status === "fulfilled" ? operationalResult.value : createEmptyOperational(),
    pipeline: pipelineResult.status === "fulfilled" ? pipelineResult.value : [],
    team: teamResult.status === "fulfilled" ? teamResult.value : [],
    alerts: alertsResult.status === "fulfilled" ? alertsResult.value : [],
    recentActivity: activityResult.status === "fulfilled" ? activityResult.value : [],
    financials: financialsResult.status === "fulfilled" ? financialsResult.value : null,
    warnings,
  };
}

export async function getManagerDashboardData(tenantId: string): Promise<ManagerDashboardData> {
  const results = await Promise.allSettled([
    fetchOperationalMetrics(tenantId),
    fetchPipeline(tenantId),
    fetchTeamMembers(tenantId),
    fetchAlerts(tenantId),
    fetchRecentActivity(tenantId),
    fetchFinancials(tenantId),
  ]);

  const [
    operationalResult,
    pipelineResult,
    teamResult,
    alertsResult,
    activityResult,
    financialsResult,
  ] = results;

  const financials = financialsResult.status === "fulfilled"
    ? financialsResult.value
    : createEmptyFinancials();

  const warnings = results.flatMap((result, index) => {
    if (result.status === "fulfilled") return [];
    const labels = [
      "Operational metrics",
      "Pipeline",
      "Team overview",
      "Alerts",
      "Recent activity",
      "Revenue snapshot",
    ];
    return [createWarning(labels[index], result.reason)];
  });

  return {
    operational: operationalResult.status === "fulfilled" ? operationalResult.value : createEmptyOperational(),
    pipeline: pipelineResult.status === "fulfilled" ? pipelineResult.value : [],
    team: teamResult.status === "fulfilled" ? teamResult.value : [],
    alerts: alertsResult.status === "fulfilled" ? alertsResult.value : [],
    recentActivity: activityResult.status === "fulfilled" ? activityResult.value : [],
    revenueSnapshot: {
      today: financials.revenue.today,
      thisWeek: financials.revenue.thisWeek,
      thisMonth: financials.revenue.thisMonth,
    },
    warnings,
  };
}

async function fetchOperationalMetrics(tenantId: string): Promise<OperationalMetrics> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 7);
  const monthStart = startOfMonth(now);
  const ninetyDaysAgo = addDays(todayStart, -90);
  const oneEightyDaysAgo = addDays(todayStart, -180);

  const [
    totalJobsToday,
    completedJobsToday,
    pendingJobs,
    cancelledThisWeek,
    scheduledRequestCount,
    rescheduledRequestCount,
    cleanerStats,
    customerHistory,
    scheduledJobs,
  ] = await Promise.all([
    prisma.job.count({
      where: {
        tenantId,
        scheduledStart: { gte: todayStart, lt: addDays(todayStart, 1) },
      },
    }),
    prisma.job.count({
      where: {
        tenantId,
        status: "COMPLETED",
        updatedAt: { gte: todayStart },
      },
    }),
    prisma.job.count({
      where: {
        tenantId,
        status: { in: ["PENDING", "CLAIMED"] },
      },
    }),
    prisma.job.count({
      where: {
        tenantId,
        status: "CANCELED",
        updatedAt: { gte: weekStart },
      },
    }),
    prisma.serviceRequest.count({
      where: {
        tenantId,
        schedulingOptions: { some: {} },
      },
    }),
    prisma.serviceRequest.count({
      where: {
        tenantId,
        schedulingOptions: { some: { status: "DECLINED" } },
      },
    }),
    prisma.cleanerProfile.findMany({
      where: {
        user: { tenantId },
        active: true,
      },
      select: {
        id: true,
        rating: true,
        completedJobs: true,
      },
    }),
    prisma.serviceRequest.findMany({
      where: {
        tenantId,
        createdAt: { gte: oneEightyDaysAgo },
      },
      select: {
        customerEmail: true,
        createdAt: true,
        payments: {
          where: { status: "CAPTURED" },
          select: { amount: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.job.findMany({
      where: {
        tenantId,
        scheduledStart: { gte: weekStart, lt: weekEnd },
        scheduledEnd: { not: null },
        assignments: { some: {} },
      },
      select: {
        scheduledStart: true,
        scheduledEnd: true,
        crewSize: true,
        assignments: { select: { id: true } },
      },
    }),
  ]);

  const customerMap = new Map<string, { firstSeen: Date; revenue: number; activeRecent: boolean; activePrevious: boolean }>();
  for (const request of customerHistory) {
    const email = request.customerEmail.trim().toLowerCase();
    if (!email) continue;
    const existing = customerMap.get(email);
    const revenue = sum(request.payments.map((payment) => payment.amount));
    const activity = existing ?? {
      firstSeen: request.createdAt,
      revenue: 0,
      activeRecent: false,
      activePrevious: false,
    };

    if (request.createdAt < activity.firstSeen) {
      activity.firstSeen = request.createdAt;
    }
    activity.revenue += revenue;
    if (request.createdAt >= ninetyDaysAgo) {
      activity.activeRecent = true;
    }
    if (request.createdAt >= oneEightyDaysAgo && request.createdAt < ninetyDaysAgo) {
      activity.activePrevious = true;
    }
    customerMap.set(email, activity);
  }

  const customers = Array.from(customerMap.values());
  const totalCustomers = customers.length;
  const newCustomersThisMonth = customers.filter((customer) => customer.firstSeen >= monthStart).length;
  const previousActiveCustomers = customers.filter((customer) => customer.activePrevious).length;
  const churnedCustomers = customers.filter((customer) => customer.activePrevious && !customer.activeRecent).length;
  const churnRate = previousActiveCustomers > 0 ? round((churnedCustomers / previousActiveCustomers) * 100) : null;
  const avgCustomerLifetimeValue = customers.length > 0
    ? round(sum(customers.map((customer) => customer.revenue)) / customers.length, 2)
    : null;

  const activeCleaners = cleanerStats.length;
  const avgCleanerRating = activeCleaners > 0
    ? round(sum(cleanerStats.map((cleaner) => cleaner.rating ?? 0)) / activeCleaners)
    : 0;
  const avgJobsPerCleaner = activeCleaners > 0
    ? round(sum(cleanerStats.map((cleaner) => cleaner.completedJobs ?? 0)) / activeCleaners)
    : 0;

  const scheduledHours = scheduledJobs.reduce((total, job) => {
    if (!job.scheduledStart || !job.scheduledEnd) return total;
    const hours = Math.max(0, job.scheduledEnd.getTime() - job.scheduledStart.getTime()) / 3600000;
    const assignedCleaners = Math.max(job.assignments.length, job.crewSize || 1);
    return total + hours * assignedCleaners;
  }, 0);
  const weeklyCapacity = activeCleaners > 0 ? activeCleaners * 40 : 0;
  const cleanerUtilization = weeklyCapacity > 0 ? round((scheduledHours / weeklyCapacity) * 100) : null;

  return {
    totalJobsToday,
    completedJobsToday,
    pendingJobs,
    cancelledThisWeek,
    rescheduleRate: scheduledRequestCount > 0 ? round((rescheduledRequestCount / scheduledRequestCount) * 100) : null,
    totalCustomers,
    newCustomersThisMonth,
    churnRate,
    avgCustomerLifetimeValue,
    npsScore: null,
    activeCleaners,
    avgCleanerRating,
    avgJobsPerCleaner,
    cleanerUtilization,
  };
}

async function fetchPipeline(tenantId: string): Promise<PipelineItem[]> {
  const jobs = await prisma.job.findMany({
    where: {
      tenantId,
      status: { not: "COMPLETED" },
    },
    include: {
      request: {
        include: {
          quote: true,
        },
      },
      assignments: {
        include: {
          cleaner: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const statusMap: Record<string, string> = {
    PENDING: "PENDING_ASSIGNMENT",
    CLAIMED: "ASSIGNED",
    SCHEDULED: "SCHEDULED",
    COMPLETED: "COMPLETED",
    CANCELED: "CANCELED",
  };

  return jobs.map((job) => ({
    id: job.id,
    customerName: job.request?.customerName ?? "Unknown",
    service: job.request?.serviceType?.replace("_", " ") ?? "Unknown",
    status: statusMap[job.status] || job.status,
    scheduledDate: job.scheduledStart,
    assignedCleaner: job.assignments[0]
      ? `${job.assignments[0].cleaner.user.firstName} ${job.assignments[0].cleaner.user.lastName}`.trim()
      : null,
    amount: job.request?.quote?.total ?? 0,
    city: job.request?.city ?? "Unknown",
    isUrgent: job.status === "PENDING" && job.request?.preferredStart
      ? new Date(job.request.preferredStart).getTime() - Date.now() < 86400000
      : false,
  }));
}

async function fetchTeamMembers(tenantId: string): Promise<TeamMember[]> {
  const users = await prisma.user.findMany({
    where: {
      tenantId,
      role: { in: ["CLEANER", "HQ"] },
    },
    include: {
      cleaner: {
        include: {
          payouts: {
            where: { status: "SENT" },
            select: { amount: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return users.map((user) => ({
    id: user.id,
    name: `${user.firstName} ${user.lastName}`.trim(),
    role: user.role === "HQ" ? "Admin" : "Cleaner",
    status: user.status === "active" ? "active" : user.status === "pending" ? "pending" : "inactive",
    rating: user.cleaner?.rating ?? null,
    completedJobs: user.cleaner?.completedJobs ?? 0,
    earnings: user.cleaner?.payouts.reduce((total, payout) => total + payout.amount, 0) ?? 0,
    joinedAt: user.createdAt,
  }));
}

async function fetchAlerts(tenantId: string): Promise<AlertItem[]> {
  const alerts: AlertItem[] = [];

  const unassignedJobs = await prisma.job.findMany({
    where: {
      tenantId,
      status: "PENDING",
      request: {
        preferredStart: { lte: addDays(new Date(), 2) },
      },
    },
    include: { request: true },
    take: 5,
  });

  for (const job of unassignedJobs) {
    alerts.push({
      id: `unassigned-${job.id}`,
      type: "warning",
      title: "Unassigned Job",
      message: `${job.request.serviceType.replace("_", " ")} for ${job.request.customerName} needs assignment`,
      actionUrl: "/admin/pipeline",
      createdAt: job.createdAt,
    });
  }

  const pendingUsers = await prisma.user.count({
    where: { tenantId, status: "pending" },
  });

  if (pendingUsers > 0) {
    alerts.push({
      id: "pending-users",
      type: "info",
      title: "Pending Team Members",
      message: `${pendingUsers} team member(s) awaiting approval`,
      actionUrl: "/admin/team",
      createdAt: new Date(),
    });
  }

  const failedPayments = await prisma.paymentRecord.count({
    where: {
      request: { tenantId },
      status: "FAILED",
      createdAt: { gte: addDays(new Date(), -7) },
    },
  });

  if (failedPayments > 0) {
    alerts.push({
      id: "failed-payments",
      type: "error",
      title: "Failed Payments",
      message: `${failedPayments} payment(s) failed this week`,
      actionUrl: "/admin/billing",
      createdAt: new Date(),
    });
  }

  return alerts.slice(0, 5);
}

async function fetchRecentActivity(tenantId: string): Promise<ActivityItem[]> {
  const activities: ActivityItem[] = [];

  const recentJobs = await prisma.job.findMany({
    where: { tenantId },
    include: { request: true },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  for (const job of recentJobs) {
    if (job.status === "COMPLETED") {
      activities.push({
        id: `job-${job.id}`,
        type: "booking",
        description: `Job completed for ${job.request.customerName}`,
        timestamp: job.updatedAt,
      });
    } else if (job.status === "CLAIMED") {
      activities.push({
        id: `job-${job.id}`,
        type: "team",
        description: `Job claimed for ${job.request.customerName}`,
        timestamp: job.updatedAt,
      });
    }
  }

  const recentPayments = await prisma.paymentRecord.findMany({
    where: {
      request: { tenantId },
      status: "CAPTURED",
    },
    include: { request: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  for (const payment of recentPayments) {
    activities.push({
      id: `payment-${payment.id}`,
      type: "payment",
      description: `Payment received: $${payment.amount.toFixed(2)} from ${payment.request.customerName}`,
      timestamp: payment.createdAt,
    });
  }

  return activities
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 5);
}

async function fetchFinancials(tenantId: string): Promise<ProfitLossData> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);
  const yesterdayStart = addDays(todayStart, -1);
  const weekStart = startOfWeek(now);
  const lastWeekStart = addDays(weekStart, -7);
  const monthStart = startOfMonth(now);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const yearStart = startOfYear(now);
  const lastYearMonthStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const lastYearMonthToDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate() + 1);

  const [
    todayPayments,
    yesterdayPayments,
    weekPayments,
    lastWeekPayments,
    monthPayments,
    lastMonthPayments,
    yearPayments,
    sameMonthLastYearPayments,
    monthlyExpenses,
    monthlyPaystubs,
    monthPayouts,
  ] = await Promise.all([
    prisma.paymentRecord.aggregate({
      where: { request: { tenantId }, status: "CAPTURED", createdAt: { gte: todayStart, lt: tomorrowStart } },
      _sum: { amount: true },
    }),
    prisma.paymentRecord.aggregate({
      where: { request: { tenantId }, status: "CAPTURED", createdAt: { gte: yesterdayStart, lt: todayStart } },
      _sum: { amount: true },
    }),
    prisma.paymentRecord.aggregate({
      where: { request: { tenantId }, status: "CAPTURED", createdAt: { gte: weekStart } },
      _sum: { amount: true },
    }),
    prisma.paymentRecord.aggregate({
      where: { request: { tenantId }, status: "CAPTURED", createdAt: { gte: lastWeekStart, lt: weekStart } },
      _sum: { amount: true },
    }),
    prisma.paymentRecord.aggregate({
      where: { request: { tenantId }, status: "CAPTURED", createdAt: { gte: monthStart, lt: nextMonthStart } },
      _sum: { amount: true },
    }),
    prisma.paymentRecord.aggregate({
      where: { request: { tenantId }, status: "CAPTURED", createdAt: { gte: lastMonthStart, lt: monthStart } },
      _sum: { amount: true },
    }),
    prisma.paymentRecord.aggregate({
      where: { request: { tenantId }, status: "CAPTURED", createdAt: { gte: yearStart } },
      _sum: { amount: true },
    }),
    prisma.paymentRecord.aggregate({
      where: { request: { tenantId }, status: "CAPTURED", createdAt: { gte: lastYearMonthStart, lt: lastYearMonthToDate } },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: {
        tenantId,
        date: { gte: monthStart, lt: nextMonthStart },
      },
      _sum: { amount: true },
    }),
    prisma.paystub.findMany({
      where: {
        cleaner: { user: { tenantId } },
        periodEnd: { gte: monthStart, lt: nextMonthStart },
      },
      select: {
        grossPay: true,
        reimbursements: true,
        bonuses: true,
      },
    }),
    prisma.cleanerPayout.aggregate({
      where: {
        job: { tenantId },
        status: "SENT",
        createdAt: { gte: monthStart, lt: nextMonthStart },
      },
      _sum: { amount: true },
    }),
  ]);

  const today = todayPayments._sum.amount ?? 0;
  const yesterday = yesterdayPayments._sum.amount ?? 0;
  const thisWeek = weekPayments._sum.amount ?? 0;
  const lastWeek = lastWeekPayments._sum.amount ?? 0;
  const thisMonth = monthPayments._sum.amount ?? 0;
  const lastMonth = lastMonthPayments._sum.amount ?? 0;
  const thisYear = yearPayments._sum.amount ?? 0;
  const sameMonthLastYear = sameMonthLastYearPayments._sum.amount ?? 0;

  const expenseMap = new Map<string, number>();
  for (const expense of monthlyExpenses) {
    expenseMap.set(expense.category, expense._sum.amount ?? 0);
  }

  const paystubLabor = monthlyPaystubs.length > 0
    ? sum(monthlyPaystubs.map((paystub) => paystub.grossPay + paystub.reimbursements + paystub.bonuses))
    : 0;
  const laborCosts = paystubLabor > 0 ? paystubLabor : monthPayouts._sum.amount ?? 0;
  const supplies = expenseMap.get("supplies") ?? 0;
  const marketing = expenseMap.get("marketing") ?? 0;
  const software = expenseMap.get("software") ?? 0;
  const insurance = expenseMap.get("insurance") ?? 0;
  const other = sum(
    ["other", "fuel", "equipment"].map((category) => expenseMap.get(category) ?? 0)
  );
  const totalExpenses = laborCosts + supplies + marketing + software + insurance + other;
  const grossProfit = thisMonth - laborCosts;
  const netProfit = thisMonth - totalExpenses;

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const elapsedMonthDays = Math.max(1, now.getDate());
  const daysInYear = Math.round(
    (new Date(now.getFullYear() + 1, 0, 1).getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000
  );
  const elapsedYearDays = Math.max(
    1,
    Math.round((todayStart.getTime() - yearStart.getTime()) / 86400000) + 1
  );

  return {
    revenue: {
      today,
      yesterday,
      thisWeek,
      lastWeek,
      thisMonth,
      lastMonth,
      thisYear,
      mtdGrowth: lastMonth > 0 ? round(((thisMonth - lastMonth) / lastMonth) * 100) : null,
      yoyGrowth: sameMonthLastYear > 0 ? round(((thisMonth - sameMonthLastYear) / sameMonthLastYear) * 100) : null,
    },
    expenses: {
      laborCosts,
      supplies,
      marketing,
      software,
      insurance,
      other,
      total: totalExpenses,
    },
    grossProfit,
    grossMargin: thisMonth > 0 ? round((grossProfit / thisMonth) * 100) : null,
    netProfit,
    netMargin: thisMonth > 0 ? round((netProfit / thisMonth) * 100) : null,
    projectedMonthEnd: thisMonth > 0 ? round((thisMonth / elapsedMonthDays) * daysInMonth, 2) : null,
    projectedYearEnd: thisYear > 0 ? round((thisYear / elapsedYearDays) * daysInYear, 2) : null,
  };
}

export function canAccessFinancials(role: string): boolean {
  return role === "HQ";
}

export function canAccessTeamEarnings(role: string): boolean {
  return role === "HQ";
}

export function canManageTeam(role: string): boolean {
  return role === "HQ";
}

export function canAccessSettings(role: string): boolean {
  return role === "HQ";
}
