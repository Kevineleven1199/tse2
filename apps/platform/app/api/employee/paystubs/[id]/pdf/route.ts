import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/employee/paystubs/[id]/pdf
 * Generate professional PDF paystub with overtime, tax withholding, and YTD totals
 */
export const GET = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const session = await requireSession();

    if (!["CLEANER", "HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const viewer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { tenantId: true },
    });

    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const paystub = await prisma.paystub.findUnique({
      where: { id },
      include: {
        cleaner: {
          include: {
            user: {
              select: { id: true, tenantId: true, firstName: true, lastName: true, email: true, phone: true },
            },
          },
        },
      },
    });

    if (!paystub) {
      return NextResponse.json({ error: "Paystub not found" }, { status: 404 });
    }

    // Access control
    if (session.role === "CLEANER") {
      const cleanerProfile = await prisma.cleanerProfile.findUnique({
        where: { userId: session.userId },
        select: { id: true },
      });
      if (!cleanerProfile || cleanerProfile.id !== paystub.cleanerId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      if (paystub.cleaner.user.tenantId !== viewer.tenantId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Get YTD totals
    const yearStart = new Date(paystub.periodStart.getFullYear(), 0, 1);
    const ytdPaystubs = await prisma.paystub.findMany({
      where: {
        cleanerId: paystub.cleanerId,
        periodEnd: { lte: paystub.periodEnd },
        periodStart: { gte: yearStart },
        status: "finalized",
      },
      select: { grossPay: true, netPay: true, totalHours: true },
    });

    const ytdGross = ytdPaystubs.reduce((s, p) => s + p.grossPay, 0);
    const ytdNet = ytdPaystubs.reduce((s, p) => s + p.netPay, 0);
    const ytdHours = ytdPaystubs.reduce((s, p) => s + p.totalHours, 0);

    const pdf = await generatePaystubPDF(paystub, { ytdGross, ytdNet, ytdHours });

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="paystub-${paystub.periodLabel.replace(/\s+/g, "-")}.pdf"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("[paystub PDF] Error:", error);
    if (error?.digest?.startsWith?.("NEXT_REDIRECT")) throw error;
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
};

async function generatePaystubPDF(
  paystub: any,
  ytd: { ytdGross: number; ytdNet: number; ytdHours: number }
): Promise<Buffer> {
  const { default: PDFDocument } = await import("pdfkit");

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "letter", margin: 40 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer | Uint8Array) => chunks.push(Buffer.from(chunk)));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const G = "#0d5e3b"; // dark green
      const B = "#0fb77a"; // brand green
      const GRAY = "#6b7280";
      const name = `${paystub.cleaner.user.firstName} ${paystub.cleaner.user.lastName}`;
      const taxClass = paystub.taxClassification ?? "1099";
      const fmt = (n: number) => n.toFixed(2);
      const fmtD = (d: Date) => d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });

      // ─── Header Banner ───
      doc.rect(0, 0, 612, 88).fill(G);
      doc.font("Helvetica-Bold").fontSize(22).fillColor("#FFFFFF").text("Tri State Enterprise", 40, 20);
      doc.font("Helvetica").fontSize(10).fillColor("#FFFFFF").text("Eco-Friendly Cleaning Services  |  Flatwoods, KY  |  (606) 836-2534", 40, 50);
      doc.fontSize(9).text("tse@tristateenterprise.com  |  tsenow.com", 40, 65);

      // ─── Paystub Title ───
      doc.font("Helvetica-Bold").fontSize(14).fillColor(G).text("EARNINGS STATEMENT", 40, 105);
      doc.font("Helvetica").fontSize(9).fillColor(GRAY).text(taxClass === "1099" ? "Independent Contractor" : "W-2 Employee", 40, 123);

      // ─── Team Member Info & Period (two columns) ───
      const infoY = 148;
      doc.font("Helvetica-Bold").fontSize(8).fillColor(GRAY).text("TEAM MEMBER", 40, infoY);
      doc.font("Helvetica").fontSize(10).fillColor("#000000").text(name, 40, infoY + 13);
      doc.fontSize(9).fillColor(GRAY).text(paystub.cleaner.user.email, 40, infoY + 28);
      if (paystub.cleaner.user.phone) doc.text(paystub.cleaner.user.phone, 40, infoY + 42);

      doc.font("Helvetica-Bold").fontSize(8).fillColor(GRAY).text("PAY PERIOD", 350, infoY);
      doc.font("Helvetica").fontSize(10).fillColor("#000000").text(paystub.periodLabel, 350, infoY + 13);
      doc.fontSize(9).fillColor(GRAY).text(`${fmtD(paystub.periodStart)} — ${fmtD(paystub.periodEnd)}`, 350, infoY + 28);
      doc.text(`Status: ${paystub.status === "finalized" ? "Finalized" : "Draft"}`, 350, infoY + 42);

      // ─── Divider ───
      doc.moveTo(40, 210).lineTo(572, 210).lineWidth(0.5).stroke("#e5e7eb");

      // ─── Hours & Earnings Table ───
      let y = 225;
      doc.font("Helvetica-Bold").fontSize(10).fillColor(G).text("HOURS & EARNINGS", 40, y);
      y += 20;

      // Table header
      doc.rect(40, y, 532, 20).fill("#f3f4f6");
      doc.font("Helvetica-Bold").fontSize(8).fillColor(GRAY);
      doc.text("Description", 48, y + 6);
      doc.text("Rate", 260, y + 6);
      doc.text("Hours", 340, y + 6);
      doc.text("Current", 420, y + 6);
      doc.text("YTD", 500, y + 6);
      y += 20;

      // Regular hours
      const regularHours = paystub.regularHours ?? paystub.totalHours;
      const regularPay = regularHours * paystub.hourlyRate;
      doc.font("Helvetica").fontSize(9).fillColor("#000000");
      doc.text("Regular Hours", 48, y + 4);
      doc.text(`$${fmt(paystub.hourlyRate)}/hr`, 260, y + 4);
      doc.text(fmt(regularHours), 340, y + 4);
      doc.text(`$${fmt(regularPay)}`, 420, y + 4);
      doc.text(`$${fmt(ytd.ytdGross)}`, 500, y + 4);
      y += 20;

      // Overtime hours (if any)
      const overtimeHours = paystub.overtimeHours ?? 0;
      const overtimePay = paystub.overtimePay ?? 0;
      if (overtimeHours > 0) {
        doc.text("Overtime (1.5x)", 48, y + 4);
        doc.text(`$${fmt(paystub.hourlyRate * 1.5)}/hr`, 260, y + 4);
        doc.text(fmt(overtimeHours), 340, y + 4);
        doc.text(`$${fmt(overtimePay)}`, 420, y + 4);
        doc.text("—", 500, y + 4);
        y += 20;
      }

      // Totals row
      doc.moveTo(40, y).lineTo(572, y).stroke("#e5e7eb");
      y += 4;
      doc.font("Helvetica-Bold").fontSize(9);
      doc.text("Gross Earnings", 48, y + 4);
      doc.text("", 260, y + 4);
      doc.text(fmt(paystub.totalHours), 340, y + 4);
      doc.text(`$${fmt(paystub.grossPay)}`, 420, y + 4);
      doc.text(`$${fmt(ytd.ytdGross)}`, 500, y + 4);
      y += 28;

      // ─── Tax Withholding / Deductions ───
      doc.font("Helvetica-Bold").fontSize(10).fillColor(G).text("DEDUCTIONS & WITHHOLDING", 40, y);
      y += 20;

      doc.rect(40, y, 532, 20).fill("#f3f4f6");
      doc.font("Helvetica-Bold").fontSize(8).fillColor(GRAY);
      doc.text("Description", 48, y + 6);
      doc.text("Current", 420, y + 6);
      doc.text("YTD", 500, y + 6);
      y += 20;

      doc.font("Helvetica").fontSize(9).fillColor("#000000");

      if (taxClass === "W2") {
        const fedWH = paystub.federalWithholding ?? 0;
        const ss = paystub.socialSecurity ?? 0;
        const med = paystub.medicare ?? 0;

        if (fedWH > 0) {
          doc.text("Federal Income Tax", 48, y + 4);
          doc.text(`-$${fmt(fedWH)}`, 420, y + 4);
          doc.text("—", 500, y + 4);
          y += 18;
        }
        if (ss > 0) {
          doc.text("Social Security (6.2%)", 48, y + 4);
          doc.text(`-$${fmt(ss)}`, 420, y + 4);
          doc.text("—", 500, y + 4);
          y += 18;
        }
        if (med > 0) {
          doc.text("Medicare (1.45%)", 48, y + 4);
          doc.text(`-$${fmt(med)}`, 420, y + 4);
          doc.text("—", 500, y + 4);
          y += 18;
        }
      } else {
        doc.fontSize(8).fillColor(GRAY).text("Independent contractor — no tax withholding. You are responsible for self-employment taxes.", 48, y + 4);
        y += 18;
      }

      if (paystub.deductions > 0) {
        doc.font("Helvetica").fontSize(9).fillColor("#000000");
        doc.text("Other Deductions", 48, y + 4);
        doc.text(`-$${fmt(paystub.deductions)}`, 420, y + 4);
        y += 18;
      }
      if (paystub.reimbursements > 0) {
        doc.text("Reimbursements", 48, y + 4);
        doc.text(`+$${fmt(paystub.reimbursements)}`, 420, y + 4);
        y += 18;
      }
      if (paystub.bonuses > 0) {
        doc.text("Bonuses", 48, y + 4);
        doc.text(`+$${fmt(paystub.bonuses)}`, 420, y + 4);
        y += 18;
      }

      y += 8;

      // ─── Net Pay Box ───
      doc.roundedRect(40, y, 532, 50, 8).fill(G);
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#FFFFFF").text("NET PAY", 60, y + 10);
      doc.font("Helvetica").fontSize(9).text("Amount deposited to your account", 60, y + 28);
      doc.font("Helvetica-Bold").fontSize(22).text(`$${fmt(paystub.netPay)}`, 380, y + 14, { width: 180, align: "right" });

      y += 68;

      // ─── YTD Summary ───
      doc.font("Helvetica-Bold").fontSize(10).fillColor(G).text("YEAR-TO-DATE SUMMARY", 40, y);
      y += 18;
      doc.rect(40, y, 532, 36).fill("#f0fdf4");
      doc.font("Helvetica").fontSize(9).fillColor("#000000");
      doc.text(`YTD Hours: ${fmt(ytd.ytdHours)}`, 60, y + 12);
      doc.text(`YTD Gross: $${fmt(ytd.ytdGross)}`, 220, y + 12);
      doc.text(`YTD Net: $${fmt(ytd.ytdNet)}`, 400, y + 12);

      y += 50;

      // ─── Footer ───
      doc.moveTo(40, 720).lineTo(572, 720).lineWidth(0.5).stroke("#e5e7eb");
      doc.font("Helvetica").fontSize(7).fillColor(GRAY);
      doc.text("Tri State Enterprise  |  Flatwoods, KY  |  (606) 836-2534  |  tse@tristateenterprise.com", 40, 728, { align: "center", width: 532 });
      doc.text("This is a computer-generated document. Keep for your records.", 40, 740, { align: "center", width: 532 });
      doc.text(`Generated: ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET`, 40, 750, { align: "center", width: 532 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
