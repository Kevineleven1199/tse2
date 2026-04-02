import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  period: z.enum(["month", "quarter", "year", "custom"]).default("month"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

interface PeriodRange {
  start: Date;
  end: Date;
  label: string;
}

interface MonthlySummary {
  month: string;
  revenue: number;
  expenses: number;
  netIncome: number;
}

interface ExpenseCategory {
  category: string;
  amount: number;
  percentage: number;
}

interface PnLReport {
  period: {
    start: string;
    end: string;
    label: string;
  };
  revenue: {
    jobRevenue: number;
    totalRevenue: number;
  };
  costOfServices: {
    labor: number;
    supplies: number;
    fuel: number;
    equipment: number;
    totalCOS: number;
  };
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: {
    marketing: number;
    software: number;
    insurance: number;
    other: number;
    totalOpEx: number;
  };
  operatingIncome: number;
  operatingMargin: number;
  netIncome: number;
  netMargin: number;
  comparison: {
    prevRevenue: number;
    prevNetIncome: number;
    revenueChange: number;
    netIncomeChange: number;
  };
  monthlyTrend: MonthlySummary[];
  topExpenseCategories: ExpenseCategory[];
}

/**
 * Calculate period date range based on period type
 */
function calculatePeriodRange(
  period: string,
  startDate?: string,
  endDate?: string
): PeriodRange {
  const now = new Date();
  let start: Date;
  let end: Date;
  let label: string;

  if (period === "custom") {
    if (!startDate || !endDate) {
      // Fallback to current month if custom period is incomplete
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      label = start.toLocaleString("default", { month: "long", year: "numeric" });
    } else {
      start = new Date(startDate);
      end = new Date(endDate);
      label = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    }
  } else if (period === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    label = start.toLocaleString("default", { month: "long", year: "numeric" });
  } else if (period === "quarter") {
    const quarter = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), quarter * 3, 1);
    end = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
    label = `Q${quarter + 1} ${now.getFullYear()}`;
  } else if (period === "year") {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31);
    label = now.getFullYear().toString();
  } else {
    // Default to month
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    label = start.toLocaleString("default", { month: "long", year: "numeric" });
  }

  return { start, end, label };
}

/**
 * Get previous period for comparison
 */
function getPreviousPeriod(period: PeriodRange, periodType: string): PeriodRange {
  const start = new Date(period.start);
  const end = new Date(period.end);
  const durationMs = end.getTime() - start.getTime();

  start.setTime(start.getTime() - durationMs);
  end.setTime(end.getTime() - durationMs);

  return { start, end, label: "" };
}

/**
 * Calculate revenue from PaymentRecord (CAPTURED status only)
 */
async function calculateRevenue(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const payments = await prisma.paymentRecord.findMany({
    where: {
      request: {
        tenantId,
      },
      status: "CAPTURED",
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      amount: true,
    },
  });

  return payments.reduce((sum, payment) => sum + payment.amount, 0);
}

/**
 * Calculate labor costs from CleanerPayout (SENT status only)
 */
async function calculateLaborCosts(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const payouts = await prisma.cleanerPayout.findMany({
    where: {
      job: {
        tenantId,
      },
      status: "SENT",
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      amount: true,
    },
  });

  return payouts.reduce((sum, payout) => sum + payout.amount, 0);
}

/**
 * Calculate expenses by category
 */
async function calculateExpensesByCategory(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<Record<string, number>> {
  const expenses = await prisma.expense.findMany({
    where: {
      tenantId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      category: true,
      amount: true,
    },
  });

  const categoryTotals: Record<string, number> = {
    supplies: 0,
    fuel: 0,
    equipment: 0,
    marketing: 0,
    software: 0,
    insurance: 0,
    other: 0,
  };

  expenses.forEach((expense) => {
    if (expense.category in categoryTotals) {
      categoryTotals[expense.category] += expense.amount;
    }
  });

  return categoryTotals;
}

/**
 * Get monthly trend data for last 6 months
 */
async function getMonthlyTrend(tenantId: string): Promise<MonthlySummary[]> {
  const trend: MonthlySummary[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    const revenue = await calculateRevenue(tenantId, monthStart, monthEnd);
    const laborCosts = await calculateLaborCosts(tenantId, monthStart, monthEnd);
    const expensesByCategory = await calculateExpensesByCategory(
      tenantId,
      monthStart,
      monthEnd
    );

    const totalExpenses =
      laborCosts +
      Object.values(expensesByCategory).reduce((sum, val) => sum + val, 0);
    const netIncome = revenue - totalExpenses;

    trend.push({
      month: monthStart.toLocaleString("default", {
        month: "short",
        year: "numeric",
      }),
      revenue,
      expenses: totalExpenses,
      netIncome,
    });
  }

  return trend;
}

/**
 * Main GET handler for P&L report
 */
export const GET = async (request: NextRequest) => {
  try {
    const session = await requireSession();

    if (!["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json(
        { error: "Forbidden - HQ or MANAGER access required" },
        { status: 403 }
      );
    }

    const viewer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { tenantId: true },
    });

    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = viewer.tenantId;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      period: searchParams.get("period") ?? undefined,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400 }
      );
    }

    const { period, startDate, endDate } = parsed.data;

    // Calculate current period
    const currentPeriod = calculatePeriodRange(period, startDate, endDate);
    const previousPeriod = getPreviousPeriod(currentPeriod, period);

    // Calculate revenue
    const jobRevenue = await calculateRevenue(
      tenantId,
      currentPeriod.start,
      currentPeriod.end
    );

    // Calculate cost of services
    const laborCosts = await calculateLaborCosts(
      tenantId,
      currentPeriod.start,
      currentPeriod.end
    );

    const currentExpenses = await calculateExpensesByCategory(
      tenantId,
      currentPeriod.start,
      currentPeriod.end
    );

    const supplies = currentExpenses.supplies;
    const fuel = currentExpenses.fuel;
    const equipment = currentExpenses.equipment;

    const totalCOS = laborCosts + supplies + fuel + equipment;

    // Calculate gross profit
    const grossProfit = jobRevenue - totalCOS;
    const grossMargin = jobRevenue > 0 ? (grossProfit / jobRevenue) * 100 : 0;

    // Operating expenses
    const marketing = currentExpenses.marketing;
    const software = currentExpenses.software;
    const insurance = currentExpenses.insurance;
    const other = currentExpenses.other;
    const totalOpEx = marketing + software + insurance + other;

    // Operating income
    const operatingIncome = grossProfit - totalOpEx;
    const operatingMargin =
      jobRevenue > 0 ? (operatingIncome / jobRevenue) * 100 : 0;

    // Net income (for a P&L without taxes and other items, this is operating income)
    const netIncome = operatingIncome;
    const netMargin = jobRevenue > 0 ? (netIncome / jobRevenue) * 100 : 0;

    // Previous period calculations for comparison
    const prevRevenue = await calculateRevenue(
      tenantId,
      previousPeriod.start,
      previousPeriod.end
    );

    const prevLaborCosts = await calculateLaborCosts(
      tenantId,
      previousPeriod.start,
      previousPeriod.end
    );

    const prevExpenses = await calculateExpensesByCategory(
      tenantId,
      previousPeriod.start,
      previousPeriod.end
    );

    const prevTotalExpenses =
      prevLaborCosts +
      Object.values(prevExpenses).reduce((sum, val) => sum + val, 0);
    const prevNetIncome = prevRevenue - prevTotalExpenses;

    const revenueChange =
      prevRevenue > 0
        ? ((jobRevenue - prevRevenue) / prevRevenue) * 100
        : jobRevenue > 0
          ? 100
          : 0;

    const netIncomeChange =
      prevNetIncome !== 0
        ? ((netIncome - prevNetIncome) / Math.abs(prevNetIncome)) * 100
        : netIncome > 0
          ? 100
          : 0;

    // Get monthly trend
    const monthlyTrend = await getMonthlyTrend(tenantId);

    // Get top expense categories
    const allExpenseValues = [
      { category: "labor", amount: laborCosts },
      { category: "supplies", amount: supplies },
      { category: "fuel", amount: fuel },
      { category: "equipment", amount: equipment },
      { category: "marketing", amount: marketing },
      { category: "software", amount: software },
      { category: "insurance", amount: insurance },
      { category: "other", amount: other },
    ];

    const totalAllExpenses = allExpenseValues.reduce((sum, exp) => sum + exp.amount, 0);

    const topExpenseCategories = allExpenseValues
      .filter((exp) => exp.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((exp) => ({
        category: exp.category,
        amount: exp.amount,
        percentage:
          totalAllExpenses > 0 ? (exp.amount / totalAllExpenses) * 100 : 0,
      }));

    // Build response
    const report: PnLReport = {
      period: {
        start: currentPeriod.start.toISOString().split("T")[0],
        end: currentPeriod.end.toISOString().split("T")[0],
        label: currentPeriod.label,
      },
      revenue: {
        jobRevenue: Math.round(jobRevenue * 100) / 100,
        totalRevenue: Math.round(jobRevenue * 100) / 100,
      },
      costOfServices: {
        labor: Math.round(laborCosts * 100) / 100,
        supplies: Math.round(supplies * 100) / 100,
        fuel: Math.round(fuel * 100) / 100,
        equipment: Math.round(equipment * 100) / 100,
        totalCOS: Math.round(totalCOS * 100) / 100,
      },
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossMargin: Math.round(grossMargin * 100) / 100,
      operatingExpenses: {
        marketing: Math.round(marketing * 100) / 100,
        software: Math.round(software * 100) / 100,
        insurance: Math.round(insurance * 100) / 100,
        other: Math.round(other * 100) / 100,
        totalOpEx: Math.round(totalOpEx * 100) / 100,
      },
      operatingIncome: Math.round(operatingIncome * 100) / 100,
      operatingMargin: Math.round(operatingMargin * 100) / 100,
      netIncome: Math.round(netIncome * 100) / 100,
      netMargin: Math.round(netMargin * 100) / 100,
      comparison: {
        prevRevenue: Math.round(prevRevenue * 100) / 100,
        prevNetIncome: Math.round(prevNetIncome * 100) / 100,
        revenueChange: Math.round(revenueChange * 100) / 100,
        netIncomeChange: Math.round(netIncomeChange * 100) / 100,
      },
      monthlyTrend: monthlyTrend.map((m) => ({
        month: m.month,
        revenue: Math.round(m.revenue * 100) / 100,
        expenses: Math.round(m.expenses * 100) / 100,
        netIncome: Math.round(m.netIncome * 100) / 100,
      })),
      topExpenseCategories,
    };

    // Limited view for MANAGER role
    if (session.role === "MANAGER") {
      report.revenue.jobRevenue = Math.round(
        (report.revenue.jobRevenue * 0.8) * 100
      ) / 100; // Example: show 80% for limited view
      report.revenue.totalRevenue = Math.round(
        (report.revenue.totalRevenue * 0.8) * 100
      ) / 100;
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("[admin-pnl] Error fetching P&L report:", error);
    return NextResponse.json(
      { error: "Failed to fetch P&L report" },
      { status: 500 }
    );
  }
};
