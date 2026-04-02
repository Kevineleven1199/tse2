import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PUT /api/employee/payroll-adjustments/[id]
 * Edit a payroll adjustment. HQ/MANAGER only.
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const body = (await request.json()) as {
      type?: "deduction" | "reimbursement" | "bonus";
      amount?: number;
      description?: string;
      payPeriodStart?: string;
      payPeriodEnd?: string;
    };

    // Verify adjustment belongs to a cleaner in this tenant
    const existing = await prisma.payrollAdjustment.findFirst({
      where: { id, cleaner: { user: { tenantId: session.tenantId } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Adjustment not found" }, { status: 404 });
    }

    const updated = await prisma.payrollAdjustment.update({
      where: { id },
      data: {
        type: body.type ?? existing.type,
        amount: body.amount ?? existing.amount,
        description: body.description ?? existing.description,
        payPeriodStart: body.payPeriodStart ? new Date(body.payPeriodStart) : existing.payPeriodStart,
        payPeriodEnd: body.payPeriodEnd ? new Date(body.payPeriodEnd) : existing.payPeriodEnd,
      },
    });

    return NextResponse.json({ success: true, adjustment: updated });
  } catch (error) {
    console.error("[PUT /api/employee/payroll-adjustments/[id]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/employee/payroll-adjustments/[id]
 * Delete a payroll adjustment. HQ/MANAGER only.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // Verify adjustment belongs to a cleaner in this tenant
    const existing = await prisma.payrollAdjustment.findFirst({
      where: { id, cleaner: { user: { tenantId: session.tenantId } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Adjustment not found" }, { status: 404 });
    }

    await prisma.payrollAdjustment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/employee/payroll-adjustments/[id]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
