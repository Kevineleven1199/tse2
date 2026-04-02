import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { formatCurrency } from "@/src/lib/utils";
import type { Prisma } from "@prisma/client";

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  NEW: { bg: "bg-blue-50", text: "text-blue-700" },
  QUOTED: { bg: "bg-amber-50", text: "text-amber-700" },
  ACCEPTED: { bg: "bg-green-50", text: "text-green-700" },
  SCHEDULED: { bg: "bg-purple-50", text: "text-purple-700" },
  COMPLETED: { bg: "bg-gray-50", text: "text-gray-600" },
  CANCELED: { bg: "bg-red-50", text: "text-red-600" },
};

const SERVICE_LABELS: Record<string, string> = {
  HOME_CLEAN: "Home Clean",
  PRESSURE_WASH: "Pressure Wash",
  AUTO_DETAIL: "Auto Detail",
  CUSTOM: "Custom",
};

function formatRelative(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(date));
}

const AdminRequestsPage = async () => {
  const session = await getSession();
  const tenantId = session?.tenantId || process.env.DEFAULT_TENANT_ID || "";

  type RequestWithQuote = Prisma.ServiceRequestGetPayload<{ include: { quote: true } }>;
  let requests: RequestWithQuote[] = [];
  let counts: Record<string, number> = {};
  let total = 0;

  try {
    const [reqs, statusCounts] = await Promise.all([
      prisma.serviceRequest.findMany({
        where: { tenantId },
        include: { quote: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.serviceRequest.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: true,
      }),
    ]);
    requests = reqs;
    for (const sc of statusCounts) {
      counts[sc.status] = sc._count;
    }
    total = statusCounts.reduce((s, c) => s + c._count, 0);
  } catch (error) {
    console.error("[requests] Failed to fetch service requests:", error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Service Requests</h1>
        <p className="text-sm text-muted">{total} total requests</p>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        {["NEW", "QUOTED", "ACCEPTED", "SCHEDULED", "COMPLETED", "CANCELED"].map((status) => {
          const style = STATUS_STYLES[status] ?? STATUS_STYLES.NEW;
          return (
            <span key={status} className={`rounded-full px-3 py-1 text-xs font-medium ${style.bg} ${style.text}`}>
              {status} ({counts[status] ?? 0})
            </span>
          );
        })}
      </div>

      {/* Request list */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center p-12 text-center">
            <div className="mb-3 text-4xl">📥</div>
            <h3 className="text-lg font-semibold text-foreground">No requests yet</h3>
            <p className="mt-1 max-w-md text-sm text-muted">
              When customers submit requests via the quote form or call in, they&apos;ll appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50/60">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted">Customer</th>
                <th className="px-4 py-3 text-left font-medium text-muted">Service</th>
                <th className="px-4 py-3 text-left font-medium text-muted">Location</th>
                <th className="px-4 py-3 text-left font-medium text-muted">Quote</th>
                <th className="px-4 py-3 text-left font-medium text-muted">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {requests.map((req) => {
                const style = STATUS_STYLES[req.status] ?? STATUS_STYLES.NEW;
                return (
                  <tr key={req.id} className="transition hover:bg-gray-50/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{req.customerName}</p>
                      <p className="text-xs text-muted">{req.customerEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {SERVICE_LABELS[req.serviceType] ?? req.serviceType}
                      {req.squareFootage && (
                        <span className="ml-1 text-xs text-muted">({req.squareFootage.toLocaleString()} sqft)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground">{req.city}, {req.state}</td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {req.quote ? formatCurrency(req.quote.total) : <span className="text-muted">--</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{formatRelative(req.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminRequestsPage;
