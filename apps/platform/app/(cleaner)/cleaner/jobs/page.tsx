import { MapPin, Sparkles, CalendarClock, Clock3, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { formatCurrency } from "@/src/lib/utils";
import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ClaimJobButton from "@/src/components/employee/ClaimJobButton";

type PreferredWindows = {
  preferredDays?: string[];
  preferredTimes?: string[];
  addOns?: string[];
  frequency?: string;
  [key: string]: unknown;
};

const CleanerJobsPage = async () => {
  const session = await requireSession({
    roles: ["CLEANER", "HQ"],
    redirectTo: "/login",
  });

  // Get the cleaner profile
  const cleanerProfile = await prisma.cleanerProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });

  if (!cleanerProfile) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-brand-100 bg-white px-6 py-16 text-center">
          <p className="text-4xl mb-3">👋</p>
          <h2 className="text-xl font-semibold text-accent">Profile Being Set Up</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your cleaner profile is still being configured. Please check back shortly or contact the office.
          </p>
        </div>
      </div>
    );
  }

  // Query all unclaimed jobs (PENDING status with no JobAssignment records)
  // Note: Quote lives on ServiceRequest, not Job directly (Job → request → quote)
  const unclaimedJobs = await prisma.job.findMany({
    where: {
      status: "PENDING",
      assignments: {
        none: {},
      },
    },
    include: {
      request: {
        select: {
          customerName: true,
          city: true,
          serviceType: true,
          notes: true,
          preferredWindows: true,
          quote: {
            select: {
              total: true,
              smartNotes: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Query this cleaner's claimed jobs
  const claimedJobs = await prisma.job.findMany({
    where: {
      assignments: {
        some: {
          cleanerId: cleanerProfile.id,
        },
      },
    },
    include: {
      request: {
        select: {
          customerName: true,
          city: true,
          serviceType: true,
          notes: true,
          addressLine1: true,
          quote: {
            select: {
              total: true,
              smartNotes: true,
            },
          },
        },
      },
      assignments: {
        where: {
          cleanerId: cleanerProfile.id,
        },
        select: {
          claimedAt: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

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

  return (
    <div className="space-y-6">
      {/* Available Jobs Section */}
      <Card className="bg-white">
        <CardHeader className="space-y-3">
          <h1 className="text-2xl font-semibold text-accent">
            Available Jobs — Grab Now
          </h1>
          <p className="text-sm text-muted-foreground">
            First-come-first-serve. Claim a job to add it to your dashboard and
            start coordinating with the customer.
          </p>
        </CardHeader>
        <CardContent>
          {unclaimedJobs.length === 0 ? (
            <div className="rounded-2xl border border-brand-100 bg-brand-50/40 px-4 py-12 text-center text-sm text-muted-foreground">
              <p>No available jobs right now.</p>
              <p className="mt-1">
                Check back soon or enable notifications for new opportunities.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {unclaimedJobs.map((job) => {
                const preferredWindows = parsePreferredWindows(
                  job.request.preferredWindows
                );

                return (
                  <div
                    key={job.id}
                    className="space-y-4 rounded-3xl border border-brand-100 bg-white p-5 shadow-sm shadow-brand-100/60"
                  >
                    {/* Header with customer name and payout */}
                    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <h2 className="text-lg font-semibold text-accent">
                          {job.request.customerName}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          Job ID: {job.id}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm font-semibold text-brand-700">
                          <Clock3 className="h-4 w-4" />
                          {job.estimatedHours
                            ? `${job.estimatedHours.toFixed(1)} hrs`
                            : "TBD"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Est. hours
                        </p>
                      </div>
                    </div>

                    {/* Service details grid */}
                    <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                      {/* Location */}
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                        <div>
                          <p className="font-medium text-accent">Location</p>
                          <p>{job.request.city}</p>
                        </div>
                      </div>

                      {/* Service Type */}
                      <div className="flex items-start gap-2">
                        <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                        <div>
                          <p className="font-medium text-accent">Service</p>
                          <p>{formatServiceType(job.request.serviceType)}</p>
                        </div>
                      </div>

                      {/* Quote Total */}
                      {job.request.quote && (
                        <div className="flex items-start gap-2">
                          <DollarSign className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                          <div>
                            <p className="font-medium text-accent">
                              Quote Total
                            </p>
                            <p>{formatCurrency(job.request.quote.total)}</p>
                          </div>
                        </div>
                      )}

                      {/* Preferred Times */}
                      {preferredWindows.times.length > 0 && (
                        <div className="flex items-start gap-2">
                          <CalendarClock className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                          <div>
                            <p className="font-medium text-accent">
                              Preferred Times
                            </p>
                            <p className="text-xs">
                              {preferredWindows.times.join(", ")}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Preferred Days */}
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

                    {/* Customer Notes */}
                    {job.request.notes && (
                      <div className="rounded-2xl bg-brand-50/60 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
                          Customer Notes
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {job.request.notes}
                        </p>
                      </div>
                    )}

                    {/* Smart Notes from Quote */}
                    {job.request.quote?.smartNotes && (
                      <div className="rounded-2xl bg-blue-50/60 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                          AI Notes
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {job.request.quote.smartNotes}
                        </p>
                      </div>
                    )}

                    {/* Action Button */}
                    <ClaimJobButton jobId={job.id} />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Claimed Jobs Section */}
      {claimedJobs.length > 0 && (
        <Card className="bg-white">
          <CardHeader className="space-y-3">
            <h2 className="text-2xl font-semibold text-accent">My Claimed Jobs</h2>
            <p className="text-sm text-muted-foreground">
              Jobs you've successfully claimed. Coordinate scheduling and
              complete the work to earn your payout.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {claimedJobs.map((job) => {
                const assignment = job.assignments[0];
                return (
                  <div
                    key={job.id}
                    className="space-y-3 rounded-3xl border border-brand-100 bg-white p-5 shadow-sm shadow-brand-100/60"
                  >
                    {/* Header */}
                    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-accent">
                          {job.request.customerName}
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
                        <div className="flex items-center gap-1 text-sm font-semibold text-brand-700">
                          <Clock3 className="h-4 w-4" />
                          {job.estimatedHours
                            ? `${job.estimatedHours.toFixed(1)} hrs`
                            : "TBD"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Est. hours
                        </p>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                      {/* Address */}
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                        <div>
                          <p className="font-medium text-accent">Address</p>
                          <p>{job.request.addressLine1}</p>
                          <p>{job.request.city}</p>
                        </div>
                      </div>

                      {/* Service Type */}
                      <div className="flex items-start gap-2">
                        <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                        <div>
                          <p className="font-medium text-accent">Service</p>
                          <p>{formatServiceType(job.request.serviceType)}</p>
                        </div>
                      </div>

                      {/* Quote Total */}
                      {job.request.quote && (
                        <div className="flex items-start gap-2">
                          <DollarSign className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                          <div>
                            <p className="font-medium text-accent">
                              Quote Total
                            </p>
                            <p>{formatCurrency(job.request.quote.total)}</p>
                          </div>
                        </div>
                      )}

                      {/* Status */}
                      <div className="flex items-start gap-2">
                        <div>
                          <p className="font-medium text-accent">Status</p>
                          <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                            {assignment?.status || "CLAIMED"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Customer Notes */}
                    {job.request.notes && (
                      <div className="rounded-2xl bg-brand-50/60 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
                          Customer Notes
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {job.request.notes}
                        </p>
                      </div>
                    )}

                    {/* Smart Notes */}
                    {job.request.quote?.smartNotes && (
                      <div className="rounded-2xl bg-blue-50/60 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                          AI Notes
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {job.request.quote.smartNotes}
                        </p>
                      </div>
                    )}

                    {/* View Details Link */}
                    <Link
                      href={`/cleaner/jobs/${job.id}`}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700"
                    >
                      View Full Details →
                    </Link>
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

export default CleanerJobsPage;
