import { NextResponse } from "next/server";
import { generateNewsletter, previewUpcoming } from "@/src/lib/newsletter/generator";

export const dynamic = "force-dynamic";

/**
 * GET /api/newsletter/preview
 *
 * Preview the newsletter for today or a specific date.
 *
 * Query params:
 *   ?date=2025-02-14   — specific date
 *   ?days=7            — preview next N days (returns summary)
 *   ?format=html       — return raw HTML (default: JSON)
 */
export const GET = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const daysParam = searchParams.get("days");
    const format = searchParams.get("format");

    // Preview next N days
    if (daysParam) {
      const days = Math.min(parseInt(daysParam) || 7, 90);
      const previews = previewUpcoming(days);

      return NextResponse.json({
        count: previews.length,
        newsletters: previews.map((n) => ({
          date: n.date.toISOString().split("T")[0],
          subject: n.subject,
          preview: n.preview,
          source: n.source,
          dayOfWeek: n.date.toLocaleDateString("en-US", { weekday: "long" }),
        })),
      });
    }

    // Single day preview
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const newsletter = generateNewsletter(targetDate);

    // Return raw HTML if requested
    if (format === "html") {
      return new Response(newsletter.html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return NextResponse.json({
      date: newsletter.date.toISOString().split("T")[0],
      subject: newsletter.subject,
      preview: newsletter.preview,
      source: newsletter.source,
      html: newsletter.html,
      textLength: newsletter.text.length,
    });
  } catch (error) {
    console.error("[newsletter-preview] Error:", error);
    return NextResponse.json(
      { error: "Preview generation failed" },
      { status: 500 }
    );
  }
};
