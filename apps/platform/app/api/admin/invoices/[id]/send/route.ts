import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { sendEmailWithFailsafe } from "@/src/lib/email-failsafe";

export const dynamic = "force-dynamic";

export async function POST(
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

    if (!invoice.customerEmail) {
      return NextResponse.json(
        { error: "Customer email not found" },
        { status: 400 }
      );
    }

    await sendEmailWithFailsafe({
      to: invoice.customerEmail,
      subject: `Invoice ${invoice.invoiceNumber}`,
      html: `
        <h2>Invoice ${invoice.invoiceNumber}</h2>
        <p>Amount: $${invoice.total.toFixed(2)}</p>
        <p>Due Date: ${invoice.dueDate?.toLocaleDateString() || "N/A"}</p>
      `,
    });

    // Update invoice status to SENT
    const updatedInvoice = await prisma.invoice.update({
      where: { id: id },
      data: { status: "SENT", sentAt: new Date() },
    });

    return NextResponse.json(updatedInvoice);
  } catch (error) {
    console.error("Failed to send invoice:", error);
    return NextResponse.json(
      { error: "Failed to send invoice" },
      { status: 500 }
    );
  }
}
