import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import RouteOptimizeClient from "./route-optimize-client";

export default async function RouteOptimizePage() {
  await requireSession({ roles: ["HQ"], redirectTo: "/login" });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const jobs = await prisma.job.findMany({
    where: {
      scheduledStart: {
        gte: today,
        lt: tomorrow,
      },
    },
    include: {
      request: true,
      assignments: true,
    },
    orderBy: {
      scheduledStart: "asc",
    },
  });

  // Serialize dates and flatten for client
  const serializedJobs = jobs.map((job) => ({
    id: job.id,
    address: `${job.request.addressLine1}, ${job.request.city}, ${job.request.state} ${job.request.postalCode}`,
    customerName: job.request.customerName,
    scheduledStart: job.scheduledStart?.toISOString() ?? null,
    status: job.status,
    assignedTo: job.assignments.length > 0 ? `${job.assignments.length} cleaner(s)` : "Unassigned",
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
          LOGISTICS
        </p>
        <h1 className="text-2xl font-semibold">Route Optimization</h1>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">
              Today&apos;s Jobs to Optimize
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{serializedJobs.length}</p>
          </CardContent>
        </Card>
      </div>

      <RouteOptimizeClient initialJobs={serializedJobs} />
    </div>
  );
}
