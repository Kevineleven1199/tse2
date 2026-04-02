import MarketplaceBoard from "@/components/marketplace/board";
import { resolveTenantParams, type TenantPageProps } from "@/src/lib/tenant";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/src/lib/utils";
import type { MarketplaceJob } from "@/components/marketplace/board";

const SERVICE_LABELS: Record<string, string> = {
  HOME_CLEAN: "Home Clean",
  PRESSURE_WASH: "Pressure Wash",
  AUTO_DETAIL: "Auto Detail",
  CUSTOM: "Custom",
};

function formatJobTime(date: Date): string {
  const now = new Date();
  const diff = new Date(date).getTime() - now.getTime();
  const hours = diff / 3600000;
  const days = Math.floor(hours / 24);

  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(date));

  if (days === 0) return `Today ${time}`;
  if (days === 1) return `Tomorrow ${time}`;
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(date));
  return `${day} ${time}`;
}

const MarketplacePage = async ({ params }: TenantPageProps) => {
  const { tenantSlug } = await resolveTenantParams(params);

  let tenant: Awaited<ReturnType<typeof prisma.tenant.findUnique>> = null;
  let marketplaceJobs: MarketplaceJob[] = [];
  let onlineCrews = 0;

  try {
    tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    const tenantId = tenant?.id ?? "";

    const [jobs, crews] = await Promise.all([
      prisma.job.findMany({
        where: {
          tenantId,
          status: { in: ["PENDING", "CLAIMED", "SCHEDULED"] },
        },
        include: { request: true },
        orderBy: { scheduledStart: "asc" },
        take: 20,
      }),
      prisma.cleanerProfile.count({
        where: { active: true, user: { tenantId } },
      }),
    ]);
    onlineCrews = crews;

    marketplaceJobs = jobs.map((job) => {
      const durationHrs = job.scheduledStart && job.scheduledEnd
        ? Math.round((new Date(job.scheduledEnd).getTime() - new Date(job.scheduledStart).getTime()) / 3600000)
        : 0;

      return {
        id: job.id,
        type: SERVICE_LABELS[job.request.serviceType] ?? job.request.serviceType,
        payout: formatCurrency(job.payoutAmount ?? 0),
        duration: durationHrs > 0 ? `${durationHrs}h` : "TBD",
        location: `${job.request.city}, ${job.request.state}`,
        start: job.scheduledStart ? formatJobTime(job.scheduledStart) : "Not scheduled",
        status: job.status,
      };
    });
  } catch (error) {
    console.error("[marketplace] Failed to fetch marketplace data:", error);
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
        <h1 className="font-display text-3xl">Cleaner marketplace</h1>
        <p className="mt-2 max-w-3xl text-sm text-white/70">
          Jobs are released to pre-vetted crews and auto-claimed based on rating, travel time, and specialization. Every payout automatically
          splits 65% to your cleaner via Wise, Zelle, or PayPal with 1099 tracking.
        </p>
        <div className="mt-4 inline-flex items-center gap-3 rounded-full border border-white/20 px-4 py-2 text-xs text-white/60">
          <span className="font-semibold text-white/80">Tenant</span>{" "}
          {tenant?.name ?? tenantSlug}
          <span className="h-1 w-1 rounded-full bg-white/20" />
          {marketplaceJobs.length} open job{marketplaceJobs.length !== 1 ? "s" : ""}
        </div>
      </header>
      <MarketplaceBoard jobs={marketplaceJobs} onlineCrews={onlineCrews} />
    </div>
  );
};

export default MarketplacePage;
