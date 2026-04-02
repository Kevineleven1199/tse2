export type CalendarJob = {
  id: string;
  date: string;                // YYYY-MM-DD
  customer: string;
  customerId?: string;          // ID for linking to customer detail page
  cleaner: string;
  cleanerId?: string;
  service: string;
  status: string;
  startTime: string;           // human-readable e.g. "09:00 AM"
  endTime: string;
  scheduledStartISO: string;   // raw ISO for positioning
  scheduledEndISO: string;
  address?: string;
  notes?: string;
  payoutAmount?: number;
};

export type ViewMode = "month" | "week" | "day";
