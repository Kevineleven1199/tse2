"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  addWeeks,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";

type CleanerJob = {
  id: string;
  customerName: string;
  service: string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
  address?: string;
  city?: string;
};

const HOUR_HEIGHT = 48;
const START_HOUR = 7;
const END_HOUR = 19;

function getJobPosition(job: CleanerJob): { top: number; height: number } {
  const start = new Date(job.scheduledStart);
  const end = new Date(job.scheduledEnd);
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();
  const gridStartMin = START_HOUR * 60;
  const top = ((startMin - gridStartMin) / 60) * HOUR_HEIGHT;
  const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 28);
  return { top, height };
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-brand-100 border-brand-400 text-brand-800",
  CLAIMED: "bg-blue-100 border-blue-400 text-blue-800",
  COMPLETED: "bg-green-100 border-green-400 text-green-800",
};

export const CleanerWeekCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [jobs, setJobs] = useState<CleanerJob[]>([]);
  const [loading, setLoading] = useState(false);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

  const fetchJobs = useCallback(async (date: Date) => {
    setLoading(true);
    const ws = startOfWeek(date, { weekStartsOn: 0 });
    const we = endOfWeek(date, { weekStartsOn: 0 });
    try {
      const res = await fetch(
        `/api/cleaner/schedule?from=${format(ws, "yyyy-MM-dd")}&to=${format(we, "yyyy-MM-dd")}`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setJobs(data);
      }
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs(currentDate);
  }, [currentDate, fetchJobs]);

  // Group jobs by day
  const jobsByDay = useMemo(() => {
    const map = new Map<string, CleanerJob[]>();
    for (const job of jobs) {
      const dateKey = new Date(job.scheduledStart).toISOString().split("T")[0];
      const existing = map.get(dateKey) || [];
      existing.push(job);
      map.set(dateKey, existing);
    }
    return map;
  }, [jobs]);

  // Current time line
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow = nowMin >= START_HOUR * 60 && nowMin <= END_HOUR * 60;
  const nowTop = ((nowMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;

  const totalHeight = hours.length * HOUR_HEIGHT;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
            className="rounded-lg p-2 text-muted-foreground hover:bg-brand-50 hover:text-accent"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-base font-semibold text-accent">
            {format(weekStart, "MMM d")} &ndash; {format(weekEnd, "MMM d, yyyy")}
          </h2>
          <button
            onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
            className="rounded-lg p-2 text-muted-foreground hover:bg-brand-50 hover:text-accent"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="rounded-xl bg-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-200"
          >
            Today
          </button>
          {loading && (
            <span className="text-xs text-muted-foreground animate-pulse">Loading...</span>
          )}
        </div>
      </div>

      {/* Week Grid */}
      <div className="rounded-2xl border border-brand-100 bg-white shadow-sm overflow-x-auto">
        <div className="flex min-w-[700px]">
          {/* Time labels */}
          <div className="w-14 flex-shrink-0 relative" style={{ height: totalHeight + 48 }}>
            <div className="h-12" /> {/* header spacer */}
            {hours.map((hour) => {
              const top = (hour - START_HOUR) * HOUR_HEIGHT + 48;
              const label = hour < 12 ? `${hour}a` : hour === 12 ? "12p" : `${hour - 12}p`;
              return (
                <div
                  key={hour}
                  className="absolute right-2 text-[11px] text-muted-foreground"
                  style={{ top: top - 7 }}
                >
                  {label}
                </div>
              );
            })}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayJobs = jobsByDay.get(dateKey) || [];
            const today = isToday(day);

            return (
              <div
                key={dateKey}
                className={`flex-1 min-w-[90px] border-l border-brand-100 ${
                  today ? "bg-brand-50/30" : ""
                }`}
              >
                {/* Day header */}
                <div className="sticky top-0 z-30 bg-white border-b border-brand-100 px-1 py-2 text-center h-12 flex flex-col justify-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {format(day, "EEE")}
                  </p>
                  <p
                    className={`text-sm font-semibold ${
                      today
                        ? "text-white bg-brand-600 rounded-full w-6 h-6 flex items-center justify-center mx-auto text-xs"
                        : "text-accent"
                    }`}
                  >
                    {format(day, "d")}
                  </p>
                </div>

                {/* Time grid */}
                <div className="relative" style={{ height: totalHeight }}>
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 border-t border-brand-100/50"
                      style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
                    />
                  ))}

                  {/* Now line */}
                  {showNow && today && (
                    <div
                      className="absolute left-0 right-0 z-10 pointer-events-none"
                      style={{ top: nowTop }}
                    >
                      <div className="h-0.5 bg-red-500" />
                    </div>
                  )}

                  {/* Job blocks */}
                  {dayJobs.map((job) => {
                    const { top, height } = getJobPosition(job);
                    const colorClass = STATUS_COLORS[job.status] || STATUS_COLORS.SCHEDULED;
                    return (
                      <a
                        key={job.id}
                        href={`/cleaner/jobs/${job.id}`}
                        className={`absolute left-0.5 right-0.5 z-20 rounded-lg border px-1.5 py-1 overflow-hidden hover:shadow-md transition-shadow ${colorClass}`}
                        style={{ top, height }}
                      >
                        <p className="text-[10px] font-semibold truncate">{job.customerName}</p>
                        {height > 36 && (
                          <p className="text-[9px] truncate opacity-80">
                            {job.service.replace(/_/g, " ")}
                          </p>
                        )}
                        {height > 50 && job.address && (
                          <p className="text-[9px] truncate opacity-70 flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                            {job.address}
                          </p>
                        )}
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day summary for today */}
      {(() => {
        const todayKey = format(new Date(), "yyyy-MM-dd");
        const todayJobs = jobsByDay.get(todayKey) || [];
        if (todayJobs.length === 0) return null;

        return (
          <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-accent mb-3 flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Today&apos;s Jobs
            </h3>
            <div className="space-y-2">
              {todayJobs.map((job) => (
                <a
                  key={job.id}
                  href={`/cleaner/jobs/${job.id}`}
                  className="flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50/40 p-3 hover:shadow-sm transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-accent">{job.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(job.scheduledStart).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      {" - "}
                      {new Date(job.scheduledEnd).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      {" | "}
                      {job.service.replace(/_/g, " ")}
                    </p>
                  </div>
                  {job.address && (
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {job.address}
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
