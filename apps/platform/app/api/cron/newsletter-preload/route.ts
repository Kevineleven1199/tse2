import { NextResponse } from "next/server";
import { previewUpcoming } from "@/src/lib/newsletter/generator";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const days = 90;
    const previews = previewUpcoming(days);

    // Check for duplicate subjects in the 90-day window
    const subjectMap = new Map<string, string[]>();
    for (const p of previews) {
      const key = p.subject.toLowerCase().trim();
      const dateStr = p.date.toISOString().split("T")[0];
      if (!subjectMap.has(key)) {
        subjectMap.set(key, []);
      }
      subjectMap.get(key)!.push(dateStr);
    }

    const duplicates = Array.from(subjectMap.entries())
      .filter(([, dates]) => dates.length > 1)
      .map(([subject, dates]) => ({ subject, dates, count: dates.length }));

    if (duplicates.length > 0) {
      console.warn(
        `[newsletter-preload] Found ${duplicates.length} duplicate subjects in ${days}-day window:`,
        duplicates.map((d) => `"${d.subject}" on ${d.dates.join(", ")}`).join("; ")
      );
    }

    return NextResponse.json({
      success: true,
      totalDays: days,
      uniqueSubjects: subjectMap.size,
      duplicateSubjects: duplicates.length,
      duplicates,
      preview: previews.map((p) => ({
        date: p.date.toISOString().split("T")[0],
        subject: p.subject,
        source: p.source,
      })),
    });
  } catch (error) {
    console.error("[newsletter-preload] Failed:", error);
    return NextResponse.json(
      { error: "Failed to generate newsletter preview" },
      { status: 500 }
    );
  }
}
