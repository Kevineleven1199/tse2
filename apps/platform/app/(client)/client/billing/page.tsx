import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { getSession } from "@/src/lib/auth/session";
import { getClientPortalData } from "@/src/lib/client-portal";
import { formatCurrency } from "@/src/lib/utils";
import { InvoicePaymentButton } from "@/src/components/payments/InvoicePaymentButton";

const ClientBillingPage = async () => {
  const session = await getSession();
  if (!session) return null;

  const portal = await getClientPortalData(session.userId);

  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader>
          <h1 className="text-2xl font-semibold text-accent">Billing & Payments</h1>
          <p className="text-sm text-muted-foreground">Securely pay deposits, settle invoices, and download receipts whenever you need.</p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          {portal.outstandingInvoices.length === 0 ? (
            <EmptyState
              variant="inline"
              title="No outstanding invoices"
              description="You’re all caught up. Receipts and cleared payments will show below."
            />
          ) : (
            <div className="space-y-3">
              {portal.outstandingInvoices.map((invoice) => (
                <div key={invoice.quoteId} className="flex flex-wrap items-center gap-4 rounded-3xl border border-brand-100 bg-brand-50/30 p-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-accent">{invoice.service}</p>
                    <p className="text-xs text-muted-foreground">Quote #{invoice.quoteId.slice(0, 6)} • {invoice.city}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-accent/70">Balance</p>
                    <p className="text-xl font-semibold text-accent">{formatCurrency(invoice.balance)}</p>
                  </div>
                  <InvoicePaymentButton quoteId={invoice.quoteId} amount={invoice.balance} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <h2 className="text-xl font-semibold text-accent">Payment history</h2>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {portal.paidInvoices.length === 0 ? (
            <EmptyState
              variant="inline"
              title="No payments logged yet"
              description="Receipts will show up here once we log your payments."
            />
          ) : (
            portal.paidInvoices.map((invoice) => (
              <div key={invoice.quoteId} className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-50 pb-3">
                <div>
                  <p className="text-sm font-semibold text-accent">{invoice.service}</p>
                  <p className="text-xs text-muted-foreground">Quote #{invoice.quoteId.slice(0, 6)}</p>
                </div>
                <p className="text-sm font-semibold text-accent">{formatCurrency(invoice.total)}</p>
                <span className="text-xs uppercase tracking-[0.3em] text-brand-600">Paid</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientBillingPage;
