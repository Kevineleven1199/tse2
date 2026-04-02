import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

const receiptSchema = z.object({
  type: z.enum(["reimbursement", "expense"]),
  amount: z.number().positive(),
  description: z.string().min(1).max(500),
  category: z.string().optional(),
  imageData: z.string().optional(), // base64 receipt photo
  vendor: z.string().optional(),
  date: z.string().optional(),
});

/**
 * GET /api/receipts
 * List receipts/reimbursements. Cleaners see their own, HQ/MANAGER see all.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = ["HQ", "MANAGER"].includes(session.role);
  const url = new URL(request.url);
  const type = url.searchParams.get("type"); // "reimbursement" or "expense"

  // For reimbursements, get payroll adjustments
  // For expenses, get expense records
  if (type === "reimbursement" || session.role === "CLEANER") {
    const where: Record<string, unknown> = { type: "reimbursement" };
    if (!isAdmin) {
      const cleaner = await prisma.cleanerProfile.findFirst({
        where: { userId: session.userId },
        select: { id: true },
      });
      if (cleaner) where.cleanerId = cleaner.id;
    } else {
      // Scope to tenant
      where.cleaner = { user: { tenantId: session.tenantId } };
    }

    const adjustments = await prisma.payrollAdjustment.findMany({
      where,
      include: { cleaner: { include: { user: { select: { firstName: true, lastName: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      receipts: adjustments.map((a) => ({
        id: a.id,
        type: "reimbursement",
        amount: a.amount,
        description: a.description,
        cleanerName: `${a.cleaner.user.firstName} ${a.cleaner.user.lastName}`.trim(),
        status: "pending",
        createdAt: a.createdAt.toISOString(),
      })),
    });
  }

  // Expenses (admin only)
  if (isAdmin) {
    const expenses = await prisma.expense.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      receipts: expenses.map((e) => ({
        id: e.id,
        type: "expense",
        amount: e.amount,
        description: e.description,
        category: e.category,
        vendor: e.vendor,
        date: e.date?.toISOString(),
        createdAt: e.createdAt.toISOString(),
      })),
    });
  }

  return NextResponse.json({ receipts: [] });
}

/**
 * POST /api/receipts
 * Upload a receipt. Cleaners create reimbursement requests, admins create expenses.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const data = receiptSchema.parse(body);

  if (data.type === "reimbursement") {
    // Cleaner submitting a reimbursement
    const cleaner = await prisma.cleanerProfile.findFirst({
      where: { userId: session.userId },
      select: { id: true },
    });

    if (!cleaner && session.role === "CLEANER") {
      return NextResponse.json({ error: "Cleaner profile not found" }, { status: 404 });
    }

    const cleanerId = cleaner?.id;
    if (!cleanerId) {
      return NextResponse.json({ error: "Cleaner ID required for reimbursement" }, { status: 400 });
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const adjustment = await prisma.payrollAdjustment.create({
      data: {
        cleanerId,
        type: "reimbursement",
        amount: data.amount,
        description: `${data.description}${data.vendor ? ` (${data.vendor})` : ""}`,
        payPeriodStart: periodStart,
        payPeriodEnd: periodEnd,
        createdBy: session.userId,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorId: session.userId,
        action: "receipt.reimbursement_submitted",
        metadata: { adjustmentId: adjustment.id, amount: data.amount, description: data.description },
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, id: adjustment.id, message: "Reimbursement submitted for approval" }, { status: 201 });
  }

  if (data.type === "expense" && ["HQ", "MANAGER"].includes(session.role)) {
    const expense = await prisma.expense.create({
      data: {
        tenantId: session.tenantId,
        amount: data.amount,
        description: data.description,
        category: data.category || "supplies",
        vendor: data.vendor || null,
        date: data.date ? new Date(data.date) : new Date(),
        createdBy: session.userId,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorId: session.userId,
        action: "receipt.expense_created",
        metadata: { expenseId: expense.id, amount: data.amount, category: data.category, vendor: data.vendor },
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, id: expense.id, message: "Expense recorded" }, { status: 201 });
  }

  return NextResponse.json({ error: "Invalid receipt type or insufficient permissions" }, { status: 400 });
}
