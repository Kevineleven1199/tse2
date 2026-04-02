import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { Card, CardContent } from "@/src/components/ui/card";
import { formatCurrency } from "@/src/lib/utils";
import type { Prisma } from "@prisma/client";
import { CleanerScheduleClient } from "./CleanerScheduleClient";

const SERVICE_LABELS: Record<string, string> = {
  HOME_CLEAN: "Home Clean",
  PRESSURE_WASH: "Pressure Wash",
  AUTO_DETAIL: "Auto Detail",
  CUSTOM: "Custom",
};

function formatDay(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" }).format(new Date(date));
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(date));
}

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

const CleanerSchedulePage = async () => {
  const session = await getSession();

  if (!session?.userId) {
    return (
      <Card className="bg-white">
        <CardContent className="p-8 text-center text-muted-foreground">Please log in to view your schedule.</CardContent>
      </Card>
    );
  }

  type AssignmentWithJob = Prisma.JobAssignmentGetPayload<{ include: { job: { include: { request: true } } } }>;
  let serialized: SerializedAssignment[] = [];

  try {
    const cleaner = await prisma.cleanerProfile.findFirst({
      where: { userId: session.userId },
    });

    if (!cleaner) {
      return (
        <Card className="bg-white">
          <CardContent className="p-8 text-center text-muted-foreground">No cleaner profile found.</CardContent>
        </Card>
      );
    }

    const now = new Date();
    const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const assignments = await prisma.jobAssignment.findMany({
      where: {
        cleanerId: cleaner.id,
        job: {
          status: { in: ["SCHEDULED", "CLAIMED"] },
          scheduledStart: { gte: now, lte: twoWeeksOut },
        },
      },
      include: {
        job: { include: { request: true } },
      },
      orderBy: { job: { scheduledStart: "asc" } },
    });

    serialized = assignments.map((a) => ({
      id: a.id,
      jobId: a.jobId,
      customerName: a.job.request.customerName,
      serviceType: a.job.request.serviceType,
      serviceLabel: SERVICE_LABELS[a.job.request.serviceType] ?? a.job.request.serviceType,
      address: `${a.job.request.addressLine1}, ${a.job.request.city}`,
      city: a.job.request.city,
      status: a.job.status,
      payoutAmount: a.job.payoutAmount ?? 0,
      estimatedHours: a.job.estimatedHours ?? 0,
      scheduledStart: a.job.scheduledStart?.toISOString() ?? null,
      scheduledEnd: a.job.scheduledEnd?.toISOString() ?? null,
      notes: a.job.request.notes,
      dayKey: a.job.scheduledStart ? formatDay(a.job.scheduledStart) : "Unscheduled",
      enRouteAt: a.enRouteAt?.toISOString() ?? null,
      clockInAt: a.clockInAt?.toISOString() ?? null,
      clockOutAt: a.clockOutAt?.toISOString() ?? null,
    }));
  } catch (error) {
    console.error("[cleaner/schedule] Failed to fetch schedule:", error);
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-semibold text-red-700">Unable to load schedule</p>
        <p className="mt-1 text-sm text-red-600">Please try refreshing the page.</p>
      </div>
    );
  }

  return <CleanerScheduleClient assignments={serialized} />;
};

export default CleanerSchedulePage;
