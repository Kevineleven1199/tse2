import { NextResponse } from "next/server";
import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/documents/drug-free-policy
 * Generates a personalized Drug-Free Workplace Policy PDF
 */
export async function GET() {
  try {
    const session = await requireSession();
    if (!["CLEANER", "HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { firstName: true, lastName: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const name = `${user.firstName} ${user.lastName}`;
    const pdf = await generateDrugFreePolicyPDF(name, user.email);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="drug-free-workplace-policy.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("[drug-free-policy] Error:", error);
    if (error?.digest?.startsWith?.("NEXT_REDIRECT")) throw error;
    return NextResponse.json({ error: "Failed to generate document" }, { status: 500 });
  }
}

async function generateDrugFreePolicyPDF(name: string, email: string): Promise<Buffer> {
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
      doc.font("Helvetica").fontSize(9).text("Drug-Free Workplace Policy", 50, 42);

      let y = 90;
      const body = (text: string) => {
        doc.font("Helvetica").fontSize(10).fillColor("#1f2937").text(text, 50, y, { width: 512, lineGap: 3 });
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

      heading("POLICY STATEMENT");
      body("Tri State Enterprise LLC is committed to providing a safe, healthy, and productive work environment for all team members, clients, and the community. The use of illegal drugs, the misuse of prescription medications, and the abuse of alcohol are strictly prohibited while performing services on behalf of the Company.");

      heading("1. SCOPE");
      body("This policy applies to all independent contractors, employees, and team members who perform services for Tri State Enterprise, regardless of their location or assignment. This includes all time spent on company business, on client properties, during travel to job sites, and at any company-sponsored events.");

      heading("2. PROHIBITED CONDUCT");
      body("The following conduct is strictly prohibited:");
      bullet("Using, possessing, selling, distributing, or being under the influence of illegal drugs or controlled substances while performing services");
      bullet("Using or being under the influence of alcohol while performing services or on client property");
      bullet("Misusing prescription medications in a manner that impairs the ability to safely perform job duties");
      bullet("Using any substance that impairs judgment, coordination, or the ability to safely perform cleaning services");
      bullet("Refusing to submit to a drug or alcohol test when requested under the terms of this policy");

      heading("3. PRESCRIPTION & OVER-THE-COUNTER MEDICATIONS");
      body("Team members who are taking prescription or over-the-counter medications that may impair their ability to safely perform their duties must notify the Company before reporting to a job site. The Company will work with the team member to determine if accommodations can be made.");

      heading("4. TESTING");
      body("The Company reserves the right to require drug and/or alcohol testing under the following circumstances:");
      bullet("Pre-engagement testing: Prior to beginning services as a contractor");
      bullet("Reasonable suspicion: When there is reasonable belief that a team member is under the influence");
      bullet("Post-incident: Following any workplace accident, injury, or property damage");
      bullet("Random testing: Periodic unannounced testing may be conducted");

      heading("5. CONSEQUENCES OF VIOLATION");
      body("Any team member found to be in violation of this policy will be subject to immediate action, which may include:");
      bullet("Immediate removal from the job site");
      bullet("Suspension of access to the Company's job platform");
      bullet("Termination of the contractor relationship");
      bullet("Reporting to appropriate law enforcement authorities if illegal activity is involved");

      heading("6. CONFIDENTIALITY");
      body("All drug and alcohol test results will be treated as confidential information. Results will only be shared with those who have a legitimate need to know, in accordance with applicable federal and state laws.");

      heading("7. RESOURCES & SUPPORT");
      body("The Company encourages any team member struggling with substance use to seek help. Information about available resources, including SAMHSA's National Helpline (1-800-662-4357), is available upon request. Voluntarily seeking assistance before a policy violation will not result in disciplinary action.");

      heading("8. FLORIDA STATE COMPLIANCE");
      body("This policy complies with the Kentucky Drug-Free Workplace Act (Section 440.102, Kentucky Statutes). Team members acknowledge that the Company may qualify for workers' compensation premium discounts by maintaining a drug-free workplace program.");

      // Signature section
      if (y > 580) doc.addPage();
      y = Math.max(y + 16, doc.y + 16);

      doc.moveTo(50, y).lineTo(562, y).lineWidth(0.5).stroke("#e5e7eb");
      y += 16;

      doc.font("Helvetica-Bold").fontSize(10).fillColor(G).text("ACKNOWLEDGMENT", 50, y);
      y += 16;
      body(`I, ${name} (${email}), acknowledge that I have read, understand, and agree to comply with the Drug-Free Workplace Policy of Tri State Enterprise LLC. I understand that violation of this policy may result in immediate termination of my contractor relationship.`);

      y += 12;
      doc.font("Helvetica").fontSize(9).fillColor("#6b7280");
      doc.text("Signature:", 50, y);
      doc.moveTo(120, y + 12).lineTo(350, y + 12).stroke("#000000");
      doc.text("Date:", 370, y);
      doc.moveTo(400, y + 12).lineTo(540, y + 12).stroke("#000000");

      y += 30;
      doc.text(`Printed Name: ${name}`, 50, y);

      // Footer
      doc.font("Helvetica").fontSize(7).fillColor("#9ca3af");
      doc.text(`Tri State Enterprise LLC | Flatwoods, KY | Document generated: ${today}`, 50, 740, { align: "center", width: 512 });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
