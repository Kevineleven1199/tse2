"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, Clock3, List, MapPin, Route } from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { CleanerWeekCalendar } from "@/src/components/cleaner/CleanerWeekCalendar";

type SerializedAssignment = {
  id: string;
  jobId: string;
  customerName: string;
  serviceType: string;
  serviceLabel: string;
  address: string;
  city: string;
  status: string;
  payoutAmount: number;
  estimatedHours: number;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  notes: string | null;
  dayKey: string;
  enRouteAt: string | null;
  clockInAt: string | null;
  clockOutAt: string | null;
};

type Props = {
  assignments: SerializedAssignment[];
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatTime(iso: string | null): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getAssignmentProgress(assignment: SerializedAssignment) {
  if (assignment.clockOutAt || assignment.status === "COMPLETED") {
    return {
      label: "Complete",
      detail: assignment.clockOutAt ? `Clocked out at ${formatTime(assignment.clockOutAt)}` : "This stop is complete.",
      tone: "bg-emerald-100 text-emerald-800 border-emerald-200",
    };
  }

  if (assignment.clockInAt) {
    return {
      label: "Clocked in",
      detail: `On site since ${formatTime(assignment.clockInAt)}`,
      tone: "bg-sky-100 text-sky-800 border-sky-200",
    };
  }

  if (assignment.enRouteAt) {
    return {
      label: "En route",
      detail: `Travel started at ${formatTime(assignment.enRouteAt)}`,
      tone: "bg-amber-100 text-amber-800 border-amber-200",
    };
  }

  return {
    label: "Scheduled",
    detail: assignment.scheduledStart ? `Starts at ${formatTime(assignment.scheduledStart)}` : "Waiting for a time window.",
    tone: "bg-brand-100 text-brand-800 border-brand-200",
  };
}

export const CleanerScheduleClient = ({ assignments }: Props) => {
  const [view, setView] = useState<"calendar" | "list">("calendar");

  const stats = useMemo(() => {
    const todayKey = new Date().toDateString();
    const todayCount = assignments.filter((assignment) => {
      if (!assignment.scheduledStart) return false;
      return new Date(assignment.scheduledStart).toDateString() === todayKey;
    }).length;

    const activeCount = assignments.filter(
      (assignment) => (assignment.enRouteAt || assignment.clockInAt) && !assignment.clockOutAt
    ).length;

    const scheduledHours = assignments.reduce((sum, assignment) => sum + (assignment.estimatedHours ?? 0), 0);
    const nextAssignment = assignments.find((assignment) => assignment.scheduledStart !== null) ?? null;

    return {
      todayCount,
      activeCount,
      scheduledHours,
      nextAssignment,
    };
  }, [assignments]);

  const dayEntries = useMemo(() => {
    const groups = new Map<string, SerializedAssignment[]>();
    for (const assignment of assignments) {
      const existing = groups.get(assignment.dayKey) ?? [];
      existing.push(assignment);
      groups.set(assignment.dayKey, existing);
    }
    return Array.from(groups.entries());
  }, [assignments]);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-brand-200 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.20),_transparent_38%),linear-gradient(135deg,#0f5132_0%,#2e7d32_58%,#78cd7b_100%)] text-white shadow-[0_28px_80px_-28px_rgba(15,81,50,0.7)]">
        <div className="grid gap-6 p-6 md:p-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.36em] text-white/70">Schedule</p>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Cleaner route, clock status, and timing in one place.</h1>
              <p className="max-w-2xl text-sm text-white/80 md:text-base">
                Open any stop to clock in on arrival, finish the job, and create the timesheet entry automatically.
              </p>
            </div>

            {stats.nextAssignment ? (
              <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/65">Next scheduled stop</p>
                <h2 className="mt-2 text-2xl font-semibold">{stats.nextAssignment.customerName}</h2>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-white/80">
                  <span>{formatDateTime(stats.nextAssignment.scheduledStart)}</span>
                  <span>{stats.nextAssignment.serviceLabel}</span>
                  <span>{formatCurrency(stats.nextAssignment.payoutAmount)}</span>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/cleaner/jobs/${stats.nextAssignment.jobId}`}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-brand-900 transition hover:bg-brand-50"
                  >
                    Open Job
                  </Link>
                  <button
                    onClick={() => setView("list")}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/15"
                  >
                    View List
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm text-sm text-white/80">
                No upcoming assignments are scheduled yet. Check the job board if you want to fill more hours this week.
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryTile
              icon={Route}
              label="Upcoming stops"
              value={`${assignments.length}`}
              detail="Scheduled in the next two weeks"
            />
            <SummaryTile
              icon={Clock3}
              label="Active now"
              value={`${stats.activeCount}`}
              detail={stats.activeCount === 1 ? "Shift in progress" : "Shifts in progress"}
            />
            <SummaryTile
              icon={CalendarDays}
              label="Stops today"
              value={`${stats.todayCount}`}
              detail="Jobs on today’s route"
            />
            <SummaryTile
              icon={Clock3}
              label="Scheduled hours"
              value={`${stats.scheduledHours?.toFixed(1) ?? "0.0"} hrs`}
              detail="Expected hours across upcoming jobs"
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-accent">My Schedule</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Calendar for planning. List view for route details, pay, and clock progress.
          </p>
        </div>

        <div className="flex rounded-full border border-brand-100 bg-white p-1 shadow-sm">
          <button
            onClick={() => setView("calendar")}
            className={`flex min-h-[42px] items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              view === "calendar" ? "bg-accent text-white shadow-sm" : "text-muted-foreground hover:text-accent"
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            Calendar
          </button>
          <button
            onClick={() => setView("list")}
            className={`flex min-h-[42px] items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              view === "list" ? "bg-accent text-white shadow-sm" : "text-muted-foreground hover:text-accent"
            }`}
          >
            <List className="h-4 w-4" />
            Route List
          </button>
        </div>
      </div>

      {view === "calendar" ? (
        <Card className="overflow-hidden border-brand-100 bg-white">
          <CardContent className="mt-0 p-4 pt-4 md:p-6 md:pt-6">
            <CleanerWeekCalendar />
          </CardContent>
        </Card>
      ) : dayEntries.length === 0 ? (
        <Card className="overflow-hidden border-brand-100 bg-white">
          <CardContent className="mt-0 flex flex-col items-center p-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <CalendarDays className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-semibold text-accent">No upcoming jobs</h3>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Your route is clear for now. Claim work from the job board if you want to add more hours to the week.
            </p>
            <Link
              href="/cleaner/jobs"
              className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-brand-700"
            >
              Browse Jobs
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {dayEntries.map(([day, jobs]) => (
            <section key={day} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-700">{day}</h3>
                <p className="text-xs text-muted-foreground">
                  {jobs.length} stop{jobs.length === 1 ? "" : "s"} • {jobs.reduce((sum, job) => sum + (job.estimatedHours ?? 0), 0).toFixed(1)} hrs
                </p>
              </div>

              <div className="space-y-4">
                {jobs.map((assignment) => {
                  const progress = getAssignmentProgress(assignment);

                  return (
                    <Card key={assignment.id} className="overflow-hidden border-brand-100 bg-white">
                      <CardContent className="mt-0 p-5 pt-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-xl font-semibold text-accent">{assignment.customerName}</h4>
                              <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${progress.tone}`}>
                                {progress.label}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                              <span>{formatTime(assignment.scheduledStart)} - {formatTime(assignment.scheduledEnd)}</span>
                              <span>{assignment.serviceLabel}</span>
                            </div>

                            <p className="flex items-start gap-2 text-sm text-muted-foreground">
                              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-700" />
                              {assignment.address}
                            </p>

                            <p className="text-sm text-muted-foreground">{progress.detail}</p>

                            {assignment.notes ? (
                              <p className="rounded-2xl bg-brand-50/45 px-4 py-3 text-sm text-muted-foreground">
                                {assignment.notes}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex min-w-[200px] flex-col items-start gap-3 sm:items-end">
                            <div className="text-left sm:text-right">
                              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Est. Hours</p>
                              <p className="mt-1 text-2xl font-semibold text-brand-700">
                                {(assignment.estimatedHours ?? 0).toFixed(1)} hrs
                              </p>
                            </div>

                            <Link
                              href={`/cleaner/jobs/${assignment.jobId}`}
                              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-brand-700"
                            >
                              Open Job
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

function SummaryTile({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Route;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-white/70">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-sm text-white/75">{detail}</p>
    </div>
  );
}
