import Link from "next/link";
import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { formatCurrency } from "@/src/lib/utils";
import { PaymentStatus } from "@prisma/client";

type FinancialMetrics = {
  daily: number;
  weekly: number;
  monthly: number;
};

type PaymentInfo = {
  id: string;
  date: string;
  amount: number;
  type: string;
  description: string;
};

export default async function FinancialsPage() {
  const session = await requireSession({ roles: ["HQ"], redirectTo: "/login" });
  const tenantId = session.tenantId || process.env.DEFAULT_TENANT_ID || "ten_tse";

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const [todayPayments, weekPayments, monthPayments, monthPayouts] = await Promise.all([
      prisma.paymentRecord.aggregate({
        where: { request: { tenantId }, createdAt: { gte: today, lt: tomorrow }, status: PaymentStatus.CAPTURED },
        _sum: { amount: true },
      }),
      prisma.paymentRecord.aggregate({
        where: { request: { tenantId }, createdAt: { gte: weekStart, lt: tomorrow }, status: PaymentStatus.CAPTURED },
        _sum: { amount: true },
      }),
      prisma.paymentRecord.aggregate({
        where: { request: { tenantId }, createdAt: { gte: monthStart, lt: tomorrow }, status: PaymentStatus.CAPTURED },
        _sum: { amount: true },
      }),
      prisma.cleanerPayout.aggregate({
        where: { job: { tenantId }, createdAt: { gte: monthStart, lt: tomorrow } },
        _sum: { amount: true },
      }),
    ]);

    const revenueMetrics: FinancialMetrics = {
      daily: todayPayments._sum.amount || 0,
      weekly: weekPayments._sum.amount || 0,
      monthly: monthPayments._sum.amount || 0,
    };

    const monthPayoutAmount = monthPayouts._sum.amount || 0;
    const netProfit = revenueMetrics.monthly - monthPayoutAmount;

    // Fetch recent payments with their service request for customer name
    const recentPayments = await prisma.paymentRecord.findMany({
      where: { request: { tenantId }, status: PaymentStatus.CAPTURED },
      include: {
        request: {
          select: { customerName: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const paymentsList: PaymentInfo[] = recentPayments.map((payment) => ({
      id: payment.id,
      date: new Date(payment.createdAt).toLocaleDateString(),
      amount: payment.amount,
      type: payment.deposit ? "Deposit" : "Payment",
      description: payment.request?.customerName || "Payment",
    }));

    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 to-brand-700 px-8 py-12">
            <div className="relative z-10">
              <h1 className="text-4xl font-bold text-white">Financial Reports</h1>
              <p className="mt-2 text-brand-100">
                Comprehensive overview of revenue, payouts, and profitability
              </p>
            </div>
            <div className="absolute right-0 top-0 h-full w-1/2 opacity-10">
              <div className="h-full w-full rounded-full bg-white"></div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border border-brand-200 bg-surface">
            <CardHeader className="pb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Daily Revenue</h3>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-bold text-brand-700">
                {formatCurrency(revenueMetrics.daily)}
              </div>
              <div className="text-xs text-muted-foreground">Today</div>
            </CardContent>
          </Card>

          <Card className="border border-brand-200 bg-surface">
            <CardHeader className="pb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Weekly Revenue</h3>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-bold text-brand-700">
                {formatCurrency(revenueMetrics.weekly)}
              </div>
              <div className="text-xs text-muted-foreground">This week</div>
            </CardContent>
          </Card>

          <Card className="border border-brand-200 bg-surface">
            <CardHeader className="pb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Monthly Revenue</h3>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-bold text-brand-700">
                {formatCurrency(revenueMetrics.monthly)}
              </div>
              <div className="text-xs text-muted-foreground">This month</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/admin/financials/aging"
            className="group flex items-center gap-3 rounded-2xl border border-brand-200 bg-surface p-4 transition hover:border-brand-400 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 group-hover:bg-amber-200">
              <span className="text-lg">&#128203;</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-900">Accounts Receivable Aging</p>
              <p className="text-xs text-muted-foreground">View overdue invoices by age bucket</p>
            </div>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border border-brand-200 bg-surface">
            <CardHeader className="pb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Total Revenue</h3>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-700">
                {formatCurrency(revenueMetrics.monthly)}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-brand-200 bg-surface">
            <CardHeader className="pb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Cleaner Payouts</h3>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(monthPayoutAmount)}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-brand-200 bg-surface">
            <CardHeader className="pb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Net Profit</h3>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(netProfit)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-brand-200 bg-surface">
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-900">Recent Payments</h2>
            <p className="mt-1 text-sm text-muted-foreground">Latest completed payments</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-brand-900">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-brand-900">Description</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-brand-900">Type</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-brand-900">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No payments yet
                      </td>
                    </tr>
                  ) : (
                    paymentsList.map((payment, index) => (
                      <tr
                        key={payment.id}
                        className={`border-b border-brand-100 transition-colors hover:bg-brand-50 ${
                          index === paymentsList.length - 1 ? "border-b-0" : ""
                        }`}
                      >
                        <td className="px-4 py-4 text-sm font-medium text-brand-900">{payment.date}</td>
                        <td className="px-4 py-4 text-sm text-brand-700">{payment.description}</td>
                        <td className="px-4 py-4 text-sm text-brand-700">{payment.type}</td>
                        <td className="px-4 py-4 text-right text-sm font-medium text-green-600">
                          {formatCurrency(payment.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error("Failed to fetch financial data:", error);
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 to-brand-700 px-8 py-12">
            <div className="relative z-10">
              <h1 className="text-4xl font-bold text-white">Financial Reports</h1>
            </div>
          </div>
        </div>

        <Card className="border border-brand-200 bg-surface">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Error loading financial data. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
}
