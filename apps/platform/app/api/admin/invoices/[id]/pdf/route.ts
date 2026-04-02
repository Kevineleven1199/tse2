import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/admin/invoices/[id]/pdf — Generate branded invoice PDF
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (!["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice || invoice.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const pdf = await generateInvoicePDF(invoice);

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_REDIRECT")) throw error;
    console.error("[invoice PDF]", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}

async function generateInvoicePDF(invoice: any): Promise<Buffer> {
  const { default: PDFDocument } = await import("pdfkit");

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "letter", margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer | Uint8Array) => chunks.push(Buffer.from(c)));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const G = "#0d5e3b";
      const GRAY = "#6b7280";
      const fmt = (n: number) => `$${n.toFixed(2)}`;

      // Header
      doc.rect(0, 0, 612, 80).fill(G);
      doc.font("Helvetica-Bold").fontSize(20).fillColor("#FFFFFF").text("Tri State Enterprise", 50, 22);
      doc.font("Helvetica").fontSize(9).text("Flatwoods, KY  |  (606) 555-0100  |  info@tsenow.com", 50, 48);

      // Invoice title
      doc.font("Helvetica-Bold").fontSize(24).fillColor(G).text("INVOICE", 50, 100);
      doc.font("Helvetica").fontSize(10).fillColor(GRAY);
      doc.text(`Invoice #: ${invoice.invoiceNumber}`, 50, 130);
      doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString("en-US")}`, 50, 145);
      if (invoice.dueDate) doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString("en-US")}`, 50, 160);

      // Bill To
      doc.font("Helvetica-Bold").fontSize(10).fillColor(G).text("BILL TO", 350, 100);
      doc.font("Helvetica").fontSize(10).fillColor("#000000");
      doc.text(invoice.customerName, 350, 118);
      if (invoice.customerEmail) doc.text(invoice.customerEmail, 350, 133);
      if (invoice.customerPhone) doc.text(invoice.customerPhone, 350, 148);

      // Line Items Table
      let y = 195;
      doc.rect(50, y, 512, 24).fill("#f3f4f6");
      doc.font("Helvetica-Bold").fontSize(9).fillColor(GRAY);
      doc.text("Description", 58, y + 7);
      doc.text("Qty", 340, y + 7);
      doc.text("Rate", 400, y + 7);
      doc.text("Amount", 480, y + 7);
      y += 24;

      const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
      doc.font("Helvetica").fontSize(9).fillColor("#000000");
      for (const item of lineItems as any[]) {
        doc.text(item.description || "Service", 58, y + 5, { width: 270 });
        doc.text(String(item.quantity ?? 1), 340, y + 5);
        doc.text(fmt(item.unitPrice ?? item.amount ?? 0), 400, y + 5);
        doc.text(fmt((item.quantity ?? 1) * (item.unitPrice ?? item.amount ?? 0)), 480, y + 5);
        y += 22;
      }

      // Totals
      y += 10;
      doc.moveTo(350, y).lineTo(562, y).stroke("#e5e7eb");
      y += 10;
      doc.font("Helvetica").fontSize(10).fillColor(GRAY);
      doc.text("Subtotal", 350, y); doc.text(fmt(invoice.subtotal), 480, y);
      y += 18;
      if (invoice.taxAmount > 0) {
        doc.text(`Tax (${((invoice.taxRate ?? 0) * 100).toFixed(1)}%)`, 350, y);
        doc.text(fmt(invoice.taxAmount), 480, y);
        y += 18;
      }
      if (invoice.discountAmount > 0) {
        doc.text("Discount", 350, y); doc.text(`-${fmt(invoice.discountAmount)}`, 480, y);
        y += 18;
      }

      // Total box
      y += 5;
      doc.roundedRect(345, y, 217, 40, 6).fill(G);
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#FFFFFF");
      doc.text("TOTAL DUE", 358, y + 12);
      doc.fontSize(16).text(fmt(invoice.total), 460, y + 10);

      // Status
      y += 55;
      const statusColor = invoice.status === "PAID" ? "#16a34a" : invoice.status === "OVERDUE" ? "#dc2626" : "#d97706";
      doc.font("Helvetica-Bold").fontSize(11).fillColor(statusColor).text(`Status: ${invoice.status}`, 50, y);

      // Footer
      doc.font("Helvetica").fontSize(7).fillColor(GRAY);
      doc.text("Tri State Enterprise  |  Flatwoods, KY  |  Thank you for your business!", 50, 720, { align: "center", width: 512 });

      doc.end();
    } catch (e) { reject(e); }
  });
}
