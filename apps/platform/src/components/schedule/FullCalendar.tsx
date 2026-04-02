"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  format,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, LayoutGrid, Columns, Rows, Plus, Filter, Users, CheckCircle2, Briefcase } from "lucide-react";
import { CalendarWidget } from "./CalendarWidget";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import { ScheduleJobModal } from "./ScheduleJobModal";
import type { CalendarJob, ViewMode } from "./types";

type Props = {
  initialJobs: CalendarJob[];
};

type FilterState = {
  status?: string;
  cleaner?: string;
  service?: string;
};

// Transform API response to CalendarJob format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCalendarJob(raw: any): CalendarJob {
  const startISO = raw.scheduledStartISO || raw.scheduledStart || "";
  const endISO = raw.scheduledEndISO || raw.scheduledEnd || "";
  const startDate = startISO ? new Date(startISO) : new Date();
  const endDate = endISO ? new Date(endISO) : new Date();

  return {
    id: raw.id,
    date: raw.date || startDate.toISOString().split("T")[0],
    customer: raw.customer || raw.customerName || "Unknown",
    customerId: raw.customerId, // Pass through customer ID for linking
    cleaner: raw.cleaner || "Unassigned",
    cleanerId: raw.cleanerId,
    service: raw.service || "",
    status: raw.status || "PENDING",
    startTime:
      raw.startTime ||
      startDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    endTime:
      raw.endTime ||
      endDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    scheduledStartISO: startISO,
    scheduledEndISO: endISO,
    address: raw.address,
    notes: raw.notes,
    payoutAmount: raw.payoutAmount,
  };
}

const VIEW_TABS: { key: ViewMode; label: string; icon: typeof Calendar }[] = [
  { key: "month", label: "Month", icon: LayoutGrid },
  { key: "week", label: "Week", icon: Columns },
  { key: "day", label: "Day", icon: Rows },
];

export const FullCalendar = ({ initialJobs }: Props) => {
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [jobs, setJobs] = useState<CalendarJob[]>(initialJobs);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>({});
  const [showFilters, setShowFilters] = useState(false);

  // Scheduling modal state
  const [scheduleModal, setScheduleModal] = useState<{
    open: boolean;
    jobId?: string;
    jobCustomer?: string;
    jobService?: string;
    date?: string;
    hour?: number;
  }>({ open: false });

  // Job detail panel state
  const [selectedJob, setSelectedJob] = useState<CalendarJob | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view, currentDate]);

  // Fetch jobs for visible date range
  const fetchJobs = useCallback(async (date: Date, viewMode: ViewMode) => {
    setLoading(true);
    try {
      let start: string;
      let end: string;

      if (viewMode === "month") {
        const first = new Date(date.getFullYear(), date.getMonth(), 1);
        const last = new Date(date.getFullYear(), date.getMonth() + 2, 0);
        start = format(first, "yyyy-MM-dd");
        end = format(last, "yyyy-MM-dd");
      } else if (viewMode === "week") {
        const ws = startOfWeek(date, { weekStartsOn: 0 });
        const we = endOfWeek(date, { weekStartsOn: 0 });
        start = format(ws, "yyyy-MM-dd");
        end = format(we, "yyyy-MM-dd");
      } else {
        start = format(date, "yyyy-MM-dd");
        end = format(date, "yyyy-MM-dd");
      }

      const res = await fetch(`/api/admin/schedule?start=${start}&end=${end}`);
      if (!res.ok) return;
      const data = await res.json();

      if (Array.isArray(data)) {
        setJobs(data.map(toCalendarJob));
      }
    } catch {
      // keep existing jobs on error
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch when date or view changes
  useEffect(() => {
    fetchJobs(currentDate, view);
  }, [currentDate, view, fetchJobs]);

  // Navigation helpers
  const goToday = () => setCurrentDate(new Date());

  const goPrev = useCallback(() => {
    if (view === "month") {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
      );
    } else if (view === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subDays(currentDate, 1));
    }
  }, [view, currentDate]);

  const goNext = useCallback(() => {
    if (view === "month") {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
      );
    } else if (view === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  }, [view, currentDate]);

  // Header label
  const headerLabel = useMemo(() => {
    if (view === "month") {
      return format(currentDate, "MMMM yyyy");
    } else if (view === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
      const we = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
    } else {
      return format(currentDate, "EEEE, MMMM d, yyyy");
    }
  }, [currentDate, view]);

  // Handlers
  const handleSlotClick = (date: Date, hour: number) => {
    setScheduleModal({
      open: true,
      date: format(date, "yyyy-MM-dd"),
      hour,
    });
  };

  const handleJobClick = (job: CalendarJob) => {
    setSelectedJob(job);
  };

  const handleMonthDateSelect = (dateStr: string) => {
    setCurrentDate(new Date(dateStr + "T12:00:00"));
    setView("day");
  };

  const handleScheduled = () => {
    fetchJobs(currentDate, view);
    setScheduleModal({ open: false });
  };

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (filters.status && job.status !== filters.status) return false;
      if (filters.cleaner && job.cleaner !== filters.cleaner) return false;
      if (filters.service && job.service !== filters.service) return false;
      return true;
    });
  }, [jobs, filters]);

  // Get unique values for filters
  const uniqueCleaners = useMemo(() => [...new Set(jobs.map((j) => j.cleaner))], [jobs]);
  const uniqueServices = useMemo(() => [...new Set(jobs.map((j) => j.service))], [jobs]);
  const uniqueStatuses = useMemo(() => [...new Set(jobs.map((j) => j.status))], [jobs]);

  // Job counts
  const jobCount = filteredJobs.length;
  const todayJobs = filteredJobs.filter((j) => {
    const today = format(new Date(), "yyyy-MM-dd");
    return j.date === today;
  }).length;

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-8 text-white shadow-lg">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5" />
                <h1 className="text-2xl font-bold">Schedule Management</h1>
              </div>
              <p className="text-brand-100">Organize and manage your cleaning jobs</p>
            </div>
            <button
              onClick={() => setScheduleModal({ open: true })}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-600 transition-all hover:shadow-lg hover:bg-brand-50"
            >
              <Plus className="h-4 w-4" />
              Create Job
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-lg bg-white/10 backdrop-blur-sm px-4 py-3 border border-white/20">
              <p className="text-sm font-medium text-brand-100">Today's Jobs</p>
              <p className="text-2xl font-bold text-white">{todayJobs}</p>
            </div>
            <div className="rounded-lg bg-white/10 backdrop-blur-sm px-4 py-3 border border-white/20">
              <p className="text-sm font-medium text-brand-100">Total Scheduled</p>
              <p className="text-2xl font-bold text-white">{jobCount}</p>
            </div>
            <div className="rounded-lg bg-white/10 backdrop-blur-sm px-4 py-3 border border-white/20">
              <p className="text-sm font-medium text-brand-100">Active Cleaners</p>
              <p className="text-2xl font-bold text-white">{uniqueCleaners.length}</p>
            </div>
          </div>
        </div>

        {/* Decorative gradient shapes */}
        <div className="absolute top-0 right-0 -mr-12 -mt-12 h-48 w-48 rounded-full bg-brand-500 opacity-10" />
        <div className="absolute bottom-0 left-0 -ml-12 -mb-12 h-32 w-32 rounded-full bg-brand-800 opacity-10" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-brand-100 bg-white px-4 py-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          {/* View tabs */}
          <div className="flex rounded-xl bg-brand-50 p-1 w-fit">
            {VIEW_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setView(tab.key)}
                  title={`${tab.label} view (keyboard: ${tab.key === 'month' ? 'M' : tab.key === 'week' ? 'W' : 'D'})`}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                    view === tab.key
                      ? "bg-white text-brand-600 shadow-sm ring-1 ring-brand-100"
                      : "text-muted-foreground hover:text-accent"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Navigation with icons */}
          <div className="flex items-center gap-3 px-3 py-1.5 bg-brand-50/60 rounded-lg w-fit">
            <button
              onClick={goPrev}
              className="p-1.5 text-muted-foreground hover:text-accent hover:bg-white rounded-lg transition-colors"
              title="Previous (← arrow)"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <h2 className="min-w-[200px] text-center text-sm font-semibold text-accent">
              {headerLabel}
            </h2>

            <button
              onClick={goNext}
              className="p-1.5 text-muted-foreground hover:text-accent hover:bg-white rounded-lg transition-colors"
              title="Next (→ arrow)"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToday}
              className="rounded-lg bg-brand-100 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-200 transition-colors"
              title="Jump to today"
            >
              Today
            </button>
            <div className="text-sm font-medium text-accent flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-brand-600" />
              {jobCount}
            </div>
            {loading && (
              <span className="text-xs text-muted-foreground animate-pulse flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-brand-600 animate-pulse" />
                Loading
              </span>
            )}
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              showFilters || Object.keys(filters).length > 0
                ? "bg-brand-100 text-brand-700 hover:bg-brand-200"
                : "text-muted-foreground hover:bg-brand-50"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters {Object.keys(filters).length > 0 && `(${Object.keys(filters).length})`}
          </button>

          {(showFilters || Object.keys(filters).length > 0) && (
            <>
              {/* Cleaner filter */}
              <select
                value={filters.cleaner || ""}
                onChange={(e) => setFilters({ ...filters, cleaner: e.target.value || undefined })}
                className="rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm font-medium text-accent hover:border-brand-200 focus:border-brand-600 focus:outline-none"
              >
                <option value="">All Cleaners</option>
                {uniqueCleaners.map((cleaner) => (
                  <option key={cleaner} value={cleaner}>
                    {cleaner}
                  </option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={filters.status || ""}
                onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                className="rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm font-medium text-accent hover:border-brand-200 focus:border-brand-600 focus:outline-none"
              >
                <option value="">All Statuses</option>
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              {/* Service filter */}
              <select
                value={filters.service || ""}
                onChange={(e) => setFilters({ ...filters, service: e.target.value || undefined })}
                className="rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm font-medium text-accent hover:border-brand-200 focus:border-brand-600 focus:outline-none"
              >
                <option value="">All Services</option>
                {uniqueServices.map((service) => (
                  <option key={service} value={service}>
                    {service.replace(/_/g, " ")}
                  </option>
                ))}
              </select>

              {Object.keys(filters).length > 0 && (
                <button
                  onClick={() => setFilters({})}
                  className="text-xs font-medium text-muted-foreground hover:text-accent underline"
                >
                  Clear filters
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Calendar body */}
      <div className="rounded-2xl border border-brand-100 bg-white shadow-sm overflow-hidden transition-all duration-200">
        {view === "month" && (
          <CalendarWidget
            jobs={filteredJobs}
            onDateSelect={handleMonthDateSelect}
          />
        )}

        {view === "week" && (
          <WeekView
            currentDate={currentDate}
            jobs={filteredJobs}
            onSlotClick={handleSlotClick}
            onJobClick={handleJobClick}
          />
        )}

        {view === "day" && (
          <DayView
            currentDate={currentDate}
            jobs={filteredJobs}
            onSlotClick={handleSlotClick}
            onJobClick={handleJobClick}
          />
        )}
      </div>

      {/* Job Detail Slide-over */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="w-full max-w-md bg-white shadow-xl overflow-y-auto">
            <div className="border-b border-brand-100 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-accent">Job Details</h3>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-muted-foreground hover:text-accent text-xl"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-brand-50/60 px-4 py-3">
                <p className="text-sm font-semibold text-accent">{selectedJob.customer}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedJob.service.replace(/_/g, " ")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium text-accent">{selectedJob.date}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="font-medium text-accent">
                    {selectedJob.startTime} - {selectedJob.endTime}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cleaner</p>
                  <p className="font-medium text-accent">{selectedJob.cleaner}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-medium text-accent">{selectedJob.status}</p>
                </div>
              </div>

              {selectedJob.address && (
                <div>
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="text-sm font-medium text-accent">{selectedJob.address}</p>
                </div>
              )}

              {selectedJob.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm text-accent">{selectedJob.notes}</p>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => {
                    setScheduleModal({
                      open: true,
                      jobId: selectedJob.id,
                      jobCustomer: selectedJob.customer,
                      jobService: selectedJob.service,
                      date: selectedJob.date,
                    });
                    setSelectedJob(null);
                  }}
                  className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Reschedule / Reassign
                </button>
                <a
                  href={`/admin/jobs/${selectedJob.id}`}
                  className="rounded-xl border border-brand-100 px-4 py-2.5 text-sm font-semibold text-accent hover:bg-brand-50 text-center"
                >
                  Full Details
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleModal.open && (
        <ScheduleJobModal
          jobId={scheduleModal.jobId}
          jobCustomer={scheduleModal.jobCustomer}
          jobService={scheduleModal.jobService}
          initialDate={scheduleModal.date}
          initialHour={scheduleModal.hour}
          onClose={() => setScheduleModal({ open: false })}
          onScheduled={handleScheduled}
        />
      )}
    </div>
  );
};
