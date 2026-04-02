import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import RecurringClient from "./recurring-client";

export default async function RecurringPage() {
  await requireSession({ roles: ["HQ"], redirectTo: "/login" });

  const [schedules, stats] = await Promise.all([
    prisma.recurringSchedule.findMany({
      orderBy: {
        createdAt: "desc",
      },
    }),
    (async () => {
      const total = await prisma.recurringSchedule.count();
      const active = await prisma.recurringSchedule.count({
        where: { active: true },
      });
      const paused = await prisma.recurringSchedule.count({
        where: { active: false },
      });
      const scheduleData = await prisma.recurringSchedule.findMany();
      const totalRevenue = scheduleData.reduce(
        (sum, s) => sum + (s.basePrice || 0),
        0
      );
      return {
        total,
        active,
        paused,
        totalRevenue,
      };
    })(),
  ]);

  // Serialize Date objects to ISO strings
  const serializedSchedules = schedules.map(schedule => ({
    ...schedule,
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString(),
    startDate: schedule.startDate.toISOString(),
    nextRunDate: schedule.nextRunDate.toISOString(),
    lastRunDate: schedule.lastRunDate?.toISOString() ?? null,
    endDate: schedule.endDate?.toISOString() ?? null,
    pausedAt: schedule.pausedAt?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
          RECURRING
        </p>
        <h1 className="text-2xl font-semibold">Recurring Schedules</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-muted-foreground">Total</p>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-muted-foreground">Active</p>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.active}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-muted-foreground">Paused</p>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.paused}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalRevenue.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <RecurringClient initialSchedules={serializedSchedules} />
    </div>
  );
}
