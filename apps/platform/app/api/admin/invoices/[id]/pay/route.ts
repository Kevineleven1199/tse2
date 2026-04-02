import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session || !["HQ", "MANAGER"].includes(session.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const invoice = await prisma.invoice.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "PAID") {
      return NextResponse.json({ error: "Invoice is already paid" }, { status: 400 });
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        amountPaid: invoice.total,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[invoices/pay] Error:", error);
    return NextResponse.json({ error: "Failed to mark invoice as paid" }, { status: 500 });
  }
}
