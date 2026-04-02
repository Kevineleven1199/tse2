import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ cleanerId: string }> };

/**
 * GET /api/employee/[cleanerId]/pay-rate
 * Get the hourly rate for a cleaner. CLEANER sees own; HQ/MANAGER sees any.
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cleanerId } = await context.params;
    const isAdmin = ["HQ", "MANAGER"].includes(session.role);

    // CLEANER can only view their own rate
    if (!isAdmin) {
      const profile = await prisma.cleanerProfile.findUnique({
        where: { userId: session.userId },
        select: { id: true },
      });
      if (!profile || profile.id !== cleanerId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const cleaner = await prisma.cleanerProfile.findUnique({
      where: { id: cleanerId },
      select: {
        id: true,
        hourlyRate: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });

    if (!cleaner) {
      return NextResponse.json({ error: "Cleaner not found" }, { status: 404 });
    }

    return NextResponse.json({
      cleanerId: cleaner.id,
      cleanerName: `${cleaner.user.firstName} ${cleaner.user.lastName}`,
      hourlyRate: cleaner.hourlyRate,
    });
  } catch (error) {
    console.error("[GET /api/employee/[cleanerId]/pay-rate] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/employee/[cleanerId]/pay-rate
 * Update the hourly rate for a cleaner. HQ/MANAGER only.
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cleanerId } = await context.params;
    const body = (await request.json()) as { hourlyRate: number };

    if (typeof body.hourlyRate !== "number" || body.hourlyRate < 0) {
      return NextResponse.json({ error: "Invalid hourlyRate" }, { status: 400 });
    }

    const cleaner = await prisma.cleanerProfile.findUnique({
      where: { id: cleanerId },
      select: { id: true, hourlyRate: true },
    });
    if (!cleaner) {
      return NextResponse.json({ error: "Cleaner not found" }, { status: 404 });
    }

    const previousRate = cleaner.hourlyRate;

    const updated = await prisma.cleanerProfile.update({
      where: { id: cleanerId },
      data: { hourlyRate: body.hourlyRate },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorId: session.userId,
        action: "PAY_RATE_UPDATED",
        metadata: {
          cleanerId,
          previousRate,
          newRate: body.hourlyRate,
        },
      },
    });

    return NextResponse.json({
      success: true,
      cleanerId,
      hourlyRate: updated.hourlyRate,
    });
  } catch (error) {
    console.error("[PUT /api/employee/[cleanerId]/pay-rate] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
