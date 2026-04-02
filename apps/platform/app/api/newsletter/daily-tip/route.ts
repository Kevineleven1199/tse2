import { NextResponse } from "next/server";
import { generateNewsletter } from "@/src/lib/newsletter/generator";

/**
 * GET /api/newsletter/daily-tip
 *
 * Returns today's cleaning tip as JSON — useful for:
 * - Homepage widget
 * - Social media auto-posting
 * - Mobile app integration
 * - Third-party integrations
 *
 * No auth required (public endpoint for content consumption).
 */
export const dynamic = "force-dynamic";

export const GET = async () => {
  try {
    const newsletter = generateNewsletter(new Date());

    // Extract the tip from the newsletter (if it has one)
    // The newsletter HTML contains the tip embedded, but we also
    // parse the text version for a clean extraction
    const tipMatch = newsletter.text.match(/Tip[:\s]*(.+?)(?:\n|$)/i);

    return NextResponse.json({
      date: new Date().toISOString().split("T")[0],
      subject: newsletter.subject,
      preview: newsletter.preview,
      source: newsletter.source,
      // Provide content in multiple formats for different consumers
      tip: tipMatch?.[1]?.trim() || newsletter.preview,
      fullText: newsletter.text.slice(0, 500),
    });
  } catch (error) {
    console.error("[daily-tip] Error:", error);
    return NextResponse.json({ error: "Failed to get daily tip" }, { status: 500 });
  }
};
