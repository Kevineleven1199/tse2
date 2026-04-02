import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = async () => {
  try {
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const clientEmail =
      process.env.GOOGLE_CALENDAR_CLIENT_EMAIL ??
      process.env.GOOGLE_SERVICE_ACCOUNT;

    const privateKey = (
      process.env.GOOGLE_CALENDAR_PRIVATE_KEY ??
      process.env.GOOGLE_SERVICE_KEY ??
      ""
    ).replace(/\\n/g, "\n");

    const calendarId = process.env.GOOGLE_CALENDAR_ID ?? "primary";

    // Check if credentials are configured
    if (!clientEmail || !privateKey) {
      return NextResponse.json({
        connected: false,
        calendarId: null,
        error: "Google Calendar credentials not configured. Set GOOGLE_SERVICE_ACCOUNT and GOOGLE_SERVICE_KEY environment variables."
      });
    }

    // Try a lightweight API call to verify connectivity
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/calendar"]
    });

    const calendar = google.calendar("v3");
    await calendar.calendarList.list({ auth, maxResults: 1 });

    return NextResponse.json({
      connected: true,
      calendarId,
      serviceAccount: clientEmail
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[calendar-status] Connectivity check failed:", message);
    return NextResponse.json({
      connected: false,
      calendarId: null,
      error: `Google Calendar connection failed: ${message}`
    });
  }
};
