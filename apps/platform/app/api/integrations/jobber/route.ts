import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import {
  getJobberAuthUrl,
  exchangeJobberCode,
  syncJobberClients,
  isJobberConnected,
} from "@/lib/jobber";

export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/jobber
 * Returns Jobber connection status and OAuth URL.
 * Also handles OAuth callback with ?code= parameter.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const callbackCode = searchParams.get("code");
  const state = searchParams.get("state");

  // Handle OAuth callback redirect from Jobber
  if (callbackCode) {
    const session = await getSession();
    if (!session || session.role !== "HQ") {
      return NextResponse.redirect(
        new URL("/login", request.url)
      );
    }

    try {
      await exchangeJobberCode(callbackCode, session.tenantId);
      // Trigger initial client sync
      const synced = await syncJobberClients(session.tenantId);
      console.log(`[jobber] OAuth complete. Synced ${synced} clients.`);
      // Redirect to integrations page with success
      return NextResponse.redirect(
        new URL("/admin/integrations?jobber=connected&synced=" + synced, request.url)
      );
    } catch (error) {
      console.error("[jobber] OAuth callback failed:", error);
      return NextResponse.redirect(
        new URL("/admin/integrations?jobber=error", request.url)
      );
    }
  }

  // Normal status check
  const session = await getSession();
  if (!session || session.role !== "HQ") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let connected = false;
  try {
    connected = await isJobberConnected(session.tenantId);
  } catch (error) {
    console.error("[jobber] Failed to check connection status:", error);
    return NextResponse.json({ error: "Failed to check Jobber status" }, { status: 500 });
  }

  let authUrl: string | null = null;
  let missingEnv: string[] = [];

  if (!connected) {
    // Check env vars before trying to generate URL
    if (!process.env.JOBBER_CLIENT_ID) missingEnv.push("JOBBER_CLIENT_ID");
    if (!process.env.JOBBER_CLIENT_SECRET) missingEnv.push("JOBBER_CLIENT_SECRET");
    if (!process.env.JOBBER_REDIRECT_URI) missingEnv.push("JOBBER_REDIRECT_URI");

    if (missingEnv.length > 0) {
      return NextResponse.json({
        connected: false,
        authUrl: null,
        error: `Missing environment variables: ${missingEnv.join(", ")}. Set these in Railway.`,
        missingEnv,
      });
    }

    try {
      authUrl = getJobberAuthUrl(session.tenantId);
    } catch (error) {
      console.error("[jobber] Failed to generate auth URL:", error);
      return NextResponse.json({
        connected: false,
        authUrl: null,
        error: error instanceof Error ? error.message : "Failed to generate auth URL",
      });
    }
  }

  return NextResponse.json({ connected, authUrl });
}

/**
 * POST /api/integrations/jobber
 * Handles OAuth code exchange and manual sync triggers.
 * Body: { code: string } or { action: "sync" } or { action: "disconnect" }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "HQ") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // OAuth code exchange (for programmatic use)
  if (body.code && typeof body.code === "string") {
    try {
      await exchangeJobberCode(body.code, session.tenantId);
      const synced = await syncJobberClients(session.tenantId);
      return NextResponse.json({ connected: true, clientsSynced: synced });
    } catch (error) {
      console.error("[jobber] OAuth exchange failed:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to connect Jobber" },
        { status: 500 }
      );
    }
  }

  // Manual sync trigger
  if (body.action === "sync") {
    try {
      const synced = await syncJobberClients(session.tenantId);
      return NextResponse.json({ synced });
    } catch (error) {
      console.error("[jobber] Sync failed:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Sync failed" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
