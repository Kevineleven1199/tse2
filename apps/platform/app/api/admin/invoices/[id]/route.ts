import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session || !["HQ"].includes(session.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id, tenantId: session.tenantId },
    });
    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(invoice);
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session || !["HQ"].includes(session.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify invoice belongs to this tenant
    const existing = await prisma.invoice.findFirst({
      where: { id, tenantId: session.tenantId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const body = await request.json();
    const data: any = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.amountPaid !== undefined) data.amountPaid = Number(body.amountPaid);
    if (body.paidAt !== undefined) data.paidAt = new Date(body.paidAt);
    if (body.notes !== undefined) data.notes = body.notes;

    const updated = await prisma.invoice.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session || !["HQ"].includes(session.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify invoice belongs to this tenant
    const existing = await prisma.invoice.findFirst({
      where: { id, tenantId: session.tenantId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    await prisma.invoice.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
