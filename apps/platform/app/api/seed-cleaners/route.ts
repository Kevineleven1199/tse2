import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// Isabel's 2026 weekly timesheet data (residential deep cleans + regular recurring)
// [weekStart, hoursWorked, hourlyRate, grossPay, netPaid]
const ISABEL_PAYROLL = [
  // January 2026
  ["2026-01-05", 18.50, 22, 407.00, 407.00],   // Week 1 — ramp-up after holidays
  ["2026-01-12", 24.75, 22, 544.50, 544.50],   // Week 2
  ["2026-01-19", 28.00, 22, 616.00, 616.00],   // Week 3 — full schedule
  ["2026-01-26", 26.50, 22, 583.00, 583.00],   // Week 4
  // February 2026
  ["2026-02-02", 30.25, 22, 665.50, 665.50],   // Week 5 — busy season
  ["2026-02-09", 27.00, 22, 594.00, 594.00],   // Week 6
  ["2026-02-16", 32.50, 22, 715.00, 715.00],   // Week 7 — heavy week
  ["2026-02-23", 14.00, 22, 308.00, 308.00],   // Week 8 — current partial week
] as const;

// Martha's 2026 weekly timesheet data (commercial + move-out cleans)
const MARTHA_PAYROLL = [
  // January 2026
  ["2026-01-05", 22.00, 20, 440.00, 440.00],   // Week 1
  ["2026-01-12", 30.50, 20, 610.00, 610.00],   // Week 2 — commercial contracts
  ["2026-01-19", 34.00, 20, 680.00, 680.00],   // Week 3 — move-out clean + regular
  ["2026-01-26", 28.75, 20, 575.00, 575.00],   // Week 4
  // February 2026
  ["2026-02-02", 36.00, 20, 720.00, 720.00],   // Week 5 — 2 move-outs
  ["2026-02-09", 25.50, 20, 510.00, 510.00],   // Week 6
  ["2026-02-16", 31.25, 20, 625.00, 625.00],   // Week 7
  ["2026-02-23", 16.50, 20, 330.00, 330.00],   // Week 8 — current partial
] as const;

type CleanerSeed = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  hourlyRate: number;
  payroll: readonly (readonly [string, number, number, number, number])[];
};

const CLEANERS: CleanerSeed[] = [
  {
    firstName: "Isabel",
    lastName: "Garcia",
    email: "isabel@ggoc.us",
    phone: "+19418675309",
    hourlyRate: 22.0,
    payroll: ISABEL_PAYROLL,
  },
  {
    firstName: "Martha",
    lastName: "Rodriguez",
    email: "martha@ggoc.us",
    phone: "+19415551234",
    hourlyRate: 20.0,
    payroll: MARTHA_PAYROLL,
  },
];

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Seed routes disabled in production" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const expectedSecret = process.env.SEED_ROUTE_SECRET;
    if (!expectedSecret) {
      return NextResponse.json({ error: "SEED_ROUTE_SECRET not set" }, { status: 500 });
    }
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = process.env.DEFAULT_TENANT_ID;
    if (!tenantId) {
      return NextResponse.json({ error: "DEFAULT_TENANT_ID not set" }, { status: 500 });
    }

    const password = "TriState2026!";
    const passwordHash = await bcrypt.hash(password, 12);
    const avatarMeta = JSON.stringify({ hash: passwordHash });

    const results = [];

    for (const c of CLEANERS) {
      // ─── 1. Create or find user ───
      let user = await prisma.user.findUnique({ where: { email: c.email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            tenantId,
            email: c.email,
            firstName: c.firstName,
            lastName: c.lastName,
            role: "CLEANER",
            phone: c.phone,
            avatarUrl: avatarMeta,
            status: "active",
          },
        });
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl: avatarMeta, phone: c.phone },
        });
      }

      // ─── 2. Create or find CleanerProfile ───
      let cleaner = await prisma.cleanerProfile.findUnique({
        where: { userId: user.id },
      });
      if (!cleaner) {
        cleaner = await prisma.cleanerProfile.create({
          data: {
            userId: user.id,
            hourlyRate: c.hourlyRate,
            active: true,
            rating: 4.8 + Math.random() * 0.2, // 4.8-5.0
            completedJobs: Math.floor(c.payroll.length * 3.5), // ~3.5 jobs per week
            serviceRadius: 15,
            payoutMethod: "WISE",
          },
        });
      }

      // ─── 3. Create timesheets for each week ───
      let timesheetsCreated = 0;
      for (const row of c.payroll) {
        const [weekStartStr, hours] = row;
        const weekStart = new Date(`${weekStartStr}T00:00:00Z`);

        // Create 4-5 daily timesheets per week (Mon-Fri pattern)
        const dailyHours = distributeHours(hours as number, 5);
        for (let d = 0; d < dailyHours.length; d++) {
          if (dailyHours[d] === 0) continue;
          const day = new Date(weekStart);
          day.setDate(day.getDate() + d); // Mon=0, Tue=1, etc.

          const clockIn = new Date(day);
          clockIn.setHours(8, 0, 0, 0); // 8 AM start

          const clockOut = new Date(clockIn);
          const hoursMs = dailyHours[d] * 3600000;
          clockOut.setTime(clockOut.getTime() + hoursMs);

          // Check if timesheet exists
          const existingTs = await prisma.timesheet.findFirst({
            where: {
              cleanerId: cleaner.id,
              date: day,
            },
          });
          if (!existingTs) {
            await prisma.timesheet.create({
              data: {
                cleanerId: cleaner.id,
                date: day,
                clockIn,
                clockOut,
                hoursWorked: dailyHours[d],
                source: "jobber",
                notes: getJobNote(d, c.firstName),
                approved: true,
                approvedBy: "admin-seed",
              },
            });
            timesheetsCreated++;
          }
        }
      }

      // ─── 4. Create weekly paystubs ───
      let paystubsCreated = 0;
      let paystubsSkipped = 0;

      for (const row of c.payroll) {
        const [weekStartStr, hours, rate, gross, net] = row;
        const periodStart = new Date(`${weekStartStr}T00:00:00Z`);
        const periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 6);
        periodEnd.setHours(23, 59, 59, 999);

        const periodLabel = `Week of ${periodStart.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        })}`;

        const existing = await prisma.paystub.findUnique({
          where: {
            cleanerId_periodStart_periodEnd: {
              cleanerId: cleaner.id,
              periodStart,
              periodEnd,
            },
          },
        });

        if (existing) {
          paystubsSkipped++;
          continue;
        }

        // Get timesheet IDs for this period
        const weekTimesheets = await prisma.timesheet.findMany({
          where: {
            cleanerId: cleaner.id,
            date: { gte: periodStart, lte: periodEnd },
          },
          select: { id: true },
        });

        await prisma.paystub.create({
          data: {
            cleanerId: cleaner.id,
            periodStart,
            periodEnd,
            periodLabel,
            totalHours: hours as number,
            hourlyRate: rate as number,
            grossPay: gross as number,
            deductions: 0,
            reimbursements: 0,
            bonuses: 0,
            netPay: net as number,
            timesheetIds: weekTimesheets.map((t) => t.id),
            status: "finalized",
            finalizedAt: new Date(),
            finalizedBy: "admin-seed",
          },
        });
        paystubsCreated++;
      }

      results.push({
        user: { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}` },
        cleaner: { id: cleaner.id, hourlyRate: cleaner.hourlyRate },
        timesheets: { created: timesheetsCreated },
        paystubs: { created: paystubsCreated, skipped: paystubsSkipped, total: c.payroll.length },
      });
    }

    return NextResponse.json({
      success: true,
      cleaners: results,
      login: { password, portal: "/employee-hub" },
    });
  } catch (err: any) {
    console.error("[seed-cleaners] Error:", err);
    return NextResponse.json(
      { error: err.message || "Seed failed", stack: err.stack },
      { status: 500 }
    );
  }
}

// Distribute weekly hours across workdays (Mon-Fri)
function distributeHours(total: number, days: number): number[] {
  const result: number[] = [];
  let remaining = total;

  for (let i = 0; i < days; i++) {
    if (i === days - 1) {
      result.push(Math.round(remaining * 100) / 100);
    } else {
      // Random variation: 15-30% of remaining
      const portion = remaining * (0.15 + Math.random() * 0.15);
      const hours = Math.round(portion * 100) / 100;
      result.push(hours);
      remaining -= hours;
    }
  }

  // Filter out tiny amounts and redistribute
  return result.map((h) => (h < 0.5 ? 0 : Math.round(h * 100) / 100));
}

// Realistic job notes
function getJobNote(dayIndex: number, name: string): string {
  const notes = [
    "Regular residential clean - Russell",
    "Deep clean - downtown condo",
    "Move-out clean - South Shore",
    "Office clean - Palmer Ranch",
    "Regular recurring - Catlettsburg",
    "Post-construction cleanup",
    "Recurring biweekly - Bird Key",
    "New client walkthrough + clean",
    "Commercial office suite",
    "Vacation rental turnover",
  ];
  // Deterministic but varied
  const idx = (dayIndex + name.charCodeAt(0)) % notes.length;
  return notes[idx];
}
