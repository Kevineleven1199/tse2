import { NextResponse } from "next/server";
import {
  getJobberConnectedTenants,
  syncJobberClients,
  syncJobberEstimates,
  syncJobberTimesheets,
} from "@/lib/jobber";
import { dispatchClockAlert } from "@/src/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/jobber-sync
 * Cron-triggered endpoint that syncs all Jobber data (clients, estimates, timesheets)
 * for every tenant with an active Jobber connection.
 *
 * Recommended schedule: Every 6 hours (Railway cron or external scheduler).
 * Secured via CRON_SECRET bearer token.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenantIds = await getJobberConnectedTenants();

    if (tenantIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No tenants with active Jobber connections",
        timestamp: new Date().toISOString(),
      });
    }

    const results: {
      tenantId: string;
      clientsSynced: number;
      estimatesSynced: number;
      timesheetsSynced: number;
      error?: string;
    }[] = [];

    for (const tenantId of tenantIds) {
      try {
        const [clientsSynced, estimatesSynced, timesheetResult] =
          await Promise.all([
            syncJobberClients(tenantId),
            syncJobberEstimates(tenantId),
            syncJobberTimesheets(tenantId),
          ]);

        const timesheetsSynced = timesheetResult.synced;

        // Fire clock-in/out alerts for newly synced timesheets
        for (const event of timesheetResult.events) {
          try {
            await dispatchClockAlert({
              tenantId,
              cleanerName: event.cleanerName,
              eventType: event.eventType,
              jobInfo: event.note ?? undefined,
              timestamp: event.timestamp,
              hoursWorked: event.hoursWorked ?? undefined,
            });
          } catch (alertErr) {
            console.error(`[cron/jobber-sync] Alert dispatch failed:`, alertErr);
          }
        }

        results.push({
          tenantId,
          clientsSynced,
          estimatesSynced,
          timesheetsSynced,
        });
      } catch (error) {
        console.error(
          `[cron/jobber-sync] Failed for tenant ${tenantId}:`,
          error
        );
        results.push({
          tenantId,
          clientsSynced: 0,
          estimatesSynced: 0,
          timesheetsSynced: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const totalClients = results.reduce((s, r) => s + r.clientsSynced, 0);
    const totalEstimates = results.reduce((s, r) => s + r.estimatesSynced, 0);
    const totalTimesheets = results.reduce(
      (s, r) => s + r.timesheetsSynced,
      0
    );
    const failures = results.filter((r) => r.error).length;

    return NextResponse.json({
      success: true,
      tenantsProcessed: tenantIds.length,
      totalClientsSynced: totalClients,
      totalEstimatesSynced: totalEstimates,
      totalTimesheetsSynced: totalTimesheets,
      failures,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron/jobber-sync] Cron job failed:", error);
    return NextResponse.json(
      { error: "Jobber sync cron failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
