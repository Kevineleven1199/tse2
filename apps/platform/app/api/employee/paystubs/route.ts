import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import { NextResponse } from "next/server";
import { calculatePayroll } from "@/src/lib/payroll";
import { z } from "zod";

export const dynamic = "force-dynamic";

const getQuerySchema = z.object({
  cleanerId: z.string().min(1).optional(),
});

const postBodySchema = z.object({
  cleanerId: z.string().min(1),
  periodStart: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  periodEnd: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
});

/**
 * GET /api/employee/paystubs
 * List paystubs for a cleaner
 * - CLEANER role: see only their own
 * - HQ/MANAGER: can filter by cleanerId query param
 */
export const GET = async (request: Request) => {
  try {
    const session = await requireSession();

    if (!["CLEANER", "HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const viewer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { tenantId: true },
    });

    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = getQuerySchema.safeParse({
      cleanerId: searchParams.get("cleanerId") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
    }

    const { cleanerId: requestedCleanerId } = parsed.data;

    let cleanerProfileId: string;

    // Determine which cleaner's paystubs to fetch
    if (session.role === "CLEANER") {
      const profile = await prisma.cleanerProfile.findUnique({
        where: { userId: session.userId },
        select: { id: true },
      });

      if (!profile) {
        return NextResponse.json({ error: "Cleaner profile not found" }, { status: 404 });
      }

      cleanerProfileId = profile.id;
    } else {
      // HQ or MANAGER
      if (!requestedCleanerId) {
        return NextResponse.json({ error: "Missing cleanerId parameter for HQ/MANAGER" }, { status: 400 });
      }

      cleanerProfileId = requestedCleanerId;
    }

    // Verify tenant access for HQ/MANAGER
    if (session.role === "HQ" || session.role === "MANAGER") {
      const target = await prisma.cleanerProfile.findUnique({
        where: { id: cleanerProfileId },
        select: {
          user: {
            select: { tenantId: true },
          },
        },
      });

      if (!target) {
        return NextResponse.json({ error: "Cleaner not found" }, { status: 404 });
      }

      if (target.user.tenantId !== viewer.tenantId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Fetch paystubs
    const paystubs = await prisma.paystub.findMany({
      where: { cleanerId: cleanerProfileId },
      include: {
        cleaner: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { periodEnd: "desc" },
    });

    // Format response
    const formattedPaystubs = paystubs.map((stub) => ({
      id: stub.id,
      periodLabel: stub.periodLabel,
      periodStart: stub.periodStart.toISOString(),
      periodEnd: stub.periodEnd.toISOString(),
      grossPay: stub.grossPay,
      netPay: stub.netPay,
      totalHours: stub.totalHours,
      status: stub.status,
      createdAt: stub.createdAt.toISOString(),
      cleaner: {
        id: stub.cleaner.id,
        name: `${stub.cleaner.user.firstName} ${stub.cleaner.user.lastName}`,
      },
    }));

    return NextResponse.json({
      cleanerId: cleanerProfileId,
      paystubs: formattedPaystubs,
      total: paystubs.length,
    });
  } catch (error) {
    console.error("[paystubs GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch paystubs" }, { status: 500 });
  }
};

/**
 * POST /api/employee/paystubs
 * Generate/finalize a paystub for a pay period
 * HQ/MANAGER only
 */
export const POST = async (request: Request) => {
  try {
    const session = await requireSession();

    if (!["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const viewer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { tenantId: true },
    });

    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = postBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { cleanerId, periodStart: periodStartStr, periodEnd: periodEndStr } = parsed.data;

    const periodStart = new Date(periodStartStr);
    const periodEnd = new Date(periodEndStr);

    if (periodStart >= periodEnd) {
      return NextResponse.json({ error: "periodStart must be before periodEnd" }, { status: 400 });
    }

    // Verify cleaner exists and belongs to same tenant
    const cleaner = await prisma.cleanerProfile.findUnique({
      where: { id: cleanerId },
      include: {
        user: {
          select: { tenantId: true, firstName: true, lastName: true },
        },
      },
    });

    if (!cleaner) {
      return NextResponse.json({ error: "Cleaner not found" }, { status: 404 });
    }

    if (cleaner.user.tenantId !== viewer.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Calculate payroll
    const payroll = await calculatePayroll(cleanerId, periodStart, periodEnd);

    if (!payroll) {
      return NextResponse.json({ error: "Failed to calculate payroll" }, { status: 500 });
    }

    // Check if paystub already exists for this period
    const existing = await prisma.paystub.findFirst({
      where: {
        cleanerId,
        periodStart,
        periodEnd,
      },
    });

    let paystub;

    if (existing) {
      // Update existing paystub
      paystub = await prisma.paystub.update({
        where: { id: existing.id },
        data: {
          periodLabel: payroll.period.label,
          totalHours: payroll.totalHours,
          hourlyRate: payroll.hourlyRate,
          grossPay: payroll.grossPay,
          deductions: payroll.deductions,
          reimbursements: payroll.reimbursements,
          bonuses: payroll.bonuses,
          netPay: payroll.netPay,
          timesheetIds: payroll.timesheets.map((t) => t.id),
          adjustmentIds: payroll.adjustments.map((a) => a.id),
          status: "finalized",
          finalizedAt: new Date(),
          finalizedBy: session.userId,
        },
        include: {
          cleaner: {
            include: {
              user: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
      });
    } else {
      // Create new paystub
      paystub = await prisma.paystub.create({
        data: {
          cleanerId,
          periodStart,
          periodEnd,
          periodLabel: payroll.period.label,
          totalHours: payroll.totalHours,
          hourlyRate: payroll.hourlyRate,
          grossPay: payroll.grossPay,
          deductions: payroll.deductions,
          reimbursements: payroll.reimbursements,
          bonuses: payroll.bonuses,
          netPay: payroll.netPay,
          timesheetIds: payroll.timesheets.map((t) => t.id),
          adjustmentIds: payroll.adjustments.map((a) => a.id),
          status: "finalized",
          finalizedAt: new Date(),
          finalizedBy: session.userId,
        },
        include: {
          cleaner: {
            include: {
              user: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
      });
    }

    return NextResponse.json(
      {
        id: paystub.id,
        cleanerId: paystub.cleanerId,
        cleaner: {
          id: paystub.cleaner.id,
          name: `${paystub.cleaner.user.firstName} ${paystub.cleaner.user.lastName}`,
        },
        periodLabel: paystub.periodLabel,
        periodStart: paystub.periodStart.toISOString(),
        periodEnd: paystub.periodEnd.toISOString(),
        totalHours: paystub.totalHours,
        hourlyRate: paystub.hourlyRate,
        grossPay: paystub.grossPay,
        deductions: paystub.deductions,
        reimbursements: paystub.reimbursements,
        bonuses: paystub.bonuses,
        netPay: paystub.netPay,
        status: paystub.status,
        finalizedAt: paystub.finalizedAt?.toISOString(),
        finalizedBy: paystub.finalizedBy,
        createdAt: paystub.createdAt.toISOString(),
        updatedAt: paystub.updatedAt.toISOString(),
      },
      { status: existing ? 200 : 201 }
    );
  } catch (error) {
    console.error("[paystubs POST] Error:", error);
    return NextResponse.json({ error: "Failed to create/update paystub" }, { status: 500 });
  }
};
