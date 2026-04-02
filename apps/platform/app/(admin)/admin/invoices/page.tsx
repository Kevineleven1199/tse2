import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import InvoicesClient from "./invoices-client";

export default async function InvoicesPage() {
  const session = await requireSession({ roles: ["HQ"], redirectTo: "/login" });
  const tenantId = session.tenantId || process.env.DEFAULT_TENANT_ID || "ten_tse";

  try {
    const [invoices, stats] = await Promise.all([
    prisma.invoice.findMany({
      where: { tenantId },
      orderBy: {
        createdAt: "desc",
      },
    }),
    (async () => {
      const total = await prisma.invoice.count({
        where: { tenantId },
      });
      const paid = await prisma.invoice.count({
        where: { tenantId, status: "PAID" },
      });
      const outstanding = await prisma.invoice.count({
        where: { tenantId, status: "SENT" },
      });
      const overdue = await prisma.invoice.count({
        where: {
          tenantId,
          status: "OVERDUE",
        },
      });
      const totalAmount = await prisma.invoice.aggregate({
        where: { tenantId },
        _sum: {
          total: true,
        },
      });
      return {
        total,
        paid,
        outstanding,
        overdue,
        totalAmount: totalAmount._sum.total || 0,
      };
      })(),
    ]);

    // Serialize Date objects to ISO strings
    const serializedInvoices = invoices.map(invoice => ({
      ...invoice,
      lineItems: invoice.lineItems as unknown,
      dueDate: invoice.dueDate?.toISOString() ?? null,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
      sentAt: invoice.sentAt?.toISOString() ?? null,
      paidAt: invoice.paidAt?.toISOString() ?? null,
    }));

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
            INVOICES
          </p>
          <h1 className="text-2xl font-semibold">Invoice Management</h1>
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
              <p className="text-sm font-medium text-muted-foreground">Paid</p>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Outstanding
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.outstanding}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <p className="text-sm font-medium text-muted-foreground">Overdue</p>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            </CardContent>
          </Card>
        </div>

        <InvoicesClient initialInvoices={serializedInvoices} />
      </div>
    );
  } catch (error) {
    console.error("Failed to load Invoices:", error);
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Invoice Management</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Failed to load data. Please try refreshing the page.
        </div>
      </div>
    );
  }
}
