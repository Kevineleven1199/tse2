import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// Emma's weekly payroll data from the reconciliation sheet (Jan 1 – Jul 15, 2025)
const EMMA_PAYROLL = [
  // [weekStart (2025), hoursWorked, hourlyRate, grossPay, netPaid]
  ["2025-01-01", 12.27, 20, 245.40, 0.00],       // Week 1 – not paid (discrepancy)
  ["2025-01-08", 17.37, 20, 347.40, 347.40],
  ["2025-01-15", 21.39, 20, 427.80, 427.80],
  ["2025-01-22", 24.33, 20, 486.60, 486.60],
  ["2025-01-29", 17.37, 20, 347.40, 347.40],
  ["2025-02-05", 22.46, 20, 449.20, 449.20],
  ["2025-02-12", 24.43, 20, 488.60, 488.60],
  ["2025-02-19", 21.06, 20, 421.20, 421.20],
  ["2025-02-26", 13.08, 20, 261.60, 261.60],
  ["2025-03-04", 27.00, 20, 540.00, 540.00],
  ["2025-03-11", 43.06, 20, 861.20, 861.20],
  ["2025-03-18", 27.42, 20, 548.40, 548.40],
  ["2025-03-25", 27.34, 20, 546.80, 546.80],
  ["2025-04-01", 30.23, 20, 604.60, 604.66],
  ["2025-04-08", 41.80, 20, 836.00, 836.00],
  ["2025-04-15", 29.92, 20, 598.40, 598.37],
  ["2025-04-22", 22.14, 20, 442.80, 442.80],
  ["2025-04-29", 22.60, 20, 452.00, 452.00],
  ["2025-05-06", 35.20, 20, 704.00, 704.00],
  ["2025-05-13", 27.60, 20, 552.00, 552.00],
  ["2025-05-20", 33.00, 20, 660.00, 660.00],
  ["2025-05-27", 45.45, 22, 1000.00, 1000.00],   // Rate increased to $22
  ["2025-06-03", 20.00, 22, 440.00, 400.00],
  ["2025-06-10", 26.47, 22, 582.34, 582.36],
  ["2025-06-17", 30.00, 22, 660.00, 600.00],
  ["2025-06-24", 20.00, 22, 440.00, 400.00],
  ["2025-07-01", 21.82, 22, 480.04, 480.00],
  ["2025-07-08", 20.00, 22, 440.00, 400.00],
  ["2025-07-15", 22.09, 22, 486.00, 486.00],
] as const;

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Seed routes disabled in production" }, { status: 403 });
    }

    // Verify admin access via a simple secret (or auth header)
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

    // ─── 1. Create or find Emma's user account ───
    const email = "emma@ggoc.us";
    const password = "TriState2025!";
    const passwordHash = await bcrypt.hash(password, 12);
    const avatarMeta = JSON.stringify({ hash: passwordHash });

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          tenantId,
          email,
          firstName: "Emma",
          lastName: "Kolosha",
          role: "CLEANER",
          phone: null,
          avatarUrl: avatarMeta,
          status: "active",
        },
      });
      console.log(`[seed-emma] Created user: ${user.id}`);
    } else {
      // Update password if user already exists
      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: avatarMeta },
      });
      console.log(`[seed-emma] User already exists: ${user.id}, updated password`);
    }

    // ─── 2. Create or find CleanerProfile ───
    let cleaner = await prisma.cleanerProfile.findUnique({
      where: { userId: user.id },
    });
    if (!cleaner) {
      cleaner = await prisma.cleanerProfile.create({
        data: {
          userId: user.id,
          hourlyRate: 25.0, // Current rate
          active: true,
          rating: 5.0,
          completedJobs: 0,
          serviceRadius: 15,
          payoutMethod: "WISE",
        },
      });
      console.log(`[seed-emma] Created cleaner profile: ${cleaner.id}`);
    } else {
      console.log(`[seed-emma] Cleaner profile exists: ${cleaner.id}`);
    }

    // ─── 3. Create weekly paystubs ───
    let created = 0;
    let skipped = 0;

    for (const row of EMMA_PAYROLL) {
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

      // Check if paystub already exists
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
        skipped++;
        continue;
      }

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
          status: "finalized",
          finalizedAt: new Date(),
          finalizedBy: "admin-seed",
        },
      });
      created++;
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}` },
      cleaner: { id: cleaner.id, hourlyRate: cleaner.hourlyRate },
      paystubs: { created, skipped, total: EMMA_PAYROLL.length },
      login: { email, password, portal: "employee-hub" },
    });
  } catch (err: any) {
    console.error("[seed-emma] Error:", err);
    return NextResponse.json(
      { error: err.message || "Seed failed" },
      { status: 500 }
    );
  }
}
