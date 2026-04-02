'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, Info, Loader2, RefreshCcw, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { cn, formatCurrency } from "@/src/lib/utils";

type PayoutItem = {
  id: string;
  amount: number;
  formattedAmount: string;
  currency: string;
  status: "QUEUED" | "PROCESSING" | "SENT" | "FAILED";
  initiatedAt?: string | null;
  completedAt?: string | null;
  formattedInitiatedAt?: string | null;
  formattedCompletedAt?: string | null;
  customerName?: string;
  serviceType?: string;
};

type PayoutResponse = {
  cleanerId: string;
  upcoming: PayoutItem[];
  history: PayoutItem[];
  totals: {
    lifetimeEarnings: string;
    pending: string;
    completed: string;
  };
};

const CleanerPayoutsPage = () => {
  const [cleanerId, setCleanerId] = useState<string>("");
  const [hqView, setHqView] = useState(false);
  const [payouts, setPayouts] = useState<PayoutResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPayouts = useCallback(async (id?: string) => {
    try {
      setLoading(true);

      if (id) {
        setHqView(true);
      }

      const url = id
        ? `/api/cleaner/payouts?cleanerId=${encodeURIComponent(id)}`
        : "/api/cleaner/payouts";

      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        const message = data.error ?? "Unable to load payout history.";

        if (!id && message === "Missing cleanerId.") {
          setHqView(true);
        }

        throw new Error(message);
      }
      const data = (await response.json()) as PayoutResponse;
      setPayouts(data);
      setCleanerId(data.cleanerId);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to load payout history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayouts();
  }, [loadPayouts]);

  const handleSubmitCleanerId = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cleanerId) {
      setError("Enter your cleaner ID to view payouts.");
      return;
    }
    loadPayouts(cleanerId);
  };

  const monthToDateEarnings = useMemo(() => {
    if (!payouts?.history) return formatCurrency(0);
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const total = payouts.history.reduce((sum, payout) => {
      if (!payout.completedAt) return sum;
      const completed = new Date(payout.completedAt);
      if (Number.isNaN(completed.getTime())) return sum;

      if (completed.getMonth() === currentMonth && completed.getFullYear() === currentYear) {
        return sum + payout.amount;
      }
      return sum;
    }, 0);
    return formatCurrency(total);
  }, [payouts]);

  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader className="space-y-3">
          <h1 className="text-2xl font-semibold text-accent">Payouts</h1>
          <p className="text-sm text-muted-foreground">
            Track deposits from Stripe or PayPal, see what’s pending, and download statements for bookkeeping.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {hqView ? (
            <form className="flex flex-col gap-3 rounded-2xl border border-brand-100/60 bg-brand-50/40 p-4 sm:flex-row" onSubmit={handleSubmitCleanerId}>
              <input
                className="flex-1 rounded-xl border border-brand-100 bg-white px-4 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
                placeholder="Cleaner profile ID (e.g., clp_123...)"
                value={cleanerId}
                onChange={(event) => setCleanerId(event.target.value)}
                required
              />
              <button
                type="submit"
                className="inline-flex min-h-[42px] items-center justify-center rounded-full bg-accent px-6 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
              >
                Sync payouts
              </button>
            </form>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard
              icon={Wallet}
              title="Month-to-date"
              value={monthToDateEarnings}
              description="Deposits completed this month."
              loading={loading && !payouts}
            />
            <SummaryCard
              icon={Banknote}
              title="Pending payouts"
              value={payouts?.totals.pending ?? formatCurrency(0)}
              description="Queued or processing deposits."
              loading={loading && !payouts}
            />
            <SummaryCard
              icon={Info}
              title="Lifetime earnings"
              value={payouts?.totals.lifetimeEarnings ?? formatCurrency(0)}
              description="All payouts since joining Tri State."
              loading={loading && !payouts}
            />
          </div>

          <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4 text-xs text-muted-foreground">
            <p className="font-semibold uppercase tracking-[0.25em] text-accent/80">Tip</p>
            <p>
              Connect your Stripe account in Settings to receive automatic payouts when customers pay.
              Go to Settings &rarr; Payout Settings &rarr; Connect Stripe Account.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-accent">Upcoming deposits</h2>
            <p className="text-sm text-muted-foreground">Deposits queue as soon as the customer pays their balance.</p>
          </div>
          <button
            type="button"
            className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent transition hover:bg-brand-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
            onClick={() => loadPayouts(hqView ? cleanerId : undefined)}
            disabled={loading || (hqView && !cleanerId)}
          >
            <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && !payouts ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-brand-100 px-4 py-12 text-accent">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading payouts…</span>
            </div>
          ) : payouts?.upcoming?.length ? (
            payouts.upcoming.map((payout) => (
              <div key={payout.id} className="rounded-3xl border border-brand-100 bg-white p-5 shadow-sm shadow-brand-100/60">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent/70">{payout.id}</p>
                    <h3 className="text-lg font-semibold text-accent">{payout.formattedAmount}</h3>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
                      payout.status === "QUEUED" && "bg-brand-50 text-accent",
                      payout.status === "PROCESSING" && "bg-sunshine/20 text-accent",
                      payout.status === "FAILED" && "bg-red-100 text-red-700"
                    )}
                  >
                    {payout.status.toLowerCase()}
                  </span>
                </div>
                <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                  <p>
                    Customer: <span className="text-accent">{payout.customerName ?? "TBD"}</span>
                  </p>
                  {payout.formattedInitiatedAt ? <p>Submitted: {payout.formattedInitiatedAt}</p> : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-brand-100 bg-white px-4 py-12 text-center text-sm text-muted-foreground">
              No pending payouts. Once you complete a job and the customer pays, you’ll see payout details here.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-accent">Payment history</h2>
            <p className="text-sm text-muted-foreground">Download statements for bookkeeping or expense reports.</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {payouts?.history?.length ? (
            payouts.history.map((payout) => (
              <div key={payout.id} className="rounded-3xl border border-brand-100 bg-brand-50/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent/70">#{payout.id}</p>
                    <p className="text-sm text-accent">{payout.formattedAmount}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{payout.formattedCompletedAt ?? "Awaiting confirmation"}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-brand-100 bg-white px-4 py-12 text-center text-sm text-muted-foreground">
              No payouts yet — claim jobs from the job board and finish your first clean to see deposits here.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const SummaryCard = ({
  icon: Icon,
  title,
  value,
  description,
  loading
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  description: string;
  loading: boolean;
}) => (
  <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-sm shadow-brand-100/60">
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-accent">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent/60">{title}</p>
        <p className="text-lg font-semibold text-accent">{loading ? "—" : value}</p>
      </div>
    </div>
    <p className="mt-2 text-xs text-muted-foreground">{description}</p>
  </div>
);

export default CleanerPayoutsPage;
