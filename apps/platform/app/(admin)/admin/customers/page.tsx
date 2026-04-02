import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import CustomersPageClient from "./customers-client";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  totalJobs: number;
  totalSpent: number;
  lastService: string | null;
  status: string;
  tags: string[];
  createdAt: string;
}

interface CustomerStats {
  totalCustomers: number;
  activeThisMonth: number;
  avgLifetimeValue: number;
  churnRate: number;
}

export default async function CustomersPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession({ roles: ["HQ"], redirectTo: "/login" });
  const tenantId = session.tenantId || process.env.DEFAULT_TENANT_ID || "ten_tse";

  try {
    // Fetch all service requests to build customer data
    const serviceRequests = await prisma.serviceRequest.findMany({
      where: { tenantId },
      include: {
        job: {
          include: {
            assignments: true,
          },
        },
        quote: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group by email to get unique customers
    const customerMap = new Map<string, Customer>();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const request of serviceRequests) {
      const key = request.customerEmail;

      if (!customerMap.has(key)) {
        const createdAt = new Date(request.createdAt);
        const isNew = createdAt > thirtyDaysAgo;

        customerMap.set(key, {
          id: request.id,
          email: request.customerEmail,
          firstName: request.customerName.split(" ")[0] || "Unknown",
          lastName:
            request.customerName.split(" ").slice(1).join(" ") ||
            "Customer",
          phone: request.customerPhone || null,
          address: request.addressLine1 || undefined,
          city: request.city || undefined,
          state: request.state || undefined,
          postalCode: request.postalCode || undefined,
          totalJobs: 0,
          totalSpent: 0,
          lastService: null,
          status: isNew ? "new" : "active",
          tags: [],
          createdAt: request.createdAt.toISOString(),
        });
      }

      const customer = customerMap.get(key)!;
      customer.totalJobs += 1;

      if (request.quote) {
        customer.totalSpent += request.quote.total || 0;
      }

      if (request.job?.scheduledStart) {
        const jobDate = new Date(request.job.scheduledStart).toISOString();
        if (!customer.lastService || jobDate > customer.lastService) {
          customer.lastService = jobDate;
        }
      }
    }

    const customers = Array.from(customerMap.values());

    // Calculate stats
    const activeThisMonth = customers.filter((c) => {
      if (!c.lastService) return false;
      const lastServiceDate = new Date(c.lastService);
      return lastServiceDate > thirtyDaysAgo;
    }).length;

    const ninetyDaysAgo = new Date(
      now.getTime() - 90 * 24 * 60 * 60 * 1000
    );
    const inactiveCount = customers.filter(
      (c) =>
        !c.lastService || new Date(c.lastService) <= ninetyDaysAgo
    ).length;

    const totalSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0);
    const avgLifetimeValue =
      customers.length > 0 ? totalSpent / customers.length : 0;

    const churnRate =
      customers.length > 0 ? inactiveCount / customers.length : 0;

    const stats: CustomerStats = {
      totalCustomers: customers.length,
      activeThisMonth,
      avgLifetimeValue,
      churnRate,
    };

    return (
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
              Customer Management
            </p>
            <h1 className="text-2xl font-semibold">Customers</h1>
            <p className="mt-1 text-sm text-brand-100">
              Manage your customer database and service history
            </p>
          </div>
        </div>

        {/* Client Component */}
        <CustomersPageClient
          initialCustomers={customers}
          initialStats={stats}
        />
      </div>
    );
  } catch (error) {
    console.error("Failed to fetch customers:", error);
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
              Customer Management
            </p>
            <h1 className="text-2xl font-semibold">Customers</h1>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-12">
          <div className="text-center">
            <p className="text-muted-foreground">
              Error loading customers. Please try again later.
            </p>
          </div>
        </div>
      </div>
    );
  }
}
