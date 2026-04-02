import Link from "next/link";
import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { formatCurrency } from "@/src/lib/utils";

type AgingBucket = {
  label: string;
  count: number;
  total: number;
  invoices: {
    id: string;
    invoiceNumber: string;
    customerName: string;
    customerEmail: string;
    total: number;
    amountPaid: number;
    balance: number;
    dueDate: Date | null;
    daysOverdue: number;
  }[];
};

function getBucketIndex(daysOverdue: number): number {
  if (daysOverdue <= 0) return 0; // Current (not yet due)
  if (daysOverdue <= 30) return 1;
  if (daysOverdue <= 60) return 2;
  if (daysOverdue <= 90) return 3;
  return 4; // 90+
}

const BUCKET_LABELS = [
  "Current (Not Yet Due)",
  "1-30 Days Overdue",
  "31-60 Days Overdue",
  "61-90 Days Overdue",
  "90+ Days Overdue",
];

const BUCKET_COLORS = [
  "bg-green-50 border-green-200 text-green-700",
  "bg-yellow-50 border-yellow-200 text-yellow-700",
  "bg-orange-50 border-orange-200 text-orange-700",
  "bg-red-50 border-red-200 text-red-700",
  "bg-red-100 border-red-300 text-red-800",
];

const BADGE_COLORS = [
  "bg-green-100 text-green-700",
  "bg-yellow-100 text-yellow-700",
  "bg-orange-100 text-orange-700",
  "bg-red-100 text-red-700",
  "bg-red-200 text-red-800",
];

export default async function AgingReportPage() {
  const session = await requireSession({ roles: ["HQ"], redirectTo: "/login" });
  const tenantId = session.tenantId || process.env.DEFAULT_TENANT_ID || "ten_tse";

  try {
    const now = new Date();

    // Fetch all unpaid invoices (DRAFT, SENT, VIEWED, OVERDUE)
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        status: { in: ["SENT", "VIEWED", "OVERDUE", "DRAFT"] },
      },
      orderBy: { dueDate: "asc" },
    });

    // Build aging buckets
    const buckets: AgingBucket[] = BUCKET_LABELS.map((label) => ({
      label,
      count: 0,
      total: 0,
      invoices: [],
    }));

    for (const inv of invoices) {
      const balance = inv.total - inv.amountPaid;
      if (balance <= 0) continue;

      const dueDate = inv.dueDate || inv.createdAt;
      const daysOverdue = Math.floor(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const idx = getBucketIndex(daysOverdue);

      buckets[idx].count += 1;
      buckets[idx].total += balance;
      buckets[idx].invoices.push({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName,
        customerEmail: inv.customerEmail,
        total: inv.total,
        amountPaid: inv.amountPaid,
        balance,
        dueDate: inv.dueDate,
        daysOverdue: Math.max(0, daysOverdue),
      });
    }

    const grandTotal = buckets.reduce((sum, b) => sum + b.total, 0);
    const totalCount = buckets.reduce((sum, b) => sum + b.count, 0);

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 to-brand-700 px-8 py-12">
            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <Link
                  href="/admin/financials"
                  className="text-brand-200 transition hover:text-white"
                >
                  Financial Reports
                </Link>
                <span className="text-brand-300">/</span>
                <span className="text-white">Aging Report</span>
              </div>
              <h1 className="mt-2 text-4xl font-bold text-white">
                Accounts Receivable Aging
              </h1>
              <p className="mt-2 text-brand-100">
                {totalCount} outstanding invoice{totalCount !== 1 ? "s" : ""} totaling{" "}
                {formatCurrency(grandTotal)}
              </p>
            </div>
            <div className="absolute right-0 top-0 h-full w-1/2 opacity-10">
              <div className="h-full w-full rounded-full bg-white"></div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {buckets.map((bucket, idx) => (
            <Card
              key={bucket.label}
              className={`border ${BUCKET_COLORS[idx]}`}
            >
              <CardContent className="p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-70">
                  {bucket.label}
                </p>
                <p className="mt-2 text-2xl font-bold">
                  {formatCurrency(bucket.total)}
                </p>
                <p className="mt-1 text-sm opacity-70">
                  {bucket.count} invoice{bucket.count !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Detailed Bucket Tables */}
        {buckets.map((bucket, idx) => {
          if (bucket.invoices.length === 0) return null;
          return (
            <Card key={bucket.label} className="border border-brand-200 bg-surface">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-brand-900">
                    {bucket.label}
                  </h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${BADGE_COLORS[idx]}`}
                  >
                    {bucket.count} invoice{bucket.count !== 1 ? "s" : ""} &middot;{" "}
                    {formatCurrency(bucket.total)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-brand-200">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-brand-900">
                          Invoice #
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-brand-900">
                          Customer
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-brand-900">
                          Total
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-brand-900">
                          Paid
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-brand-900">
                          Balance
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-brand-900">
                          Due Date
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-brand-900">
                          Days Overdue
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {bucket.invoices.map((inv, i) => (
                        <tr
                          key={inv.id}
                          className={`border-b border-brand-100 transition-colors hover:bg-brand-50 ${
                            i === bucket.invoices.length - 1 ? "border-b-0" : ""
                          }`}
                        >
                          <td className="px-4 py-4 text-sm font-medium text-brand-900">
                            {inv.invoiceNumber}
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-medium text-brand-900">
                              {inv.customerName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {inv.customerEmail}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-brand-700">
                            {formatCurrency(inv.total)}
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-brand-700">
                            {formatCurrency(inv.amountPaid)}
                          </td>
                          <td className="px-4 py-4 text-right text-sm font-medium text-brand-900">
                            {formatCurrency(inv.balance)}
                          </td>
                          <td className="px-4 py-4 text-sm text-brand-700">
                            {inv.dueDate
                              ? new Date(inv.dueDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "No due date"}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {inv.daysOverdue > 0 ? (
                              <span
                                className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${BADGE_COLORS[idx]}`}
                              >
                                {inv.daysOverdue}d
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                &mdash;
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {totalCount === 0 && (
          <Card className="border border-brand-200 bg-surface">
            <CardContent className="py-12 text-center">
              <p className="text-2xl">&#10003;</p>
              <p className="mt-2 font-semibold text-green-700">All caught up!</p>
              <p className="text-sm text-muted-foreground">
                No outstanding invoices found.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  } catch (error) {
    console.error("Failed to fetch aging report:", error);
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 to-brand-700 px-8 py-12">
            <div className="relative z-10">
              <h1 className="text-4xl font-bold text-white">Accounts Receivable Aging</h1>
            </div>
          </div>
        </div>
        <Card className="border border-brand-200 bg-surface">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Error loading aging data. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
}
