import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

// ─── Shared auth using canonical env var names ───

const getAuthClient = () => {
  // Support both old and new env var names for backwards compatibility
  const clientEmail =
    process.env.GOOGLE_CALENDAR_CLIENT_EMAIL ??
    process.env.GOOGLE_SERVICE_ACCOUNT;

  const privateKey = (
    process.env.GOOGLE_CALENDAR_PRIVATE_KEY ??
    process.env.GOOGLE_SERVICE_KEY ??
    ""
  ).replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    console.warn("[calendar] Missing Google service account credentials.");
    return null;
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar"]
  });
};

const getCalendarId = () => process.env.GOOGLE_CALENDAR_ID ?? "primary";
const calendar = google.calendar("v3");

// ─── Functions used by lib/notifications.ts ───

type CalendarEventInput = {
  tenantId: string;
  jobId: string;
  title: string;
  start: Date;
  end: Date;
  customerEmail: string;
  cleanerEmails: string[];
  description?: string;
};

export const scheduleGoogleCalendarEvent = async (input: CalendarEventInput) => {
  const auth = getAuthClient();
  if (!auth) {
    console.warn("[calendar] Skipping calendar sync — credentials missing.");
    return { status: "skipped" } as const;
  }

  try {
    const calendarId = getCalendarId();
    const attendees = [
      { email: input.customerEmail },
      ...input.cleanerEmails.map((email) => ({ email }))
    ];
    const eventBody = {
      summary: input.title,
      description: input.description ?? "Scheduled via TriStateOS",
      start: { dateTime: input.start.toISOString() },
      end: { dateTime: input.end.toISOString() },
      attendees,
      status: "confirmed" as const
    };

    // Check if a CalendarEvent already exists for this job (reschedule case)
    const existingCalEvent = await prisma.calendarEvent.findUnique({
      where: { jobId: input.jobId }
    });

    let externalId: string;

    if (existingCalEvent?.externalId) {
      // Update existing Google Calendar event instead of creating duplicate
      const response = await calendar.events.patch({
        auth,
        calendarId,
        eventId: existingCalEvent.externalId,
        requestBody: eventBody,
        sendUpdates: "all"
      });
      externalId = response.data.id || existingCalEvent.externalId;

      await prisma.calendarEvent.update({
        where: { id: existingCalEvent.id },
        data: { status: "confirmed", updatedAt: new Date() }
      });

      console.info("[calendar] Updated existing event:", externalId);
    } else {
      // Create new Google Calendar event
      const response = await calendar.events.insert({
        auth,
        calendarId,
        requestBody: eventBody,
        sendUpdates: "all"
      });
      externalId = response.data.id || "";

      // Save to CalendarEvent table for future updates
      await prisma.calendarEvent.upsert({
        where: { jobId: input.jobId },
        create: {
          jobId: input.jobId,
          provider: "google",
          externalId,
          status: "confirmed"
        },
        update: {
          externalId,
          status: "confirmed"
        }
      });

      console.info("[calendar] Created new event:", externalId);
    }

    await prisma.notification.create({
      data: {
        tenantId: input.tenantId,
        jobId: input.jobId,
        channel: "calendar",
        payload: {
          provider: "google",
          externalId,
          start: input.start,
          end: input.end
        }
      }
    });

    return { status: "scheduled" } as const;
  } catch (error) {
    console.error("[calendar] Failed to create/update event:", error);
    return { status: "error" } as const;
  }
};

export const scheduleAppleCalendarPlaceholder = async (input: CalendarEventInput) => {
  console.info("[calendar] Apple calendar sync placeholder", input.jobId);
  try {
    await prisma.notification.create({
      data: {
        tenantId: input.tenantId,
        jobId: input.jobId,
        channel: "calendar",
        payload: {
          provider: "apple",
          start: input.start,
          end: input.end
        }
      }
    });
  } catch (error) {
    console.error("[calendar] Apple placeholder notification failed:", error);
  }
  return { status: "pending" } as const;
};

// ─── Functions used by scheduling workflows ───

type TentativeEventInput = {
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  attendees?: Array<{ email: string; displayName?: string }>;
  jobId: string;
};

export const createTentativeCalendarEvent = async ({
  summary,
  description,
  location,
  start,
  end,
  attendees,
  jobId
}: TentativeEventInput) => {
  const auth = getAuthClient();
  if (!auth) return null;

  try {
    const response = await calendar.events.insert({
      auth,
      calendarId: getCalendarId(),
      requestBody: {
        summary,
        description,
        location,
        start: { dateTime: start },
        end: { dateTime: end },
        attendees,
        status: "tentative",
        extendedProperties: {
          private: { jobId }
        }
      },
      sendUpdates: "all"
    });

    return response.data;
  } catch (error) {
    console.error("[calendar] Failed to create tentative event:", error);
    return null;
  }
};

export const updateCalendarEventStatus = async (
  eventId: string,
  status: "confirmed" | "cancelled"
) => {
  const auth = getAuthClient();
  if (!auth) return null;

  try {
    if (status === "cancelled") {
      await calendar.events.delete({
        auth,
        calendarId: getCalendarId(),
        eventId,
        sendUpdates: "all"
      });
      return;
    }

    const response = await calendar.events.patch({
      auth,
      calendarId: getCalendarId(),
      eventId,
      requestBody: { status: "confirmed" },
      sendUpdates: "all"
    });

    return response.data;
  } catch (error) {
    console.error("[calendar] Failed to update event:", error);
    return null;
  }
};
