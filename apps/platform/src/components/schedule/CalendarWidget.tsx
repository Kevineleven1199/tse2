"use client";

import { useState, useMemo } from "react";
import { Plus } from "lucide-react";

type CalendarJob = {
  id: string;
  date: string; // YYYY-MM-DD
  customer: string;
  cleaner: string;
  service: string;
  status: string;
  startTime: string;
  endTime: string;
};

type CalendarWidgetProps = {
  jobs: CalendarJob[];
  onDateSelect?: (date: string) => void;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "CLAIMED": return "bg-blue-500";
    case "SCHEDULED": return "bg-green-500";
    case "COMPLETED": return "bg-emerald-500";
    case "PENDING": return "bg-amber-500";
    default: return "bg-gray-400";
  }
};

const getStatusBg = (status: string) => {
  switch (status) {
    case "CLAIMED": return "bg-blue-50 border-blue-200";
    case "SCHEDULED": return "bg-green-50 border-green-200";
    default: return "bg-gray-50 border-gray-200";
  }
};

export const CalendarWidget = ({ jobs, onDateSelect }: CalendarWidgetProps) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Group jobs by date
  const jobsByDate = useMemo(() => {
    const map = new Map<string, CalendarJob[]>();
    for (const job of jobs) {
      const existing = map.get(job.date) || [];
      existing.push(job);
      map.set(job.date, existing);
    }
    return map;
  }, [jobs]);

  // Calculate calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startPad = firstDay.getDay(); // 0=Sun
    const totalDays = lastDay.getDate();

    const days: Array<{ date: number; dateStr: string; isCurrentMonth: boolean; isToday: boolean }> = [];

    // Previous month padding
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startPad - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const m = currentMonth === 0 ? 11 : currentMonth - 1;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      days.push({
        date: d,
        dateStr: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        isCurrentMonth: false,
        isToday: false
      });
    }

    // Current month
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        date: d,
        dateStr,
        isCurrentMonth: true,
        isToday: d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
      });
    }

    // Next month padding (fill to complete last row)
    const remainder = days.length % 7;
    if (remainder > 0) {
      for (let d = 1; d <= 7 - remainder; d++) {
        const m = currentMonth === 11 ? 0 : currentMonth + 1;
        const y = currentMonth === 11 ? currentYear + 1 : currentYear;
        days.push({
          date: d,
          dateStr: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
          isCurrentMonth: false,
          isToday: false
        });
      }
    }

    return days;
  }, [currentMonth, currentYear, today]);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    setSelectedDate(todayStr);
    onDateSelect?.(todayStr);
  };

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    onDateSelect?.(dateStr);
  };

  const selectedJobs = selectedDate ? (jobsByDate.get(selectedDate) || []) : [];

  return (
    <div className="space-y-4 p-6">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS.map((day) => (
          <div key={day} className="py-3 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {/* Day cells */}
        {calendarDays.map((day, i) => {
          const dayJobs = jobsByDate.get(day.dateStr) || [];
          const isSelected = selectedDate === day.dateStr;
          const hasJobs = dayJobs.length > 0;

          return (
            <button
              key={i}
              onClick={() => handleDateClick(day.dateStr)}
              className={`group relative flex min-h-[100px] flex-col rounded-xl border-2 p-2.5 transition-all duration-200 ${
                !day.isCurrentMonth
                  ? "border-transparent bg-gray-50 text-gray-300 cursor-default"
                  : isSelected
                  ? "border-brand-600 bg-brand-50 shadow-lg ring-2 ring-brand-200 ring-offset-2"
                  : day.isToday
                  ? "border-brand-500 bg-gradient-to-br from-brand-50/80 to-brand-50 shadow-md"
                  : "border-brand-100 bg-white hover:border-brand-300 hover:shadow-md"
              }`}
            >
              {/* Date number */}
              <div className={`relative ${day.isToday && !isSelected ? "h-7 w-7 mx-auto flex items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white shadow-md" : "text-sm font-bold text-accent"}`}>
                {day.date}
              </div>

              {/* Jobs indicator dots */}
              {hasJobs && day.isCurrentMonth && (
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  {dayJobs.slice(0, 4).map((j, idx) => (
                    <span
                      key={idx}
                      className={`h-2 w-2 rounded-full shadow-sm ${getStatusColor(j.status)}`}
                      title={j.customer}
                    />
                  ))}
                  {dayJobs.length > 4 && (
                    <span className="text-[9px] font-bold text-brand-600 px-1">+{dayJobs.length - 4}</span>
                  )}
                </div>
              )}

              {/* Job count badge */}
              {hasJobs && day.isCurrentMonth && (
                <span className="mt-1 text-[10px] font-semibold text-brand-600">
                  {dayJobs.length}
                </span>
              )}

              {/* Quick add button on hover (for empty future dates) */}
              {!hasJobs && day.isCurrentMonth && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/5">
                  <Plus className="h-4 w-4 text-brand-600" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date jobs - Side panel style */}
      {selectedDate && (
        <div className="rounded-2xl border border-brand-100 bg-white px-6 py-5 shadow-sm">
          <div className="mb-5 pb-4 border-b border-brand-100">
            <h3 className="text-lg font-bold text-accent">
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric", year: "numeric"
              })}
            </h3>
            {selectedJobs.length > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedJobs.length} job{selectedJobs.length !== 1 ? "s" : ""} scheduled
              </p>
            )}
          </div>

          {selectedJobs.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">No jobs scheduled for this date</p>
              <button className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-100 transition-colors">
                <Plus className="h-3.5 w-3.5" />
                Create Job
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedJobs.map((job) => (
                <div
                  key={job.id}
                  className={`rounded-xl border-2 p-3.5 transition-all hover:shadow-md ${getStatusBg(job.status)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-bold text-accent text-sm">{job.customer}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{job.service.replace(/_/g, " ")}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs font-medium text-accent">
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-white/50">
                          🕐 {job.startTime} - {job.endTime}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        job.status === "CLAIMED" ? "bg-blue-100 text-blue-700" :
                        job.status === "SCHEDULED" ? "bg-green-100 text-green-700" :
                        job.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {job.status}
                      </span>
                      <p className="mt-2 text-xs font-medium text-brand-600">{job.cleaner}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
