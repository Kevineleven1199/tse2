import DashboardTopBar from "@/components/dashboard/top-bar";
import MetricCards from "@/components/dashboard/metric-cards";
import Pipeline from "@/components/dashboard/pipeline";
import Schedule from "@/components/dashboard/schedule";
import { resolveTenantParams, type TenantPageProps } from "@/src/lib/tenant";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/src/lib/utils";
import type { Metric } from "@/components/dashboard/metric-cards";
import type { PipelineStage } from "@/components/dashboard/pipeline";
import type { UtilizationSlot } from "@/components/dashboard/schedule";

type DashboardPageProps = TenantPageProps;

const SERVICE_LABELS: Record<string, string> = {
  HOME_CLEAN: "Home Clean",
  PRESSURE_WASH: "Pressure Wash",
  AUTO_DETAIL: "Auto Detail",
  CUSTOM: "Custom",
};

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

const DashboardPage = async ({ params }: DashboardPageProps) => {
  const { tenantSlug } = await resolveTenantParams(params);

  let tenant: Awaited<ReturnType<typeof prisma.tenant.findUnique>> = null;
  let currentMRR = 0;
  let priorMRR = 0;
  let requestCounts: { status: string; _count: number }[] = [];
  let activeCleaners = 0;
  let weekJobs: { scheduledStart: Date | null; scheduledEnd: Date | null }[] = [];

  try {
    // Resolve tenant from DB
    tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    const tenantId = tenant?.id ?? "";

    // Fetch real metrics in parallel
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);

    const [
      recentPayments,
      priorPayments,
      reqCounts,
      cleaners,
      jobs,
    ] = await Promise.all([
      prisma.paymentRecord.aggregate({
        where: { request: { tenantId }, status: "CAPTURED", postedAt: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
      }),
      prisma.paymentRecord.aggregate({
        where: { request: { tenantId }, status: "CAPTURED", postedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
        _sum: { amount: true },
      }),
      prisma.serviceRequest.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: true,
      }),
      prisma.cleanerProfile.count({
        where: { active: true, user: { tenantId } },
      }),
      prisma.job.findMany({
        where: {
          tenantId,
          scheduledStart: { gte: weekStart },
          scheduledEnd: { lte: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000) },
        },
        select: { scheduledStart: true, scheduledEnd: true },
      }),
    ]);

    currentMRR = recentPayments._sum.amount ?? 0;
    priorMRR = priorPayments._sum.amount ?? 0;
    requestCounts = reqCounts;
    activeCleaners = cleaners;
    weekJobs = jobs;
  } catch (error) {
    console.error("[dashboard] Failed to fetch dashboard data:", error);
  }

  const tenantId = tenant?.id ?? "";
  const tenantName = tenant?.name ?? tenantSlug.replace(/-/g, " ");
  const mrrDelta = priorMRR > 0 ? Math.round(((currentMRR - priorMRR) / priorMRR) * 100) : 0;

  const totalRequests = requestCounts.reduce((sum, r) => sum + r._count, 0);
  const completedRequests = requestCounts.find((r) => r.status === "COMPLETED")?._count ?? 0;

  const metrics: Metric[] = [
    {
      label: "Revenue (30d)",
      value: formatCurrency(currentMRR),
      delta: priorMRR > 0 ? `${mrrDelta >= 0 ? "+" : ""}${mrrDelta}% vs prior` : "First month",
      tone: mrrDelta >= 0 ? "positive" : "negative",
    },
    {
      label: "Total Requests",
      value: String(totalRequests),
      delta: `${completedRequests} completed`,
      tone: "neutral",
    },
    {
      label: "Active Cleaners",
      value: String(activeCleaners),
      delta: activeCleaners > 0 ? "Available" : "None registered",
      tone: activeCleaners > 0 ? "positive" : "neutral",
    },
    {
      label: "Pipeline",
      value: String(totalRequests - completedRequests),
      delta: "Open requests",
      tone: "neutral",
    },
  ];

  // Build pipeline stages from real status counts
  const statusMap = Object.fromEntries(requestCounts.map((r) => [r.status, r._count]));
  const stages: PipelineStage[] = [
    { name: "New", count: statusMap.NEW ?? 0, description: "Awaiting AI quote or manual touch" },
    { name: "Quoted", count: statusMap.QUOTED ?? 0, description: "Quote sent to customer" },
    { name: "Accepted", count: statusMap.ACCEPTED ?? 0, description: "Locked into scheduling" },
    { name: "Scheduled", count: statusMap.SCHEDULED ?? 0, description: "Calendar invites sent" },
  ];

  // Build utilization from real jobs this week
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hoursPerDay = [0, 0, 0, 0, 0, 0, 0];
  for (const job of weekJobs) {
    if (job.scheduledStart && job.scheduledEnd) {
      const dayOfWeek = new Date(job.scheduledStart).getDay();
      const hours = (new Date(job.scheduledEnd).getTime() - new Date(job.scheduledStart).getTime()) / 3600000;
      hoursPerDay[dayOfWeek] += hours;
    }
  }
  const maxHoursPerDay = Math.max(activeCleaners * 8, 8); // 8hr workday per cleaner
  const slots: UtilizationSlot[] = dayLabels.map((label, i) => ({
    label,
    utilization: Math.min(hoursPerDay[i] / maxHoursPerDay, 1),
  }));

  return (
    <div className="space-y-6">
      <DashboardTopBar tenantName={tenantName} />
      <MetricCards metrics={metrics} />
      <Pipeline stages={stages} tenantSlug={tenantSlug} />
      <Schedule slots={slots} />
    </div>
  );
};

export default DashboardPage;
