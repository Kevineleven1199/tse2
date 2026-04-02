import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * CRON: Sync Google reviews for all tenants
 * Can be triggered by Railway cron jobs or external scheduler
 */
export const POST = async (request: Request) => {
  try {
    // Verify cron secret if provided
    const cronSecret = request.headers.get("x-cron-secret");
    if (cronSecret && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Google reviews sync is currently not configured
    return NextResponse.json({
      success: true,
      message: "Google reviews sync not configured"
    });
  } catch (err) {
    console.error("POST /api/cron/google-reviews error:", err);
    return NextResponse.json(
      { error: "Failed to sync reviews" },
      { status: 500 }
    );
  }
};
