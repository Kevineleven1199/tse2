import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  DollarSign,
  FileText,
  MapPin,
  Route,
  Sparkles,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { formatCurrency } from "@/src/lib/utils";
import { getSession } from "@/src/lib/auth/session";
import { getCleanerPortalData } from "@/src/lib/cleaner-portal";
import { calculatePayroll, getCurrentPayPeriod } from "@/src/lib/payroll";

const SERVICE_LABELS: Record<string, string> = {
  HOME_CLEAN: "Healthy Home Clean",
  PRESSURE_WASH: "Pressure Washing",
  AUTO_DETAIL: "Eco Auto Detail",
  CUSTOM: "Custom Service",
};

type ShiftProgressInput = {
  job: {
    status: string;
  };
  enRouteAt: Date | null;
  clockInAt: Date | null;
  clockOutAt: Date | null;
};

function formatTime(value: Date | string | null) {
  if (!value) return "TBD";
  return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDate(value: Date | string | null) {
  if (!value) return "TBD";
  return new Date(value).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: Date | string | null) {
  if (!value) return "TBD";
  return new Date(value).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getShiftProgress({ job, enRouteAt, clockInAt, clockOutAt }: ShiftProgressInput) {
  if (clockOutAt || job.status === "COMPLETED") {
    return {
      label: "Complete",
      detail: clockOutAt ? `Clocked out at ${formatTime(clockOutAt)}` : "This job is complete.",
      tone: "bg-emerald-100 text-emerald-800 border-emerald-200",
    };
  }

  if (clockInAt) {
    return {
      label: "Clocked in",
      detail: `On site since ${formatTime(clockInAt)}`,
      tone: "bg-sky-100 text-sky-800 border-sky-200",
    };
  }

  if (enRouteAt) {
    return {
      label: "En route",
      detail: `Travel started at ${formatTime(enRouteAt)}`,
      tone: "bg-amber-100 text-amber-800 border-amber-200",
    };
  }

  return {
    label: "Scheduled",
    detail: "Ready to start when you head out.",
    tone: "bg-brand-100 text-brand-800 border-brand-200",
  };
}

const CleanerHome = async () => {
  const session = await getSession();
  const portalData = session?.userId ? await getCleanerPortalData(session.userId) : null;

  if (!portalData) {
    return (
      <Card className="overflow-hidden border-brand-100 bg-white">
        <CardContent className="mt-0 flex flex-col gap-4 p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-700">Crew Hub</p>
          <h1 className="text-2xl font-semibold text-accent">Your cleaner profile is still being prepared.</h1>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
            Once HQ finishes setup, this dashboard will show your route, clock-in actions, pay center, and upcoming
            jobs in one place.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/cleaner/jobs"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-brand-700"
            >
              Browse Job Board
            </Link>
            <Link
              href="/cleaner/pipeline"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-brand-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-accent transition hover:bg-brand-50"
            >
              Open Pipeline
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const payPeriod = getCurrentPayPeriod();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday);
  endOfToday.setHours(23, 59, 59, 999);

  const [todayAssignments, activeAssignment, latestPaystub, payrollSnapshot, recentTimesheets] = await Promise.all([
    prisma.jobAssignment.findMany({
      where: {
        cleanerId: portalData.cleanerId,
        job: {
          scheduledStart: { gte: startOfToday, lte: endOfToday },
          status: { in: ["CLAIMED", "SCHEDULED"] },
        },
      },
      include: {
        job: {
          include: {
            request: {
              select: {
                customerName: true,
                addressLine1: true,
                city: true,
                serviceType: true,
                notes: true,
              },
            },
          },
        },
      },
      orderBy: { job: { scheduledStart: "asc" } },
    }),
    prisma.jobAssignment.findFirst({
      where: {
        cleanerId: portalData.cleanerId,
        clockOutAt: null,
        job: {
          status: { in: ["CLAIMED", "SCHEDULED"] },
        },
        OR: [{ clockInAt: { not: null } }, { enRouteAt: { not: null } }],
      },
      include: {
        job: {
          include: {
            request: {
              select: {
                customerName: true,
                addressLine1: true,
                city: true,
                serviceType: true,
              },
            },
          },
        },
      },
      orderBy: [{ clockInAt: "desc" }, { enRouteAt: "desc" }, { job: { scheduledStart: "asc" } }],
    }),
    prisma.paystub.findFirst({
      where: { cleanerId: portalData.cleanerId },
      orderBy: { periodEnd: "desc" },
    }),
    calculatePayroll(portalData.cleanerId, payPeriod.start, payPeriod.end),
    prisma.timesheet.findMany({
      where: { cleanerId: portalData.cleanerId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 4,
    }),
  ]);

  const todayScheduledEarnings = todayAssignments.reduce((sum, assignment) => sum + (assignment.job.payoutAmount ?? 0), 0);
  const todayScheduledHours = todayAssignments.reduce((sum, assignment) => sum + (assignment.job.estimatedHours ?? 0), 0);
  const thisWeekScheduledEarnings = portalData.todaysJobs.concat(portalData.upcomingJobs).reduce((sum, job) => sum + job.estimatedPay, 0);
  const thisWeekScheduledHours = portalData.todaysJobs.concat(portalData.upcomingJobs).reduce((sum, job) => sum + (job.estimatedHours ?? 0), 0);
  const nextJob = todayAssignments[0] ?? null;
  const currentProgress = activeAssignment ? getShiftProgress(activeAssignment) : null;
  const currentPeriodHours = payrollSnapshot?.totalHours ?? 0;
  const currentPeriodNet = payrollSnapshot?.netPay ?? 0;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[36px] border border-brand-200 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.20),_transparent_36%),linear-gradient(135deg,#143b16_0%,#2e7d32_52%,#7bd17a_100%)] text-white shadow-[0_35px_90px_-30px_rgba(20,59,22,0.7)]">
        <div className="grid gap-8 p-6 md:p-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.38em] text-white/70">Crew Command Center</p>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
                Everything your cleaners need to start the day, stay on time, and get paid.
              </h1>
              <p className="max-w-2xl text-sm text-white/80 md:text-base">
                Schedule, clock actions, pay period progress, and paystubs now live in one cleaner-first workspace.
              </p>
            </div>

            {activeAssignment ? (
              <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/65">Active Shift</p>
                    <h2 className="mt-2 text-2xl font-semibold">
                      {activeAssignment.job.request.customerName}
                    </h2>
                    <p className="mt-2 text-sm text-white/80">
                      {SERVICE_LABELS[activeAssignment.job.request.serviceType] ?? activeAssignment.job.request.serviceType}
                      {" • "}
                      {activeAssignment.job.request.addressLine1}, {activeAssignment.job.request.city}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/15 bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white">
                    {currentProgress?.label}
                  </span>
                </div>
                <p className="mt-4 text-sm text-white/80">{currentProgress?.detail}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/cleaner/jobs/${activeAssignment.jobId}`}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-brand-900 transition hover:bg-brand-50"
                  >
                    Resume Job
                  </Link>
                  <Link
                    href="/cleaner/schedule"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-white/15"
                  >
                    Open Schedule
                  </Link>
                </div>
              </div>
            ) : nextJob ? (
              <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/65">Next Stop</p>
                <h2 className="mt-2 text-2xl font-semibold">{nextJob.job.request.customerName}</h2>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-white/80">
                  <span>{formatTime(nextJob.job.scheduledStart)} start</span>
                  <span>{SERVICE_LABELS[nextJob.job.request.serviceType] ?? nextJob.job.request.serviceType}</span>
                  <span>{formatCurrency(nextJob.job.payoutAmount ?? 0)}</span>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/cleaner/jobs/${nextJob.jobId}`}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-brand-900 transition hover:bg-brand-50"
                  >
                    Open Job Details
                  </Link>
                  <Link
                    href="/cleaner/paystubs"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-white/15"
                  >
                    Check Pay
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/65">Today is open</p>
                <h2 className="mt-2 text-2xl font-semibold">No jobs on the board for today.</h2>
                <p className="mt-3 max-w-2xl text-sm text-white/80">
                  Use the job board to pick up extra work or check your upcoming schedule for the rest of the week.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/cleaner/jobs"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-brand-900 transition hover:bg-brand-50"
                  >
                    Browse Jobs
                  </Link>
                  <Link
                    href="/cleaner/schedule"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-white/15"
                  >
                    View Week
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <HeroMetric
              label="Today Scheduled"
              value={`${todayScheduledHours.toFixed(1)} hrs`}
              detail={`${todayAssignments.length} stop${todayAssignments.length === 1 ? "" : "s"} today`}
            />
            <HeroMetric
              label="Current Pay Period"
              value={`${currentPeriodHours.toFixed(1)} hrs`}
              detail={payPeriod.label}
            />
            <HeroMetric
              label="Pending Payouts"
              value={formatCurrency(portalData.earnings.pendingPayout)}
              detail={portalData.earnings.nextPayoutDate ? `Next payout ${formatDate(portalData.earnings.nextPayoutDate)}` : "Waiting on completed jobs"}
            />
            <HeroMetric
              label="This Week Scheduled"
              value={`${thisWeekScheduledHours.toFixed(1)} hrs`}
              detail={`${portalData.upcomingJobs.length + portalData.todaysJobs.length} booked jobs`}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <Card className="overflow-hidden border-brand-100 bg-white">
          <CardHeader className="border-b border-brand-100/80 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-700">Today&apos;s Route</p>
                <h2 className="mt-2 text-2xl font-semibold text-accent">What needs attention right now</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Cleaners can open a stop, clock in on arrival, and clock out when the work is done.
                </p>
              </div>
              <Link
                href="/cleaner/schedule"
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 transition hover:text-brand-900"
              >
                Full schedule
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="mt-0 p-6 pt-6">
            {todayAssignments.length > 0 ? (
              <div className="space-y-4">
                {todayAssignments.map((assignment, index) => {
                  const progress = getShiftProgress(assignment);

                  return (
                    <div
                      key={assignment.id}
                      className="rounded-[28px] border border-brand-100 bg-brand-50/35 p-5 shadow-sm shadow-brand-100/20"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-1 gap-4">
                          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-lg font-semibold text-brand-800 shadow-sm">
                            {index + 1}
                          </div>
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-accent">
                                {assignment.job.request.customerName}
                              </h3>
                              <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${progress.tone}`}>
                                {progress.label}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                              <span>{formatTime(assignment.job.scheduledStart)} - {formatTime(assignment.job.scheduledEnd)}</span>
                              <span>{SERVICE_LABELS[assignment.job.request.serviceType] ?? assignment.job.request.serviceType}</span>
                            </div>
                            <p className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4 flex-shrink-0 text-brand-700" />
                              {assignment.job.request.addressLine1}, {assignment.job.request.city}
                            </p>
                            <p className="text-sm text-muted-foreground">{progress.detail}</p>
                            {assignment.job.request.notes ? (
                              <p className="rounded-2xl bg-white px-3 py-2 text-sm text-muted-foreground">
                                {assignment.job.request.notes}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex min-w-[190px] flex-col items-start gap-3 sm:items-end">
                          <div className="text-left sm:text-right">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Est. Hours</p>
                            <p className="mt-1 text-2xl font-semibold text-emerald-700">
                              {(assignment.job.estimatedHours ?? 0).toFixed(1)} hrs
                            </p>
                          </div>
                          <Link
                            href={`/cleaner/jobs/${assignment.jobId}`}
                            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-brand-700"
                          >
                            Open Stop
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-brand-200 bg-brand-50/30 p-10 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-700">Clear Route</p>
                <h3 className="mt-3 text-2xl font-semibold text-accent">Nothing on the route today.</h3>
                <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
                  Cleaners can still claim new work from the job board or review the rest of the week before heading
                  out.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/cleaner/jobs"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-brand-700"
                  >
                    Browse Jobs
                  </Link>
                  <Link
                    href="/cleaner/schedule"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-brand-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent transition hover:bg-brand-50"
                  >
                    View Schedule
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden border-brand-100 bg-white">
            <CardHeader className="border-b border-brand-100/80 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-700">Pay Snapshot</p>
                  <h2 className="mt-1 text-xl font-semibold text-accent">Know what this period is worth</h2>
                </div>
              </div>
            </CardHeader>
            <CardContent className="mt-0 p-6 pt-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <MiniMetric label="Hours logged" value={`${currentPeriodHours.toFixed(1)} hrs`} />
                <MiniMetric label="Estimated net" value={formatCurrency(currentPeriodNet)} />
              </div>
              <div className="mt-4 rounded-[28px] border border-brand-100 bg-brand-50/35 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">Latest paystub</p>
                {latestPaystub ? (
                  <>
                    <p className="mt-3 text-2xl font-semibold text-accent">{formatCurrency(latestPaystub.netPay)}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{latestPaystub.periodLabel}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {latestPaystub.totalHours.toFixed(1)} hrs • {latestPaystub.status}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Paystubs will appear here once a pay period has been finalized.
                  </p>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/cleaner/paystubs"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-brand-700"
                >
                  Open Pay Center
                </Link>
                <Link
                  href="/cleaner/payouts"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-brand-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent transition hover:bg-brand-50"
                >
                  View Deposits
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-brand-100 bg-white">
            <CardHeader className="border-b border-brand-100/80 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sunshine/30 text-accent">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-700">Recent Timesheets</p>
                  <h2 className="mt-1 text-xl font-semibold text-accent">Recent recorded hours</h2>
                </div>
              </div>
            </CardHeader>
            <CardContent className="mt-0 p-6 pt-6">
              {recentTimesheets.length > 0 ? (
                <div className="space-y-3">
                  {recentTimesheets.map((timesheet) => (
                    <div key={timesheet.id} className="rounded-2xl bg-brand-50/35 px-4 py-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-accent">{formatDate(timesheet.date)}</p>
                          <p className="text-muted-foreground">
                            {formatTime(timesheet.clockIn)} - {timesheet.clockOut ? formatTime(timesheet.clockOut) : "Still running"}
                          </p>
                        </div>
                        <span className="font-semibold text-brand-800">
                          {timesheet.hoursWorked ? `${timesheet.hoursWorked.toFixed(1)} hrs` : "Open"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Completed jobs automatically write a timesheet entry, so this fills in as soon as the first shift is
                  done.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="overflow-hidden border-brand-100 bg-white">
          <CardHeader className="border-b border-brand-100/80 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-700">Coming Up</p>
                <h2 className="mt-1 text-xl font-semibold text-accent">The rest of your week</h2>
              </div>
            </div>
          </CardHeader>
          <CardContent className="mt-0 p-6 pt-6">
            {portalData.upcomingJobs.length > 0 ? (
              <div className="space-y-3">
                {portalData.upcomingJobs.slice(0, 5).map((job) => (
                  <Link
                    key={job.id}
                    href={`/cleaner/jobs/${job.id}`}
                    className="flex items-start justify-between gap-3 rounded-[24px] border border-brand-100 bg-brand-50/25 px-4 py-4 transition hover:bg-brand-50/55"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-accent">{job.clientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(job.scheduledStart)} • {job.service}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {job.address}, {job.city}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-sm font-semibold text-emerald-700">
                      {(job.estimatedHours ?? 0).toFixed(1)} hrs
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No other jobs are scheduled this week yet. Check the job board if you want to fill extra hours.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-brand-100 bg-white">
          <CardHeader className="border-b border-brand-100/80 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Route className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-700">Quick Access</p>
                <h2 className="mt-1 text-xl font-semibold text-accent">Cleaner essentials</h2>
              </div>
            </div>
          </CardHeader>
          <CardContent className="mt-0 grid gap-3 p-6 pt-6 sm:grid-cols-2">
            <QuickLink
              href="/cleaner/schedule"
              icon={CalendarDays}
              title="My schedule"
              body="Review today, tomorrow, or the rest of the week."
            />
            <QuickLink
              href="/cleaner/paystubs"
              icon={FileText}
              title="Pay center"
              body="Check paystubs, current hours, and payroll totals."
            />
            <QuickLink
              href="/cleaner/jobs"
              icon={Sparkles}
              title="Job board"
              body="Pick up more work when your route is light."
            />
            <QuickLink
              href="/cleaner/availability"
              icon={Clock3}
              title="Availability"
              body="Keep your preferred work windows current."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function HeroMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/70">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-sm text-white/75">{detail}</p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-brand-100 bg-brand-50/35 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-accent">{value}</p>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  body,
}: {
  href: string;
  icon: typeof CalendarDays;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[28px] border border-brand-100 bg-brand-50/30 p-5 transition hover:bg-brand-50/60 hover:shadow-md"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-accent">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </Link>
  );
}

export default CleanerHome;
