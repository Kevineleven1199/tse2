"use client";

import { format, isToday } from "date-fns";
import { Calendar, Clock, MapPin, User, CheckCircle2 } from "lucide-react";
import { TimeGrid } from "./TimeGrid";
import type { CalendarJob } from "./types";

type Props = {
  currentDate: Date;
  jobs: CalendarJob[];
  onSlotClick?: (date: Date, hour: number) => void;
  onJobClick?: (job: CalendarJob) => void;
};

export const DayView = ({ currentDate, jobs, onSlotClick, onJobClick }: Props) => {
  const dateKey = format(currentDate, "yyyy-MM-dd");
  const dayJobs = jobs.filter((j) => j.date === dateKey);
  const today = isToday(currentDate);

  // Calculate job statistics
  const completedJobs = dayJobs.filter((j) => j.status === "COMPLETED").length;
  const pendingJobs = dayJobs.filter((j) => j.status === "PENDING").length;
  const scheduledJobs = dayJobs.filter((j) => j.status === "SCHEDULED").length;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Day header - sticky */}
      <div className="sticky top-0 z-40 border-b border-brand-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`flex items-center justify-center rounded-xl transition-all ${
                today
                  ? "text-white bg-gradient-to-br from-brand-600 to-brand-700 w-20 h-20 shadow-lg"
                  : "text-brand-600 bg-brand-50 w-16 h-16"
              }`}
            >
              <span className="text-2xl font-bold">{format(currentDate, "d")}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-accent">
                {format(currentDate, "EEEE, MMMM d, yyyy")}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {dayJobs.length} job{dayJobs.length !== 1 ? "s" : ""} scheduled
              </p>

              {/* Quick stats */}
              {dayJobs.length > 0 && (
                <div className="mt-3 flex items-center gap-4 text-sm">
                  {scheduledJobs > 0 && (
                    <div className="flex items-center gap-1 text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">{scheduledJobs} scheduled</span>
                    </div>
                  )}
                  {pendingJobs > 0 && (
                    <div className="flex items-center gap-1 text-amber-700">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">{pendingJobs} pending</span>
                    </div>
                  )}
                  {completedJobs > 0 && (
                    <div className="flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">{completedJobs} completed</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Time grid - left side */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
          <div className="flex-1">
            <div className="flex">
              {/* Time column */}
              <div className="w-20 flex-shrink-0 border-r border-brand-100 bg-white">
                {Array.from({ length: 13 }, (_, i) => i + 7).map((hour) => {
                  const label =
                    hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`;
                  return (
                    <div
                      key={hour}
                      className="relative h-[60px] border-b border-brand-100 px-2 py-1 text-right text-xs font-semibold text-muted-foreground flex items-start justify-end pt-1"
                    >
                      <span>{label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Time grid */}
              <div className="flex-1 relative border-l border-brand-100 bg-white">
                <TimeGrid
                  jobs={dayJobs}
                  onSlotClick={(hour) => onSlotClick?.(currentDate, hour)}
                  onJobClick={onJobClick}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Job list sidebar */}
        {dayJobs.length > 0 && (
          <div className="w-80 border-l border-brand-200 bg-white shadow-inner overflow-y-auto">
            <div className="p-5 border-b border-brand-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-accent">Today's Schedule</h2>
              <p className="text-xs text-muted-foreground mt-1">{dayJobs.length} job{dayJobs.length !== 1 ? "s" : ""}</p>
            </div>

            <div className="divide-y divide-brand-100">
              {dayJobs
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => onJobClick?.(job)}
                    className="w-full text-left p-4 hover:bg-brand-50 transition-colors group"
                  >
                    {/* Time */}
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-brand-600" />
                      <span className="text-sm font-bold text-accent">
                        {job.startTime} - {job.endTime}
                      </span>
                    </div>

                    {/* Customer and status */}
                    <div className="mb-2">
                      <p className="text-sm font-semibold text-accent group-hover:text-brand-600 transition-colors">
                        {job.customer}
                      </p>
                      <span className={`inline-block mt-1 text-xs font-medium px-2 py-1 rounded-full ${
                        job.status === "SCHEDULED"
                          ? "bg-green-100 text-green-700"
                          : job.status === "CLAIMED"
                          ? "bg-blue-100 text-blue-700"
                          : job.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {job.status}
                      </span>
                    </div>

                    {/* Service */}
                    <p className="text-xs text-muted-foreground mb-2">
                      {job.service.replace(/_/g, " ")}
                    </p>

                    {/* Cleaner */}
                    {job.cleaner && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                        <User className="h-3 w-3" />
                        <span>{job.cleaner}</span>
                      </div>
                    )}

                    {/* Address */}
                    {job.address && (
                      <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{job.address}</span>
                      </div>
                    )}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {dayJobs.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Calendar className="h-16 w-16 text-brand-200 mx-auto mb-4" />
              <p className="text-lg font-semibold text-accent mb-2">No jobs scheduled</p>
              <p className="text-sm text-muted-foreground">Click on a time slot to create a job</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
