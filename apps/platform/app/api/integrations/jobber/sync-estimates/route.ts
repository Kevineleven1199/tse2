import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { syncJobberEstimates, isJobberConnected } from "@/lib/jobber";

export const dynamic = "force-dynamic";

/**
 * POST /api/integrations/jobber/sync-estimates
 * Manually trigger a sync of Jobber estimates/quotes into local Jobs.
 * Requires HQ role and an active Jobber connection.
 */
export async function POST() {
  const session = await getSession();
  if (!session || !["HQ", "MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const connected = await isJobberConnected(session.tenantId);
    if (!connected) {
      return NextResponse.json(
        { error: "Jobber is not connected. Please connect Jobber first." },
        { status: 400 }
      );
    }

    const synced = await syncJobberEstimates(session.tenantId);

    return NextResponse.json({
      success: true,
      estimatesSynced: synced,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[jobber/sync-estimates] Sync failed:", error);
    return NextResponse.json(
      { error: "Failed to sync Jobber estimates" },
      { status: 500 }
    );
  }
}
