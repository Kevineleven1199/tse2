import Link from "next/link";
import { ArrowRight, CalendarClock, Clock3, Download, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { PaystubList } from "@/src/components/employee/PaystubList";
import { calculatePayroll, getCurrentPayPeriod } from "@/src/lib/payroll";
import { formatCurrency } from "@/src/lib/utils";

export const dynamic = "force-dynamic";

const formatDate = (value: Date) =>
  value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatTime = (value: Date) =>
  value.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

const formatHours = (value: number) => `${value.toFixed(1)} hrs`;

export default async function CleanerPaystubsPage() {
  const session = await requireSession({ roles: ["CLEANER", "HQ"], redirectTo: "/login" });

  const cleanerProfile = await prisma.cleanerProfile.findUnique({
    where: { userId: session.userId },
    include: {
      user: {
        select: {
          firstName: true,
        },
      },
    },
  });

  if (!cleanerProfile) {
    return (
      <Card className="overflow-hidden border-brand-100 bg-white">
        <CardContent className="mt-0 flex flex-col gap-4 p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-700">Pay Center</p>
          <h1 className="text-2xl font-semibold text-accent">We&apos;re still setting up your payroll profile.</h1>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
            Once your cleaner profile is active, this page will show your pay periods, downloadable paystubs,
            and recent hours.
          </p>
          <div>
            <Link
              href="/cleaner"
              className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-brand-700"
            >
              Back to Crew Hub
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const payPeriod = getCurrentPayPeriod();

  const [payroll, recentTimesheets, latestPaystub, pendingPayouts] = await Promise.all([
    calculatePayroll(cleanerProfile.id, payPeriod.start, payPeriod.end),
    prisma.timesheet.findMany({
      where: { cleanerId: cleanerProfile.id },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
    prisma.paystub.findFirst({
      where: { cleanerId: cleanerProfile.id },
      orderBy: { periodEnd: "desc" },
    }),
    prisma.cleanerPayout.aggregate({
      where: {
        cleanerId: cleanerProfile.id,
        status: { in: ["QUEUED", "PROCESSING"] },
      },
      _sum: { amount: true },
    }),
  ]);

  const currentHours = payroll?.totalHours ?? 0;
  const currentNet = payroll?.netPay ?? 0;
  const currentGross = payroll?.grossPay ?? 0;
  const shiftCount = payroll?.timesheets.length ?? 0;
  const pendingAmount = pendingPayouts._sum.amount ?? 0;
  const cleanerFirstName = cleanerProfile.user.firstName || "there";

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-brand-200 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_38%),linear-gradient(135deg,#134e2a_0%,#2e7d32_55%,#6cc46f_100%)] text-white shadow-[0_30px_80px_-30px_rgba(19,78,42,0.7)]">
        <div className="grid gap-8 p-6 md:p-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.38em] text-white/70">Pay Center</p>
            <div className="space-y-3">
              <h1 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
                {cleanerFirstName}, here&apos;s what this pay period looks like.
              </h1>
              <p className="max-w-2xl text-sm text-white/80 md:text-base">
                Check your current hours, expected pay, recent shifts, and finalized paystubs without leaving the
                cleaner portal.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-white/85">
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">
                Current period: {payPeriod.label}
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">
                {shiftCount} shift{shiftCount === 1 ? "" : "s"} recorded
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/cleaner/payouts"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-brand-900 transition hover:bg-brand-50"
              >
                View Deposits
              </Link>
              {latestPaystub ? (
                <a
                  href={`/api/employee/paystubs/${latestPaystub.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-white/15"
                >
                  <Download className="h-4 w-4" />
                  Latest PDF
                </a>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard label="Current Hours" value={formatHours(currentHours)} description="Logged this pay period" />
            <MetricCard label="Estimated Net" value={formatCurrency(currentNet)} description="After current adjustments" />
            <MetricCard label="Estimated Gross" value={formatCurrency(currentGross)} description="Before deductions" />
            <MetricCard label="Pending Deposits" value={formatCurrency(pendingAmount)} description="Queued or processing" />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden border-brand-100 bg-white">
          <CardHeader className="border-b border-brand-100/80 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Clock3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-accent">Recent Hours</h2>
                <p className="text-sm text-muted-foreground">
                  Your last {recentTimesheets.length || 0} completed or in-progress shifts.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="mt-0 p-6 pt-6">
            {recentTimesheets.length > 0 ? (
              <div className="space-y-3">
                {recentTimesheets.map((timesheet) => (
                  <div
                    key={timesheet.id}
                    className="rounded-3xl border border-brand-100 bg-brand-50/40 p-4 shadow-sm shadow-brand-100/20"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-accent">{formatDate(timesheet.date)}</p>
                        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                          {timesheet.source === "platform" ? "Clocked from cleaner portal" : timesheet.source}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-800">
                        {timesheet.hoursWorked ? formatHours(timesheet.hoursWorked) : "Open shift"}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      <p>Clock in: <span className="font-medium text-accent">{formatTime(timesheet.clockIn)}</span></p>
                      <p>
                        Clock out:{" "}
                        <span className="font-medium text-accent">
                          {timesheet.clockOut ? formatTime(timesheet.clockOut) : "Still running"}
                        </span>
                      </p>
                    </div>
                    {timesheet.notes ? (
                      <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-sm text-muted-foreground">
                        {timesheet.notes}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-brand-200 bg-brand-50/30 p-8 text-center text-sm text-muted-foreground">
                Completed jobs create timesheet records automatically, so your hours will appear here as soon as you
                finish your first job in the portal.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden border-brand-100 bg-white">
            <CardHeader className="border-b border-brand-100/80 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sunshine/30 text-accent">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-accent">Latest Paystub</h2>
                  <p className="text-sm text-muted-foreground">Download your most recent finalized statement.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="mt-0 p-6 pt-6">
              {latestPaystub ? (
                <div className="space-y-4">
                  <div className="rounded-3xl border border-brand-100 bg-brand-50/40 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-700">
                      {latestPaystub.periodLabel}
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-accent">
                      {formatCurrency(latestPaystub.netPay)}
                    </p>
                    <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                      <p>Total hours: <span className="font-medium text-accent">{formatHours(latestPaystub.totalHours)}</span></p>
                      <p>Status: <span className="font-medium text-accent">{latestPaystub.status}</span></p>
                    </div>
                  </div>
                  <a
                    href={`/api/employee/paystubs/${latestPaystub.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-brand-700"
                  >
                    <Download className="h-4 w-4" />
                    Open Paystub PDF
                  </a>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-brand-200 bg-brand-50/30 p-8 text-center text-sm text-muted-foreground">
                  Your first paystub will appear here once payroll closes for a completed pay period.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-brand-100 bg-white">
            <CardHeader className="border-b border-brand-100/80 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-accent">Pay Cycle Notes</h2>
                  <p className="text-sm text-muted-foreground">What to expect between shifts, payroll, and deposits.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="mt-0 p-6 pt-6">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p className="rounded-2xl bg-brand-50/40 px-4 py-3">
                  Finishing a job from the cleaner portal creates the timesheet entry automatically.
                </p>
                <p className="rounded-2xl bg-brand-50/40 px-4 py-3">
                  Deposits are tracked separately in payouts, while paystubs show the full payroll period totals.
                </p>
                <Link
                  href="/cleaner/payouts"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 transition hover:text-brand-900"
                >
                  Open payouts
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-accent">Paystub History</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            View every available pay period and download the PDF copy when you need it.
          </p>
        </div>
        <PaystubList isAdmin={false} cleaners={[]} />
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-sm text-white/75">{description}</p>
    </div>
  );
}
