import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

/**
 * GET /api/scheduling/availability?date=YYYY-MM-DD
 * Returns available time slots for a given date by checking Google Calendar freebusy
 * Public endpoint — customers use this to self-schedule
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");

  if (!dateStr) {
    return NextResponse.json({ error: "date parameter required (YYYY-MM-DD)" }, { status: 400 });
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  // Don't allow scheduling in the past or more than 60 days out
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const maxDate = new Date(now);
  maxDate.setDate(maxDate.getDate() + 60);

  if (date < now) {
    return NextResponse.json({ error: "Cannot schedule in the past" }, { status: 400 });
  }
  if (date > maxDate) {
    return NextResponse.json({ error: "Cannot schedule more than 60 days out" }, { status: 400 });
  }

  // Check if it's a weekend (no service on Sundays)
  if (date.getDay() === 0) {
    return NextResponse.json({ slots: [], message: "We don't offer service on Sundays" });
  }

  // Define business hours slots (Eastern Time)
  const ALL_SLOTS = [
    { id: "8am", label: "8:00 AM – 10:00 AM", start: 8, end: 10 },
    { id: "10am", label: "10:00 AM – 12:00 PM", start: 10, end: 12 },
    { id: "12pm", label: "12:00 PM – 2:00 PM", start: 12, end: 14 },
    { id: "2pm", label: "2:00 PM – 4:00 PM", start: 14, end: 16 },
  ];

  // Saturday: limited hours
  const slots = date.getDay() === 6
    ? ALL_SLOTS.filter((s) => s.start < 14) // 8am-2pm on Saturday
    : ALL_SLOTS;

  // Try to check Google Calendar for busy times
  try {
    const keyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    if (keyBase64 && calendarId) {
      const key = JSON.parse(Buffer.from(keyBase64, "base64").toString("utf8"));
      const auth = new google.auth.GoogleAuth({
        credentials: key,
        scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
      });

      const calendar = google.calendar({ version: "v3", auth });

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const freeBusy = await calendar.freebusy.query({
        requestBody: {
          timeMin: dayStart.toISOString(),
          timeMax: dayEnd.toISOString(),
          items: [{ id: calendarId }],
        },
      });

      const busyPeriods = freeBusy.data.calendars?.[calendarId]?.busy ?? [];

      // Filter out slots that overlap with busy periods
      const availableSlots = slots.map((slot) => {
        const slotStart = new Date(date);
        slotStart.setHours(slot.start, 0, 0, 0);
        const slotEnd = new Date(date);
        slotEnd.setHours(slot.end, 0, 0, 0);

        const isBusy = busyPeriods.some((busy) => {
          const busyStart = new Date(busy.start!);
          const busyEnd = new Date(busy.end!);
          return busyStart < slotEnd && busyEnd > slotStart;
        });

        return { ...slot, available: !isBusy };
      });

      return NextResponse.json({
        date: dateStr,
        slots: availableSlots,
        source: "google-calendar",
      });
    }
  } catch (error) {
    console.warn("[scheduling] Google Calendar check failed, returning all slots:", error);
  }

  // Fallback: return all slots as available (no Calendar configured)
  return NextResponse.json({
    date: dateStr,
    slots: slots.map((s) => ({ ...s, available: true })),
    source: "default",
  });
}
