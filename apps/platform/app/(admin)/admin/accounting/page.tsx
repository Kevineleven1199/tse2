import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import Link from "next/link";
import { BookOpen, DollarSign, FileText, TrendingUp, TrendingDown, Receipt, ArrowRight, Wallet, CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AccountingPage() {
  const session = await requireSession({ roles: ["HQ"], redirectTo: "/login" });
  const tenantId = session.tenantId;

  // Check if chart of accounts exists
  const accountCount = await prisma.account.count({ where: { tenantId } });

  // Get recent journal entries
  const recentEntries = accountCount > 0
    ? await prisma.journalEntry.findMany({
        where: { tenantId },
        include: { account: { select: { code: true, name: true } } },
        orderBy: { date: "desc" },
        take: 10,
      })
    : [];

  // Get unpaid bills
  const unpaidBills = await prisma.bill.findMany({
    where: { tenantId, status: { in: ["unpaid", "overdue"] } },
    orderBy: { dueDate: "asc" },
    take: 5,
  });
  const totalAP = unpaidBills.reduce((s, b) => s + b.amount, 0);

  // Get unpaid invoices (AR)
  const unpaidInvoices = await prisma.invoice.findMany({
    where: { tenantId, status: { in: ["SENT", "VIEWED", "OVERDUE"] } },
    select: { total: true, amountPaid: true },
  });
  const totalAR = unpaidInvoices.reduce((s, inv) => s + (inv.total - inv.amountPaid), 0);

  // Revenue this month
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const payments = await prisma.paymentRecord.aggregate({
    where: { status: "CAPTURED", createdAt: { gte: monthStart } },
    _sum: { amount: true },
  });
  const monthRevenue = payments?._sum?.amount ?? 0;

  // Expenses this month
  const monthExpenses = await prisma.expense.aggregate({
    where: { tenantId, date: { gte: monthStart } },
    _sum: { amount: true },
  });
  const monthExp = monthExpenses._sum.amount ?? 0;

  // Chart of accounts summary
  let accountsByType: Record<string, { count: number; total: number }> = {};
  if (accountCount > 0) {
    const accounts = await prisma.account.findMany({
      where: { tenantId, active: true },
      include: { entries: { select: { debit: true, credit: true } } },
    });
    for (const a of accounts) {
      const totalDebit = a.entries.reduce((s, e) => s + e.debit, 0);
      const totalCredit = a.entries.reduce((s, e) => s + e.credit, 0);
      const isDebitNormal = a.type === "asset" || a.type === "expense";
      const balance = isDebitNormal ? totalDebit - totalCredit : totalCredit - totalDebit;
      if (!accountsByType[a.type]) accountsByType[a.type] = { count: 0, total: 0 };
      accountsByType[a.type].count++;
      accountsByType[a.type].total += balance;
    }
  }

  const fmt = (n: number) => `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-accent">Accounting</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your complete financial command center — replaces QuickBooks.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/pnl" className="rounded-full border border-brand-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-accent transition hover:bg-brand-50">
            P&L Report
          </Link>
          <Link href="/admin/expenses" className="rounded-full border border-brand-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-accent transition hover:bg-brand-50">
            Expenses
          </Link>
          <a href="/api/admin/export/quickbooks?type=invoices" className="rounded-full bg-accent px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-brand-700">
            Export CSV
          </a>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={TrendingUp} label="Revenue (MTD)" value={fmt(monthRevenue)} color="green" />
        <MetricCard icon={TrendingDown} label="Expenses (MTD)" value={fmt(monthExp)} color="red" />
        <MetricCard icon={DollarSign} label="Accounts Receivable" value={fmt(totalAR)} color="blue" />
        <MetricCard icon={CreditCard} label="Accounts Payable" value={fmt(totalAP)} color="amber" />
      </div>

      {/* Net Income Box */}
      <div className="rounded-2xl bg-gradient-to-r from-accent to-brand-700 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/60">Net Income (MTD)</p>
            <p className="mt-1 text-3xl font-bold">{fmt(monthRevenue - monthExp)}</p>
          </div>
          <Wallet className="h-12 w-12 text-white/20" />
        </div>
      </div>

      {/* Bootstrap CTA (if no accounts yet) */}
      {accountCount === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <BookOpen className="h-8 w-8 text-amber-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-amber-900">Set Up Chart of Accounts</h3>
                <p className="mt-1 text-sm text-amber-800">
                  Initialize your accounting system with a standard chart of accounts for a cleaning business.
                  This creates 24 default accounts (assets, liabilities, equity, revenue, expenses).
                </p>
                <form action="/api/admin/accounting" method="POST" className="mt-3">
                  <input type="hidden" name="action" value="bootstrap" />
                  <BootstrapButton />
                </form>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart of Accounts Summary */}
        {accountCount > 0 && (
          <Card className="bg-white">
            <CardHeader>
              <h2 className="text-lg font-semibold text-accent">Chart of Accounts</h2>
              <p className="text-sm text-muted-foreground">{accountCount} accounts active</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {(["asset", "liability", "equity", "revenue", "expense"] as const).map((type) => {
                const data = accountsByType[type];
                const labels: Record<string, string> = {
                  asset: "Assets", liability: "Liabilities", equity: "Equity",
                  revenue: "Revenue", expense: "Expenses",
                };
                const colors: Record<string, string> = {
                  asset: "text-blue-700 bg-blue-50", liability: "text-red-700 bg-red-50",
                  equity: "text-purple-700 bg-purple-50", revenue: "text-green-700 bg-green-50",
                  expense: "text-amber-700 bg-amber-50",
                };
                return (
                  <div key={type} className="flex items-center justify-between rounded-xl border border-brand-100 bg-white px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wider ${colors[type]}`}>
                        {labels[type]}
                      </span>
                      <span className="text-sm text-muted-foreground">{data?.count ?? 0} accounts</span>
                    </div>
                    <span className="font-semibold text-accent">{fmt(data?.total ?? 0)}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Unpaid Bills (AP) */}
        <Card className="bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-accent">Bills to Pay</h2>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                {unpaidBills.length} unpaid
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {unpaidBills.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No unpaid bills. You're all caught up!</p>
            ) : (
              <div className="space-y-2">
                {unpaidBills.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between rounded-xl border border-brand-100 px-4 py-3">
                    <div>
                      <p className="font-medium text-accent">{bill.vendorName}</p>
                      <p className="text-xs text-muted-foreground">{bill.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(bill.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-accent">{fmt(bill.amount)}</p>
                      <span className={`text-[10px] font-bold uppercase ${
                        bill.status === "overdue" ? "text-red-600" : "text-amber-600"
                      }`}>{bill.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Journal Entries */}
      {recentEntries.length > 0 && (
        <Card className="bg-white">
          <CardHeader>
            <h2 className="text-lg font-semibold text-accent">Recent Journal Entries</h2>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-100">
                    <th className="py-2 text-left font-semibold">Date</th>
                    <th className="py-2 text-left font-semibold">Account</th>
                    <th className="py-2 text-left font-semibold">Description</th>
                    <th className="py-2 text-right font-semibold">Debit</th>
                    <th className="py-2 text-right font-semibold">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEntries.map((e) => (
                    <tr key={e.id} className="border-b border-brand-50">
                      <td className="py-2 text-muted-foreground">{new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                      <td className="py-2"><span className="font-mono text-xs text-brand-700">{e.account.code}</span> {e.account.name}</td>
                      <td className="py-2 text-muted-foreground">{e.description}</td>
                      <td className="py-2 text-right">{e.debit > 0 ? fmt(e.debit) : ""}</td>
                      <td className="py-2 text-right">{e.credit > 0 ? fmt(e.credit) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink href="/admin/pnl" icon={FileText} label="Profit & Loss" />
        <QuickLink href="/admin/financials/aging" icon={Receipt} label="Invoice Aging" />
        <QuickLink href="/admin/job-costing" icon={DollarSign} label="Job Costing" />
        <QuickLink href="/admin/expenses" icon={CreditCard} label="Expense Manager" />
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    green: "text-green-600 bg-green-50", red: "text-red-600 bg-red-50",
    blue: "text-blue-600 bg-blue-50", amber: "text-amber-600 bg-amber-50",
  };
  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-5">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-2xl font-bold text-accent">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white p-4 transition hover:shadow-sm hover:border-brand-200 active:scale-[0.98]">
      <Icon className="h-5 w-5 text-brand-700" />
      <span className="text-sm font-semibold text-accent">{label}</span>
      <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function BootstrapButton() {
  // Client component inline — just a button that POSTs
  return (
    <a
      href="/api/admin/accounting"
      onClick={async (e) => {
        e.preventDefault();
        await fetch("/api/admin/accounting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "bootstrap" }),
        });
        window.location.reload();
      }}
      className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-amber-700 cursor-pointer"
    >
      <BookOpen className="h-3.5 w-3.5" />
      Initialize Chart of Accounts
    </a>
  );
}
