import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

const updateExpenseSchema = z.object({
  category: z.string().optional(),
  vendor: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().positive().optional(),
  date: z.string().optional(),
  recurring: z.boolean().optional(),
});

type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.role !== "HQ") {
      return NextResponse.json(
        { error: "Unauthorized - HQ access required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Verify expense exists and belongs to tenant
    const expense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!expense || expense.tenantId !== session.tenantId) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }

    const json = await request.json();
    const payload = updateExpenseSchema.parse(json);

    const updateData: any = {
      ...payload,
    };

    // Handle date parsing if provided
    if (payload.date) {
      updateData.date = payload.date.includes("T")
        ? new Date(payload.date)
        : new Date(payload.date + "T00:00:00Z");
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ...updated,
      date: updated.date.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[PATCH /api/admin/expenses/[id]] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.flatten() },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.role !== "HQ") {
      return NextResponse.json(
        { error: "Unauthorized - HQ access required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Verify expense exists and belongs to tenant
    const expense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!expense || expense.tenantId !== session.tenantId) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }

    await prisma.expense.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/expenses/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 500 }
    );
  }
}
