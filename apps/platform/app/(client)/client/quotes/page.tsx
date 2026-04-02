import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { getSession } from "@/src/lib/auth/session";
import { getClientPortalData } from "@/src/lib/client-portal";
import { formatCurrency } from "@/src/lib/utils";

const statusCopy: Record<string, string> = {
  NEW: "Awaiting confirmation",
  QUOTED: "Quote sent",
  ACCEPTED: "Scheduled",
  SCHEDULED: "On calendar",
  COMPLETED: "Completed",
  CANCELED: "Canceled"
};

const ClientQuotesPage = async () => {
  const session = await getSession();
  if (!session) return null;

  const portal = await getClientPortalData(session.userId);

  return (
    <Card className="bg-white">
      <CardHeader>
        <h1 className="text-2xl font-semibold text-accent">Quotes & proposals</h1>
        <p className="text-sm text-muted-foreground">Approve, compare, and monitor every quote Tri State has prepared for you.</p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        {portal.quotes.length === 0 ? (
          <EmptyState
            variant="inline"
            title="No quotes yet"
            description="Once you request a service, new proposals will appear here for quick review."
            action={{ label: "Request a quote", href: "/request" }}
          />
        ) : (
          <div className="divide-y divide-brand-100">
            {portal.quotes.map((quote) => (
              <div key={quote.quoteId} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="text-sm font-semibold text-accent">{quote.service}</p>
                  <p className="text-xs text-muted-foreground">Quote #{quote.quoteId.slice(0, 6)}</p>
                </div>
                <p className="text-base font-semibold text-accent">{formatCurrency(quote.total)}</p>
                <span className="rounded-full border border-brand-100 px-3 py-1 text-xs uppercase tracking-[0.25em] text-accent">
                  {statusCopy[quote.status] ?? quote.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientQuotesPage;
