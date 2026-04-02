import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import RefundsClient from "./refunds-client";

export default async function RefundsPage() {
  await requireSession({ roles: ["HQ"], redirectTo: "/login" });

  try {
    const refunds = await prisma.refund.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    const stats = await (async () => {
      const total = await prisma.refund.count();
      const pending = await prisma.refund.count({
        where: { status: "PENDING" },
      });
      const processed = await prisma.refund.count({
        where: { status: "PROCESSED" },
      });
      const totalAmount = refunds.reduce((sum, r) => sum + (r.amount || 0), 0);
      return {
        total,
        pending,
        processed,
        totalAmount,
      };
    })();

    // Serialize Date objects to ISO strings
    const serializedRefunds = refunds.map(refund => ({
      ...refund,
      createdAt: refund.createdAt.toISOString(),
      updatedAt: refund.updatedAt.toISOString(),
      processedAt: refund.processedAt?.toISOString() ?? null,
    }));

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
            REFUNDS
          </p>
          <h1 className="text-2xl font-semibold">Refund Management</h1>
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
              <p className="text-sm font-medium text-muted-foreground">Pending</p>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pending}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Processed
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.processed}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Total Amount
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.totalAmount.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        <RefundsClient initialRefunds={serializedRefunds} />
      </div>
    );
  } catch (error) {
    console.error("Failed to load Refunds:", error);
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Refund Management</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Failed to load data. Please try refreshing the page.
        </div>
      </div>
    );
  }
}
