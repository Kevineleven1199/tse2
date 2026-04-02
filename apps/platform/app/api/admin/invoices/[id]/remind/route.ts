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
      subject: `Payment Reminder - Invoice ${invoice.invoiceNumber}`,
      html: `
        <h2>Payment Reminder</h2>
        <p>This is a reminder that invoice ${invoice.invoiceNumber} is still pending.</p>
        <p>Amount: $${invoice.total.toFixed(2)}</p>
        <p>Due Date: ${invoice.dueDate?.toLocaleDateString() || "N/A"}</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to send reminder:", error);
    return NextResponse.json(
      { error: "Failed to send reminder" },
      { status: 500 }
    );
  }
}
