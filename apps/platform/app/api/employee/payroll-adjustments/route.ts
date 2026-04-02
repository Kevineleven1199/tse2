import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/employee/payroll-adjustments
 * List payroll adjustments. HQ/MANAGER only.
 * Query params: ?cleanerId=xxx&from=2025-01-01&to=2025-01-31
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !["HQ", "MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const cleanerId = url.searchParams.get("cleanerId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  // Always scope to caller's tenant via cleaner->user->tenantId
  const where: Record<string, unknown> = {
    cleaner: { user: { tenantId: session.tenantId } },
  };
  if (cleanerId) where.cleanerId = cleanerId;
  if (from || to) {
    where.payPeriodStart = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const adjustments = await prisma.payrollAdjustment.findMany({
    where,
    include: {
      cleaner: {
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    adjustments: adjustments.map((a) => ({
      id: a.id,
      cleanerId: a.cleanerId,
      cleanerName: `${a.cleaner.user.firstName} ${a.cleaner.user.lastName}`,
      type: a.type,
      amount: a.amount,
      description: a.description,
      payPeriodStart: a.payPeriodStart.toISOString(),
      payPeriodEnd: a.payPeriodEnd.toISOString(),
      createdBy: a.createdBy,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

/**
 * POST /api/employee/payroll-adjustments
 * Create a payroll adjustment (deduction, reimbursement, or bonus). HQ/MANAGER only.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["HQ", "MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    cleanerId: string;
    type: "deduction" | "reimbursement" | "bonus";
    amount: number;
    description: string;
    payPeriodStart: string;
    payPeriodEnd: string;
  };

  if (!body.cleanerId || !body.type || !body.amount || !body.description) {
    return NextResponse.json(
      { error: "cleanerId, type, amount, and description are required" },
      { status: 400 }
    );
  }

  if (!["deduction", "reimbursement", "bonus"].includes(body.type)) {
    return NextResponse.json(
      { error: "type must be 'deduction', 'reimbursement', or 'bonus'" },
      { status: 400 }
    );
  }

  // Verify the target cleaner belongs to this tenant
  const cleanerOwnership = await prisma.cleanerProfile.findFirst({
    where: { id: body.cleanerId, user: { tenantId: session.tenantId } },
    select: { id: true },
  });
  if (!cleanerOwnership) {
    return NextResponse.json({ error: "Cleaner not found" }, { status: 404 });
  }

  const adjustment = await prisma.payrollAdjustment.create({
    data: {
      cleanerId: body.cleanerId,
      type: body.type,
      amount: body.amount,
      description: body.description,
      payPeriodStart: new Date(body.payPeriodStart),
      payPeriodEnd: new Date(body.payPeriodEnd),
      createdBy: session.userId,
    },
  });

  return NextResponse.json({ success: true, adjustment }, { status: 201 });
}
