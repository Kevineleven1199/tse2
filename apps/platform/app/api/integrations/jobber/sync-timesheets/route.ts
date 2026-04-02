import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { syncJobberTimesheets, isJobberConnected } from "@/lib/jobber";

export const dynamic = "force-dynamic";

/**
 * POST /api/integrations/jobber/sync-timesheets
 * Manually trigger a sync of Jobber time entries into local Timesheet records.
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

    const synced = await syncJobberTimesheets(session.tenantId);

    return NextResponse.json({
      success: true,
      timesheetsSynced: synced,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[jobber/sync-timesheets] Sync failed:", error);
    return NextResponse.json(
      { error: "Failed to sync Jobber timesheets" },
      { status: 500 }
    );
  }
}
