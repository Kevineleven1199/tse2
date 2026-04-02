import { NextResponse } from "next/server";
import { processReviewRequests } from "@/src/lib/review-automation";

export const dynamic = "force-dynamic";

// This endpoint should be called by a cron job (e.g., Railway cron, Vercel cron)
// Recommended schedule: Daily at 2:00 PM local time

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await processReviewRequests();

    return NextResponse.json({
      success: true,
      processed: count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron/review-requests] Failed to send review requests", error);
    return NextResponse.json(
      { error: "Failed to send review requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // Also support POST for flexibility
  return GET(request);
}
