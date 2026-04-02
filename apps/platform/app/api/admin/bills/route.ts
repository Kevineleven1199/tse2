import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/bills — List all bills (accounts payable)
 * POST /api/admin/bills — Create or update a bill
 */
export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!["HQ", "MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // unpaid, paid, overdue, all

  const bills = await prisma.bill.findMany({
    where: {
      tenantId: session.tenantId,
      ...(status && status !== "all" ? { status } : {}),
    },
    orderBy: { dueDate: "asc" },
  });

  // Auto-mark overdue bills
  const now = new Date();
  const overdueIds = bills
    .filter((b) => b.status === "unpaid" && b.dueDate < now)
    .map((b) => b.id);

  if (overdueIds.length > 0) {
    await prisma.bill.updateMany({
      where: { id: { in: overdueIds } },
      data: { status: "overdue" },
    });
  }

  const totalUnpaid = bills.filter((b) => b.status === "unpaid" || b.status === "overdue").reduce((s, b) => s + b.amount, 0);
  const totalPaid = bills.filter((b) => b.status === "paid").reduce((s, b) => s + (b.paidAmount ?? b.amount), 0);

  return NextResponse.json({
    bills: bills.map((b) => ({
      ...b,
      status: overdueIds.includes(b.id) ? "overdue" : b.status,
    })),
    stats: { totalUnpaid, totalPaid, count: bills.length },
  });
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!["HQ", "MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  if (body.action === "create") {
    const bill = await prisma.bill.create({
      data: {
        tenantId: session.tenantId,
        vendorName: body.vendorName,
        vendorEmail: body.vendorEmail || null,
        billNumber: body.billNumber || null,
        description: body.description,
        amount: body.amount,
        dueDate: new Date(body.dueDate),
        category: body.category || "other",
        receiptUrl: body.receiptUrl || null,
        createdBy: session.userId,
      },
    });
    return NextResponse.json({ ok: true, bill });
  }

  if (body.action === "pay") {
    const bill = await prisma.bill.update({
      where: { id: body.billId },
      data: {
        status: "paid",
        paidAt: new Date(),
        paidAmount: body.paidAmount ?? undefined,
      },
    });
    return NextResponse.json({ ok: true, bill });
  }

  if (body.action === "void") {
    const bill = await prisma.bill.update({
      where: { id: body.billId },
      data: { status: "void" },
    });
    return NextResponse.json({ ok: true, bill });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
