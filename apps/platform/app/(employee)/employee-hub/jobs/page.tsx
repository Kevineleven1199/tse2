import { MapPin, Sparkles, CalendarClock, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { formatCurrency } from "@/src/lib/utils";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { SyncJobberButton } from "@/src/components/employee/SyncJobberButton";
import ClaimJobButton from "@/src/components/employee/ClaimJobButton";

type PreferredWindows = {
  preferredDays?: string[];
  preferredTimes?: string[];
  addOns?: string[];
  frequency?: string;
  [key: string]: unknown;
};

const formatServiceType = (serviceType: string) => {
  const typeMap: Record<string, string> = {
    HOME_CLEAN: "Home Clean",
    PRESSURE_WASH: "Pressure Wash",
    AUTO_DETAIL: "Auto Detail",
    CUSTOM: "Custom Service",
  };
  return typeMap[serviceType] || serviceType;
};

const parsePreferredWindows = (
  windows: unknown
): { days: string[]; times: string[] } => {
  if (!windows || typeof windows !== "object") {
    return { days: [], times: [] };
  }
  const parsed = windows as PreferredWindows;
  return {
    days: Array.isArray(parsed.preferredDays) ? parsed.preferredDays : [],
    times: Array.isArray(parsed.preferredTimes) ? parsed.preferredTimes : [],
  };
};

const EmployeeJobsPage = async () => {
  const session = await getSession();
  const isCleaner = session?.role === "CLEANER";
  const isAdmin = session?.role === "HQ" || session?.role === "MANAGER";

  /* eslint-disable @typescript-eslint/no-explicit-any */
  let unclaimedJobs: any[] = [];
  let claimedJobs: any[] = [];
  /* eslint-enable @typescript-eslint/no-explicit-any */
  let cleanerProfileId: string | null = null;

  try {
    // Query all unclaimed jobs
    unclaimedJobs = await prisma.job.findMany({
      where: {
        status: "PENDING",
        assignments: { none: {} },
      },
      include: {
        request: {
          select: {
            customerName: true,
            city: true,
            serviceType: true,
            notes: true,
            preferredWindows: true,
            quote: { select: { total: true, smartNotes: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // If cleaner, also get their claimed jobs
    if (isCleaner && session?.userId) {
      const cleanerProfile = await prisma.cleanerProfile.findUnique({
        where: { userId: session.userId },
        select: { id: true },
      });

      if (cleanerProfile) {
        cleanerProfileId = cleanerProfile.id;
        claimedJobs = await prisma.job.findMany({
          where: {
            assignments: { some: { cleanerId: cleanerProfile.id } },
          },
          include: {
            request: {
              select: {
                customerName: true,
                city: true,
                serviceType: true,
                notes: true,
                addressLine1: true,
                quote: { select: { total: true, smartNotes: true } },
              },
            },
            assignments: {
              where: { cleanerId: cleanerProfile.id },
              select: { claimedAt: true, status: true },
            },
          },
          orderBy: { createdAt: "desc" },
        });
      }
    }
  } catch (error) {
    console.error("[employee-hub/jobs] DB query failed:", error);
  }

  return (
    <div className="space-y-6">
      {/* Available Jobs */}
      <Card className="bg-white">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-accent">
                🏠 Open Houses — Grab Now
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isCleaner
                  ? "First-come-first-serve. Claim a job to add it to your schedule."
                  : "View all open jobs waiting for assignment."}
              </p>
            </div>
            {isAdmin && <SyncJobberButton />}
          </div>
        </CardHeader>
        <CardContent>
          {unclaimedJobs.length === 0 ? (
            <div className="rounded-2xl border border-brand-100 bg-brand-50/40 px-4 py-12 text-center text-sm text-muted-foreground">
              <p className="text-4xl mb-3">🏡</p>
              <p>No available jobs right now.</p>
              <p className="mt-1">
                Check back soon — new houses get posted regularly.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {unclaimedJobs.map((job) => {
                const req = job.request as {
                  customerName: string;
                  city: string;
                  serviceType: string;
                  notes: string | null;
                  preferredWindows: unknown;
                  quote: { total: number; smartNotes: string | null } | null;
                };
                const preferredWindows = parsePreferredWindows(req.preferredWindows);

                return (
                  <div
                    key={job.id}
                    className="space-y-4 rounded-3xl border border-brand-100 bg-white p-5 shadow-sm shadow-brand-100/60"
                  >
                    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <h2 className="text-lg font-semibold text-accent">
                          {req.customerName}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          Job ID: {job.id.slice(0, 8)}...
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                          <DollarSign className="h-4 w-4" />
                          {job.payoutAmount
                            ? formatCurrency(job.payoutAmount)
                            : "TBD"}
                        </div>
                        <p className="text-xs text-muted-foreground">Payout</p>
                      </div>
                    </div>

                    <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                        <div>
                          <p className="font-medium text-accent">Location</p>
                          <p>{req.city}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                        <div>
                          <p className="font-medium text-accent">Service</p>
                          <p>{formatServiceType(req.serviceType)}</p>
                        </div>
                      </div>
                      {req.quote && (
                        <div className="flex items-start gap-2">
                          <DollarSign className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                          <div>
                            <p className="font-medium text-accent">Quote Total</p>
                            <p>{formatCurrency(req.quote.total)}</p>
                          </div>
                        </div>
                      )}
                      {preferredWindows.times.length > 0 && (
                        <div className="flex items-start gap-2">
                          <CalendarClock className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                          <div>
                            <p className="font-medium text-accent">Preferred Times</p>
                            <p className="text-xs">{preferredWindows.times.join(", ")}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {preferredWindows.days.length > 0 && (
                      <div className="rounded-2xl bg-brand-50/60 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
                          Preferred Days
                        </p>
                        <p className="mt-1 text-sm text-accent">
                          {preferredWindows.days.join(", ")}
                        </p>
                      </div>
                    )}

                    {req.notes && (
                      <div className="rounded-2xl bg-brand-50/60 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
                          Customer Notes
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {req.notes}
                        </p>
                      </div>
                    )}

                    {req.quote?.smartNotes && (
                      <div className="rounded-2xl bg-blue-50/60 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                          AI Notes
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {req.quote.smartNotes}
                        </p>
                      </div>
                    )}

                    {isCleaner ? (
                      <ClaimJobButton jobId={job.id} />
                    ) : (
                      <div className="rounded-xl bg-brand-50 px-4 py-2 text-center text-sm text-muted-foreground">
                        Viewing as {session?.role === "HQ" ? "Admin" : "Manager"} — only cleaners can claim jobs
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Claimed Jobs (cleaners only) */}
      {isCleaner && claimedJobs.length > 0 && (
        <Card className="bg-white">
          <CardHeader className="space-y-3">
            <h2 className="text-2xl font-semibold text-accent">My Claimed Jobs</h2>
            <p className="text-sm text-muted-foreground">
              Jobs you&apos;ve claimed. Complete the work to earn your payout.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {claimedJobs.map((job) => {
                const req = job.request as {
                  customerName: string;
                  city: string;
                  serviceType: string;
                  notes: string | null;
                  addressLine1: string | null;
                  quote: { total: number; smartNotes: string | null } | null;
                };
                const assignments = (job as { assignments?: { claimedAt: Date | null; status: string }[] }).assignments;
                const assignment = assignments?.[0];

                return (
                  <div
                    key={job.id}
                    className="space-y-3 rounded-3xl border border-brand-100 bg-white p-5 shadow-sm shadow-brand-100/60"
                  >
                    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-accent">
                          {req.customerName}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Claimed:{" "}
                          {assignment?.claimedAt
                            ? new Date(assignment.claimedAt).toLocaleString([], {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "Recently"}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                          <DollarSign className="h-4 w-4" />
                          {job.payoutAmount
                            ? formatCurrency(job.payoutAmount)
                            : "TBD"}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                        <div>
                          <p className="font-medium text-accent">Address</p>
                          <p>{req.addressLine1}</p>
                          <p>{req.city}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                        <div>
                          <p className="font-medium text-accent">Service</p>
                          <p>{formatServiceType(req.serviceType)}</p>
                        </div>
                      </div>
                    </div>

                    <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                      {assignment?.status || "CLAIMED"}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmployeeJobsPage;
