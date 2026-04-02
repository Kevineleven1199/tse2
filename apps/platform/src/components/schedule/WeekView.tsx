"use client";

import { useEffect, useRef } from "react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
} from "date-fns";
import { TimeGrid } from "./TimeGrid";
import type { CalendarJob } from "./types";

type Props = {
  currentDate: Date;
  jobs: CalendarJob[];
  onSlotClick?: (date: Date, hour: number) => void;
  onJobClick?: (job: CalendarJob) => void;
};

const HOUR_HEIGHT = 60; // px per hour

export const WeekView = ({ currentDate, jobs, onSlotClick, onJobClick }: Props) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to current time on mount
  useEffect(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const scrollTop = Math.max(0, (currentHour - 7) * HOUR_HEIGHT);

    if (scrollContainerRef.current) {
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({ top: scrollTop, behavior: "smooth" });
      }, 100);
    }
  }, [currentDate]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
      {/* Week day headers - sticky */}
      <div className="sticky top-0 z-40 flex border-b border-brand-200 bg-white shadow-sm">
        {/* Time column spacer */}
        <div className="w-20 flex-shrink-0 border-r border-brand-100 bg-white" />

        {/* Day headers */}
        <div className="flex flex-1">
          {days.map((day) => {
            const isCurrentDay = isToday(day);
            return (
              <div
                key={format(day, "yyyy-MM-dd")}
                className={`flex-1 min-w-[140px] border-r border-brand-100 px-4 py-4 text-center transition-colors ${
                  isCurrentDay ? "bg-gradient-to-b from-brand-50 to-white" : "bg-white"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {format(day, "EEE")}
                </p>
                <div
                  className={`mt-2 mx-auto flex items-center justify-center text-2xl font-bold transition-all ${
                    isCurrentDay
                      ? "h-12 w-12 rounded-full bg-brand-600 text-white shadow-lg"
                      : "text-accent"
                  }`}
                >
                  {format(day, "d")}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Time grid - scrollable */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth"
        style={{ scrollBehavior: "smooth" }}
      >
        <div className="flex">
          {/* Time column */}
          <div className="w-20 flex-shrink-0 border-r border-brand-100 bg-white">
            {Array.from({ length: 13 }, (_, i) => i + 7).map((hour) => {
              const label =
                hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`;
              return (
                <div
                  key={hour}
                  className="relative h-[60px] border-b border-brand-100 px-2 py-1 text-right text-xs font-semibold text-muted-foreground"
                  style={{ height: HOUR_HEIGHT }}
                >
                  <span className="inline-block">{label}</span>
                </div>
              );
            })}
          </div>

          {/* Day columns with time grids */}
          <div className="flex flex-1">
            {days.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayJobs = jobs.filter((j) => j.date === dateKey);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={dateKey}
                  className={`flex-1 min-w-[140px] border-r border-brand-100 relative ${
                    isCurrentDay ? "bg-gradient-to-r from-brand-50/30 to-transparent" : "bg-white"
                  }`}
                >
                  <TimeGrid
                    jobs={dayJobs}
                    onSlotClick={(hour) => onSlotClick?.(day, hour)}
                    onJobClick={onJobClick}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
