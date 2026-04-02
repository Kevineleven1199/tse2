import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/src/components/ui/card";
import { ScheduleView } from "@/app/(admin)/admin/schedule/ScheduleView";
import type { CalendarJob } from "@/src/components/schedule/types";

export default async function ManagerSchedulePage() {
  const session = await requireSession({ roles: ["MANAGER", "HQ"], redirectTo: "/manager" });
  const tenantId = session.tenantId || process.env.DEFAULT_TENANT_ID || "ten_tse";

  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);

    const jobs = await prisma.job.findMany({
      where: {
        tenantId,
        status: { in: ["PENDING", "CLAIMED", "SCHEDULED", "COMPLETED"] },
        scheduledStart: { gte: monthStart, lte: nextMonthEnd },
      },
      include: {
        request: {
          select: {
            customerName: true,
            serviceType: true,
            addressLine1: true,
            notes: true,
          },
        },
        assignments: {
          include: {
            cleaner: {
              include: {
                user: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
      orderBy: { scheduledStart: "asc" },
    });

    const scheduledJobs: CalendarJob[] = jobs
      .filter((job) => job.scheduledStart)
      .map((job) => {
        const scheduledStart = new Date(job.scheduledStart!);
        const scheduledEnd = job.scheduledEnd ? new Date(job.scheduledEnd) : scheduledStart;
        const dateKey = scheduledStart.toISOString().split("T")[0];

        const firstAssignment = job.assignments[0];
        const cleanerName = firstAssignment?.cleaner?.user
          ? `${firstAssignment.cleaner.user.firstName} ${firstAssignment.cleaner.user.lastName}`.trim()
          : "Unassigned";

        return {
          id: job.id,
          date: dateKey,
          customer: job.request?.customerName || "Unknown Customer",
          cleaner: cleanerName,
          cleanerId: firstAssignment?.cleanerId,
          service: job.request?.serviceType || "Service",
          status: job.status,
          startTime: scheduledStart.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          endTime: scheduledEnd.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          scheduledStartISO: scheduledStart.toISOString(),
          scheduledEndISO: scheduledEnd.toISOString(),
          address: job.request?.addressLine1 || undefined,
          notes: job.request?.notes || undefined,
          payoutAmount: job.payoutAmount ?? undefined,
        };
      });

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
              Schedule Management
            </p>
            <h1 className="text-2xl font-semibold">Job Calendar</h1>
            <p className="mt-1 text-sm text-brand-100">
              View and manage all scheduled jobs
            </p>
          </div>
        </div>

        <ScheduleView jobs={scheduledJobs} />
      </div>
    );
  } catch (error) {
    console.error("Failed to fetch schedule:", error);
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
              Schedule Management
            </p>
            <h1 className="text-2xl font-semibold">Job Calendar</h1>
          </div>
        </div>
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Error loading schedule. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
}
