import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyPasswordHash } from "@/src/lib/auth/password";

export const dynamic = "force-dynamic";

/**
 * Quick-fix endpoint:
 * 1. Update Isabel → $25/hr, recalculate paystubs
 * 2. Create Monica (Isabel's partner) with matching hours at $20/hr
 * 3. Update Martha → $25/hr, recalculate paystubs
 * 4. Create Nicole (Martha's partner) with matching hours at $20/hr
 */
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

    const results: Record<string, unknown> = {};

    // ─────────────────────────────────────────────
    // 1. UPDATE ISABEL → $25/hr
    // ─────────────────────────────────────────────
    const isabelUser = await prisma.user.findUnique({ where: { email: "isabel@ggoc.us" } });
    if (!isabelUser) throw new Error("Isabel not found — run seed-cleaners first");

    const isabelCleaner = await prisma.cleanerProfile.findUnique({ where: { userId: isabelUser.id } });
    if (!isabelCleaner) throw new Error("Isabel cleaner profile not found");

    await prisma.cleanerProfile.update({
      where: { id: isabelCleaner.id },
      data: { hourlyRate: 25 },
    });

    // Recalculate all Isabel's paystubs at $25/hr
    const isabelStubs = await prisma.paystub.findMany({ where: { cleanerId: isabelCleaner.id } });
    for (const stub of isabelStubs) {
      const gross = stub.totalHours * 25;
      const net = gross - stub.deductions + stub.reimbursements + stub.bonuses;
      await prisma.paystub.update({
        where: { id: stub.id },
        data: { hourlyRate: 25, grossPay: gross, netPay: net },
      });
    }

    results.isabel = {
      action: "updated",
      hourlyRate: 25,
      paystubsRecalculated: isabelStubs.length,
    };

    // ─────────────────────────────────────────────
    // 2. CREATE MONICA (Isabel's partner, $20/hr, matching hours)
    // ─────────────────────────────────────────────
    const monicaResult = await createPartner({
      tenantId,
      firstName: "Monica",
      lastName: "TBD",
      email: "monica@ggoc.us",
      phone: null,
      hourlyRate: 20,
      sourceCleanerId: isabelCleaner.id,
    });
    results.monica = monicaResult;

    // ─────────────────────────────────────────────
    // 3. UPDATE MARTHA → $25/hr
    // ─────────────────────────────────────────────
    const marthaUser = await prisma.user.findUnique({ where: { email: "martha@ggoc.us" } });
    if (!marthaUser) throw new Error("Martha not found — run seed-cleaners first");

    const marthaCleaner = await prisma.cleanerProfile.findUnique({ where: { userId: marthaUser.id } });
    if (!marthaCleaner) throw new Error("Martha cleaner profile not found");

    await prisma.cleanerProfile.update({
      where: { id: marthaCleaner.id },
      data: { hourlyRate: 25 },
    });

    // Recalculate all Martha's paystubs at $25/hr
    const marthaStubs = await prisma.paystub.findMany({ where: { cleanerId: marthaCleaner.id } });
    for (const stub of marthaStubs) {
      const gross = stub.totalHours * 25;
      const net = gross - stub.deductions + stub.reimbursements + stub.bonuses;
      await prisma.paystub.update({
        where: { id: stub.id },
        data: { hourlyRate: 25, grossPay: gross, netPay: net },
      });
    }

    results.martha = {
      action: "updated",
      hourlyRate: 25,
      paystubsRecalculated: marthaStubs.length,
    };

    // ─────────────────────────────────────────────
    // 4. CREATE NICOLE (Martha's partner, $20/hr, matching hours)
    // ─────────────────────────────────────────────
    const nicoleResult = await createPartner({
      tenantId,
      firstName: "Nicole",
      lastName: "TBD",
      email: "nicole@ggoc.us",
      phone: null,
      hourlyRate: 20,
      sourceCleanerId: marthaCleaner.id,
    });
    results.nicole = nicoleResult;

    return NextResponse.json({ success: true, results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[seed-partners] Error:", err);
    return NextResponse.json({ error: message, stack }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// Helper: create a partner cleaner who mirrors
// the source cleaner's timesheets at a different rate
// ─────────────────────────────────────────────
async function createPartner(opts: {
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  hourlyRate: number;
  sourceCleanerId: string;
}) {
  const avatarMeta = await applyPasswordHash("TriState2026!");

  // Create or update user
  let user = await prisma.user.findUnique({ where: { email: opts.email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        tenantId: opts.tenantId,
        email: opts.email,
        firstName: opts.firstName,
        lastName: opts.lastName,
        role: "CLEANER",
        phone: opts.phone,
        avatarUrl: avatarMeta,
        status: "active",
      },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: avatarMeta },
    });
  }

  // Create or find cleaner profile
  let cleaner = await prisma.cleanerProfile.findUnique({ where: { userId: user.id } });
  if (!cleaner) {
    cleaner = await prisma.cleanerProfile.create({
      data: {
        userId: user.id,
        hourlyRate: opts.hourlyRate,
        active: true,
        rating: 4.8 + Math.random() * 0.2,
        completedJobs: 0,
        serviceRadius: 15,
        payoutMethod: "WISE",
      },
    });
  } else {
    await prisma.cleanerProfile.update({
      where: { id: cleaner.id },
      data: { hourlyRate: opts.hourlyRate },
    });
  }

  // Get ALL timesheets from the source partner
  const sourceTimesheets = await prisma.timesheet.findMany({
    where: { cleanerId: opts.sourceCleanerId },
    orderBy: { date: "asc" },
  });

  // Mirror timesheets
  let timesheetsCreated = 0;
  for (const ts of sourceTimesheets) {
    const existing = await prisma.timesheet.findFirst({
      where: { cleanerId: cleaner.id, date: ts.date },
    });
    if (!existing) {
      await prisma.timesheet.create({
        data: {
          cleanerId: cleaner.id,
          date: ts.date,
          clockIn: ts.clockIn,
          clockOut: ts.clockOut,
          hoursWorked: ts.hoursWorked,
          source: "jobber",
          notes: ts.notes?.replace(/(Isabel|Martha)/g, opts.firstName) ?? null,
          approved: true,
          approvedBy: "admin-seed",
        },
      });
      timesheetsCreated++;
    }
  }

  // Get ALL paystubs from source to mirror periods
  const sourceStubs = await prisma.paystub.findMany({
    where: { cleanerId: opts.sourceCleanerId },
    orderBy: { periodStart: "asc" },
  });

  let paystubsCreated = 0;
  for (const srcStub of sourceStubs) {
    const existing = await prisma.paystub.findUnique({
      where: {
        cleanerId_periodStart_periodEnd: {
          cleanerId: cleaner.id,
          periodStart: srcStub.periodStart,
          periodEnd: srcStub.periodEnd,
        },
      },
    });
    if (existing) continue;

    // Same hours, different rate
    const gross = srcStub.totalHours * opts.hourlyRate;
    const net = gross;

    // Get this partner's timesheet IDs for the period
    const weekTimesheets = await prisma.timesheet.findMany({
      where: {
        cleanerId: cleaner.id,
        date: { gte: srcStub.periodStart, lte: srcStub.periodEnd },
      },
      select: { id: true },
    });

    await prisma.paystub.create({
      data: {
        cleanerId: cleaner.id,
        periodStart: srcStub.periodStart,
        periodEnd: srcStub.periodEnd,
        periodLabel: srcStub.periodLabel,
        totalHours: srcStub.totalHours,
        hourlyRate: opts.hourlyRate,
        grossPay: gross,
        deductions: 0,
        reimbursements: 0,
        bonuses: 0,
        netPay: net,
        timesheetIds: weekTimesheets.map((t) => t.id),
        status: "finalized",
        finalizedAt: new Date(),
        finalizedBy: "admin-seed",
      },
    });
    paystubsCreated++;
  }

  // Update completed jobs count
  await prisma.cleanerProfile.update({
    where: { id: cleaner.id },
    data: { completedJobs: Math.floor(timesheetsCreated * 0.7) },
  });

  return {
    action: "created",
    user: { id: user.id, email: user.email, name: `${opts.firstName} ${opts.lastName}` },
    cleaner: { id: cleaner.id, hourlyRate: opts.hourlyRate },
    timesheets: { created: timesheetsCreated },
    paystubs: { created: paystubsCreated },
  };
}
