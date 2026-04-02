import { NextResponse } from "next/server";
import { sendAppointmentReminders } from "@/lib/automation-engine";

export const dynamic = "force-dynamic";

// This endpoint should be called by a cron job (e.g., Railway cron, Vercel cron)
// Recommended schedule: Daily at 10:00 AM local time

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const remindersSent = await sendAppointmentReminders();

    return NextResponse.json({
      success: true,
      remindersSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron/reminders] Failed to send reminders", error);
    return NextResponse.json(
      { error: "Failed to send reminders" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // Also support POST for flexibility
  return GET(request);
}
