import { prisma } from "@/lib/prisma";
import { calculateTaxWithholding, type FilingStatus } from "./tax-withholding";

export type PayPeriod = {
  start: Date;
  end: Date;
  label: string;
};

/**
 * Get the current pay period (semi-monthly: 1st–15th, 16th–end).
 */
export function getCurrentPayPeriod(): PayPeriod {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (now.getDate() <= 15) {
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month, 15, 23, 59, 59, 999),
      label: `${new Date(year, month, 1).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(year, month, 15).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    };
  }

  // Last day of current month
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    start: new Date(year, month, 16),
    end: new Date(year, month, lastDay, 23, 59, 59, 999),
    label: `${new Date(year, month, 16).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(year, month, lastDay).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
  };
}

/**
 * Get a specific pay period for a given date range.
 */
export function getPayPeriod(start: Date, end: Date): PayPeriod {
  return {
    start,
    end,
    label: `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
  };
}

export type PayrollSummary = {
  cleanerId: string;
  cleanerName: string;
  hourlyRate: number;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  overtimePay: number;
  grossPay: number;
  // Tax withholding (W-2 only)
  federalWithholding: number;
  socialSecurity: number;
  medicare: number;
  totalTaxWithholding: number;
  taxClassification: "W2" | "1099";
  deductions: number;
  reimbursements: number;
  bonuses: number;
  netPay: number;
  timesheets: {
    id: string;
    date: string;
    clockIn: string;
    clockOut: string | null;
    hoursWorked: number | null;
    source: string;
    notes: string | null;
    approved: boolean;
  }[];
  adjustments: {
    id: string;
    type: string;
    amount: number;
    description: string;
  }[];
  period: {
    start: string;
    end: string;
    label: string;
  };
};

/**
 * Calculate payroll for a single cleaner within a date range.
 */
/**
 * Get the ISO week number (Mon-Sun) for a date.
 */
function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${weekNum}`;
}

/**
 * Calculate overtime by grouping timesheets into ISO weeks.
 * FLSA: 1.5x rate for hours > 40/week.
 */
function calculateOvertimeHours(
  timesheets: { date: Date; hoursWorked: number | null }[]
): { regularHours: number; overtimeHours: number } {
  // Group by ISO week
  const weeklyHours = new Map<string, number>();
  for (const ts of timesheets) {
    const week = getISOWeek(ts.date);
    weeklyHours.set(week, (weeklyHours.get(week) ?? 0) + (ts.hoursWorked ?? 0));
  }

  let regularHours = 0;
  let overtimeHours = 0;
  for (const hours of weeklyHours.values()) {
    if (hours > 40) {
      regularHours += 40;
      overtimeHours += hours - 40;
    } else {
      regularHours += hours;
    }
  }

  return {
    regularHours: Math.round(regularHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
  };
}

export async function calculatePayroll(
  cleanerId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<PayrollSummary | null> {
  const cleaner = await prisma.cleanerProfile.findUnique({
    where: { id: cleanerId },
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
  });

  if (!cleaner) return null;

  // Only count approved timesheets toward payroll
  const timesheets = await prisma.timesheet.findMany({
    where: {
      cleanerId,
      date: { gte: periodStart, lte: periodEnd },
      approved: true,
    },
    orderBy: { date: "asc" },
  });

  const adjustments = await prisma.payrollAdjustment.findMany({
    where: {
      cleanerId,
      payPeriodStart: { gte: periodStart },
      payPeriodEnd: { lte: periodEnd },
    },
    orderBy: { createdAt: "asc" },
  });

  // Overtime calculation (FLSA: 1.5x after 40 hrs/week)
  const { regularHours, overtimeHours } = calculateOvertimeHours(timesheets);
  const totalHours = Math.round((regularHours + overtimeHours) * 100) / 100;

  const regularPay = Math.round(regularHours * cleaner.hourlyRate * 100) / 100;
  const overtimePay = Math.round(overtimeHours * cleaner.hourlyRate * 1.5 * 100) / 100;
  const grossPay = Math.round((regularPay + overtimePay) * 100) / 100;

  // Tax withholding
  const taxClassification = (cleaner as any).taxClassification === "W2" ? "W2" as const : "1099" as const;

  // Get YTD gross for Social Security wage base calculation
  let ytdGross = 0;
  if (taxClassification === "W2") {
    const yearStart = new Date(periodStart.getFullYear(), 0, 1);
    const priorPaystubs = await prisma.paystub.findMany({
      where: {
        cleanerId,
        periodStart: { gte: yearStart },
        periodEnd: { lt: periodStart },
        status: "finalized",
      },
      select: { grossPay: true },
    });
    ytdGross = priorPaystubs.reduce((sum, p) => sum + p.grossPay, 0);
  }

  const taxResult = calculateTaxWithholding({
    grossPay,
    taxClassification,
    filingStatus: ((cleaner as any).federalFilingStatus as FilingStatus) ?? "single",
    allowances: (cleaner as any).federalAllowances ?? 0,
    ytdGross,
    payFrequency: "semimonthly",
  });

  const deductions = adjustments
    .filter((a) => a.type === "deduction")
    .reduce((sum, a) => sum + a.amount, 0);

  const reimbursements = adjustments
    .filter((a) => a.type === "reimbursement")
    .reduce((sum, a) => sum + a.amount, 0);

  const bonuses = adjustments
    .filter((a) => a.type === "bonus")
    .reduce((sum, a) => sum + a.amount, 0);

  const netPay = Math.round((grossPay - taxResult.totalTaxWithholding - deductions + reimbursements + bonuses) * 100) / 100;

  const period = getPayPeriod(periodStart, periodEnd);

  return {
    cleanerId: cleaner.id,
    cleanerName: `${cleaner.user.firstName} ${cleaner.user.lastName}`,
    hourlyRate: cleaner.hourlyRate,
    totalHours,
    regularHours,
    overtimeHours,
    overtimePay,
    grossPay,
    federalWithholding: taxResult.federalWithholding,
    socialSecurity: taxResult.socialSecurity,
    medicare: taxResult.medicare,
    totalTaxWithholding: taxResult.totalTaxWithholding,
    taxClassification: taxResult.taxClassification,
    deductions,
    reimbursements,
    bonuses,
    netPay,
    timesheets: timesheets.map((t) => ({
      id: t.id,
      date: t.date.toISOString(),
      clockIn: t.clockIn.toISOString(),
      clockOut: t.clockOut?.toISOString() ?? null,
      hoursWorked: t.hoursWorked,
      source: t.source,
      notes: t.notes,
      approved: t.approved,
    })),
    adjustments: adjustments.map((a) => ({
      id: a.id,
      type: a.type,
      amount: a.amount,
      description: a.description,
    })),
    period: {
      start: periodStart.toISOString(),
      end: periodEnd.toISOString(),
      label: period.label,
    },
  };
}

/**
 * Calculate payroll for ALL cleaners in a tenant within a date range.
 */
export async function calculateTeamPayroll(
  tenantId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<PayrollSummary[]> {
  const cleaners = await prisma.cleanerProfile.findMany({
    where: { user: { tenantId }, active: true },
    select: { id: true },
  });

  const results: PayrollSummary[] = [];
  for (const c of cleaners) {
    const payroll = await calculatePayroll(c.id, periodStart, periodEnd);
    if (payroll) results.push(payroll);
  }

  return results;
}
