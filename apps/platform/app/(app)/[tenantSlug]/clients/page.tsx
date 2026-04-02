import ClientTable from "@/components/clients/table";
import { resolveTenantParams, type TenantPageProps } from "@/src/lib/tenant";
import { prisma } from "@/lib/prisma";
import type { ClientRow } from "@/components/clients/table";

const ClientsPage = async ({ params }: TenantPageProps) => {
  const { tenantSlug } = await resolveTenantParams(params);

  let tenant: Awaited<ReturnType<typeof prisma.tenant.findUnique>> = null;
  let clients: ClientRow[] = [];

  try {
    tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    const tenantId = tenant?.id ?? "";

    const customers = await prisma.user.findMany({
      where: { tenantId, role: "CUSTOMER" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const customerEmails = customers.map((c) => c.email);
    const requestCounts = await prisma.serviceRequest.groupBy({
      by: ["customerEmail"],
      where: { tenantId, customerEmail: { in: customerEmails } },
      _count: true,
    });
    const countMap = Object.fromEntries(requestCounts.map((r) => [r.customerEmail, r._count]));

    clients = customers.map((c) => ({
      name: `${c.firstName} ${c.lastName}`,
      email: c.email,
      phone: c.phone ?? "",
      jobCount: countMap[c.email] ?? 0,
      status: c.status,
    }));
  } catch (error) {
    console.error("[clients] Failed to fetch clients:", error);
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
        <h1 className="font-display text-3xl">Clients &amp; memberships</h1>
        <p className="mt-2 max-w-3xl text-sm text-white/70">
          {clients.length} customer{clients.length !== 1 ? "s" : ""} registered for {tenant?.name ?? tenantSlug}.
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/50">Tenant &bull; {tenant?.name ?? tenantSlug}</p>
      </header>
      <ClientTable clients={clients} />
    </div>
  );
};

export default ClientsPage;
