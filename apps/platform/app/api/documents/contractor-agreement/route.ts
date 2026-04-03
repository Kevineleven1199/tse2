import { NextResponse } from "next/server";
import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/documents/contractor-agreement
 * Generates a personalized 1099 Independent Contractor Agreement PDF
 */
export async function GET() {
  try {
    const session = await requireSession();
    if (!["CLEANER", "HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { firstName: true, lastName: true, email: true, phone: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const name = `${user.firstName} ${user.lastName}`;
    const pdf = await generateContractorAgreementPDF(name, user.email, user.phone);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="1099-contractor-agreement-${user.lastName?.toLowerCase()}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("[contractor-agreement] Error:", error);
    if (error?.digest?.startsWith?.("NEXT_REDIRECT")) throw error;
    return NextResponse.json({ error: "Failed to generate document" }, { status: 500 });
  }
}

async function generateContractorAgreementPDF(name: string, email: string, phone: string | null): Promise<Buffer> {
  const { default: PDFDocument } = await import("pdfkit");

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "letter", margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer | Uint8Array) => chunks.push(Buffer.from(c)));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const G = "#0d5e3b";
      const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

      // Header
      doc.rect(0, 0, 612, 70).fill(G);
      doc.font("Helvetica-Bold").fontSize(18).fillColor("#FFFFFF").text("Tri State Enterprise", 50, 18);
      doc.font("Helvetica").fontSize(9).text("Independent Contractor Services Agreement", 50, 42);

      let y = 90;
      const body = (text: string, opts?: any) => {
        doc.font("Helvetica").fontSize(10).fillColor("#1f2937").text(text, 50, y, { width: 512, lineGap: 3, ...opts });
        y = doc.y + 8;
      };
      const heading = (text: string) => {
        y += 6;
        doc.font("Helvetica-Bold").fontSize(11).fillColor(G).text(text, 50, y, { width: 512 });
        y = doc.y + 6;
      };
      const bullet = (text: string) => {
        doc.font("Helvetica").fontSize(10).fillColor("#1f2937").text(`  \u2022  ${text}`, 50, y, { width: 500, lineGap: 2 });
        y = doc.y + 4;
      };

      body(`This Independent Contractor Agreement ("Agreement") is entered into as of ${today}, by and between:`);
      body(`Company: Tri State Enterprise LLC ("Company")\nFlatwoods, KY | (606) 836-2534 | tse@tristateenterprise.com`);
      body(`Contractor: ${name}\nEmail: ${email}${phone ? ` | Phone: ${phone}` : ""}`);

      heading("1. ENGAGEMENT & RELATIONSHIP");
      body("The Company engages the Contractor as an independent contractor, and not as an employee. The Contractor acknowledges that they are not entitled to employee benefits including but not limited to health insurance, retirement plans, paid vacation, or workers' compensation insurance.");

      heading("2. SERVICES");
      body("The Contractor agrees to perform residential and/or commercial cleaning services as assigned through the Company's platform. Services include but are not limited to: standard maintenance cleaning, deep cleaning, move-in/move-out cleaning, and commercial space cleaning using eco-friendly, organic products provided by the Company.");

      heading("3. COMPENSATION");
      body("The Contractor will be compensated at the rate agreed upon at the time of engagement. Payment will be processed through the Company's designated payment platform (Stripe Connect or direct deposit). The Contractor is responsible for all self-employment taxes, including but not limited to federal income tax, Social Security, and Medicare taxes.");

      heading("4. SCHEDULE & AVAILABILITY");
      body("The Contractor maintains the right to set their own schedule and availability. The Contractor is not required to accept any job assignment. The Contractor may work for other companies or clients simultaneously.");

      heading("5. TOOLS & SUPPLIES");
      body("The Company will provide eco-friendly cleaning products and supplies for use during services. The Contractor is responsible for providing their own transportation to and from job sites.");

      heading("6. CONDUCT & STANDARDS");
      body("While performing services, the Contractor agrees to:");
      bullet("Maintain professional conduct and appearance at all times");
      bullet("Follow the Company's cleaning procedures and quality standards");
      bullet("Treat client property with care and respect");
      bullet("Report any damages or incidents immediately");
      bullet("Comply with the Company's Drug-Free Workplace Policy");
      bullet("Maintain confidentiality of client information");

      heading("7. INSURANCE & LIABILITY");
      body("The Company maintains general liability insurance for services performed under this Agreement. The Contractor acknowledges responsibility for their own health insurance and personal liability coverage.");

      heading("8. TERMINATION");
      body("Either party may terminate this Agreement at any time, with or without cause, by providing written notice. Upon termination, the Contractor will be compensated for all completed services.");

      heading("9. NON-COMPETE & NON-SOLICITATION");
      body("During the term of this Agreement and for a period of twelve (12) months following termination, the Contractor agrees not to directly solicit clients of the Company for cleaning services outside of the Company's platform.");

      heading("10. TAX OBLIGATIONS");
      body("The Contractor understands that as an independent contractor, they will receive a Form 1099-NEC for annual compensation of $600 or more. The Contractor is solely responsible for filing and paying all applicable taxes. The Company will not withhold any taxes from payments to the Contractor.");

      // Signature section
      if (y > 600) doc.addPage();
      y = Math.max(y + 16, doc.y + 16);

      doc.moveTo(50, y).lineTo(562, y).lineWidth(0.5).stroke("#e5e7eb");
      y += 16;

      doc.font("Helvetica-Bold").fontSize(10).fillColor(G).text("ACKNOWLEDGMENT & SIGNATURE", 50, y);
      y += 20;
      body("By signing below, both parties agree to the terms and conditions outlined in this Agreement.");

      y += 12;
      doc.font("Helvetica").fontSize(9).fillColor("#6b7280");
      doc.text("Contractor Signature:", 50, y);
      doc.moveTo(170, y + 12).lineTo(350, y + 12).stroke("#000000");
      doc.text("Date:", 370, y);
      doc.moveTo(400, y + 12).lineTo(540, y + 12).stroke("#000000");

      y += 30;
      doc.text("Company Representative:", 50, y);
      doc.moveTo(190, y + 12).lineTo(350, y + 12).stroke("#000000");
      doc.text("Date:", 370, y);
      doc.moveTo(400, y + 12).lineTo(540, y + 12).stroke("#000000");

      // Footer
      doc.font("Helvetica").fontSize(7).fillColor("#9ca3af");
      doc.text("Tri State Enterprise LLC | Flatwoods, KY | This document is legally binding upon signature by both parties.", 50, 740, { align: "center", width: 512 });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
