// Re-export from canonical location — all calendar logic lives in src/lib/calendar.ts
export {
  scheduleGoogleCalendarEvent,
  scheduleAppleCalendarPlaceholder,
  createTentativeCalendarEvent,
  updateCalendarEventStatus
} from "@/src/lib/calendar";
