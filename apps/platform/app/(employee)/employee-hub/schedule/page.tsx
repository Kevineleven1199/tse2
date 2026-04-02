import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { formatCurrency } from "@/src/lib/utils";
import Link from "next/link";

const formatServiceType = (serviceType: string) => {
  const typeMap: Record<string, string> = {
    HOME_CLEAN: "Home Clean",
    PRESSURE_WASH: "Pressure Wash",
    AUTO_DETAIL: "Auto Detail",
    CUSTOM: "Custom Service",
  };
  return typeMap[serviceType] || serviceType;
};

const EmployeeSchedulePage = async () => {
  const session = await getSession();
  const isCleaner = session?.role === "CLEANER";

  // Non-cleaner roles see an overview message
  if (!isCleaner) {
    return (
      <div className="space-y-6">
        <Card className="bg-white">
          <CardHeader>
            <h1 className="text-2xl font-semibold text-accent">📅 Schedule</h1>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-brand-100 bg-brand-50/40 px-4 py-12 text-center">
              <p className="text-4xl mb-3">📊</p>
              <p className="font-semibold text-accent">Admin / Manager View</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Personal schedules are for cleaners. View the full team schedule
                in the admin dashboard.
              </p>
              <Link
                href="/admin/schedule"
                className="mt-4 inline-block rounded-full bg-brand-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Go to Team Schedule
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Cleaner: show personal schedule
  type ScheduleAssignment = {
    id: string;
    job: {
      id: string;
      status: string;
      scheduledStart: Date | null;
      scheduledEnd: Date | null;
      payoutAmount: number | null;
      request: {
        customerName: string;
        city: string;
        serviceType: string;
        addressLine1: string | null;
        notes: string | null;
      };
    };
  };

  let assignments: ScheduleAssignment[] = [];

  try {
    const cleanerProfile = session?.userId
      ? await prisma.cleanerProfile.findUnique({
          where: { userId: session.userId },
          select: { id: true },
        })
      : null;

    if (cleanerProfile) {
      const now = new Date();
      const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      assignments = await prisma.jobAssignment.findMany({
        where: {
          cleanerId: cleanerProfile.id,
          job: {
            status: { in: ["SCHEDULED", "CLAIMED"] },
            scheduledStart: { gte: now, lte: twoWeeksOut },
          },
        },
        include: {
          job: {
            include: {
              request: {
                select: {
                  customerName: true,
                  city: true,
                  serviceType: true,
                  addressLine1: true,
                  notes: true,
                },
              },
            },
          },
        },
        orderBy: { job: { scheduledStart: "asc" } },
      });
    }
  } catch (error) {
    console.error("[employee-hub/schedule] DB query failed:", error);
  }

  // Group by day
  const grouped: Record<string, ScheduleAssignment[]> = {};
  for (const a of assignments) {
    const day = a.job.scheduledStart
      ? new Date(a.job.scheduledStart).toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        })
      : "Unscheduled";
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(a);
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader className="space-y-3">
          <h1 className="text-2xl font-semibold text-accent">📅 My Schedule</h1>
          <p className="text-sm text-muted-foreground">
            Your upcoming jobs for the next 2 weeks.
          </p>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="rounded-2xl border border-brand-100 bg-brand-50/40 px-4 py-12 text-center text-sm text-muted-foreground">
              <p className="text-4xl mb-3">📅</p>
              <p className="font-semibold text-accent">No upcoming jobs</p>
              <p className="mt-1">
                Claim some open houses to fill your schedule!
              </p>
              <Link
                href="/employee-hub/jobs"
                className="mt-4 inline-block rounded-full bg-brand-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Browse Open Jobs
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([day, dayAssignments]) => (
                <div key={day}>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-600">
                    {day}
                  </h3>
                  <div className="space-y-3">
                    {dayAssignments.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-accent">
                              {a.job.request.customerName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatServiceType(a.job.request.serviceType)}
                            </p>
                            {a.job.request.addressLine1 && (
                              <p className="text-xs text-muted-foreground">
                                📍 {a.job.request.addressLine1}, {a.job.request.city}
                              </p>
                            )}
                            {a.job.scheduledStart && (
                              <p className="text-xs text-muted-foreground">
                                🕐{" "}
                                {new Date(a.job.scheduledStart).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                {a.job.scheduledEnd &&
                                  ` – ${new Date(a.job.scheduledEnd).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}`}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {a.job.payoutAmount && (
                              <span className="text-sm font-semibold text-green-600">
                                {formatCurrency(a.job.payoutAmount)}
                              </span>
                            )}
                            <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                              {a.job.status}
                            </span>
                          </div>
                        </div>
                        {a.job.request.notes && (
                          <p className="mt-2 text-xs text-muted-foreground italic">
                            Note: {a.job.request.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeSchedulePage;
