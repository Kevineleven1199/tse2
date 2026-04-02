import RequestTable from "@/components/dashboard/request-table";
import { resolveTenantParams, type TenantPageProps } from "@/src/lib/tenant";
import { prisma } from "@/lib/prisma";
import type { RequestRow } from "@/components/dashboard/request-table";

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

const RequestsPage = async ({ params }: TenantPageProps) => {
  const { tenantSlug } = await resolveTenantParams(params);

  let tenant: Awaited<ReturnType<typeof prisma.tenant.findUnique>> = null;
  let requests: RequestRow[] = [];

  try {
    tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    const tenantId = tenant?.id ?? "";

    const serviceRequests = await prisma.serviceRequest.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    requests = serviceRequests.map((r) => ({
      id: r.id,
      customer: r.customerName,
      service: SERVICE_LABELS[r.serviceType] ?? r.serviceType,
      submittedAt: formatRelativeTime(r.createdAt),
      status: r.status,
    }));
  } catch (error) {
    console.error("[requests] Failed to fetch requests:", error);
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
        <h1 className="font-display text-3xl">Quote queue</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/70">
          Every incoming lead flows here first. Your AI quote engine evaluates size, surfaces, travel time, and margin targets before sending polished
          proposals out via OpenPhone SMS.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/60">
          <span className="rounded-full border border-white/20 px-3 py-1">Tenant: {tenant?.name ?? tenantSlug}</span>
          <span className="rounded-full border border-white/20 px-3 py-1">{requests.length} request{requests.length !== 1 ? "s" : ""}</span>
        </div>
      </header>
      <RequestTable requests={requests} />
    </div>
  );
};

export default RequestsPage;
