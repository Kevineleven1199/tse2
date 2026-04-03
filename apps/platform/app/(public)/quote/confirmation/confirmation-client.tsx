'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, CalendarClock, ShieldCheck, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { formatCurrency } from "@/src/lib/utils";

type QuoteSummary = {
  serviceLabel: string;
  frequencyLabel: string;
  locationLabel: string;
};

type QuotePricing = {
  total: number;
  cleanerPay: number;
  companyMarginRate: number;
  frequencyDiscount: number;
  addOnTotal: number;
  recommendedDeposit: number;
};

type StoredQuote = {
  quoteId: string;
  summary: QuoteSummary;
  pricing: QuotePricing;
  monthlyValue: number;
  schedulingUrl: string;
  action: string;
  form: {
    name: string;
    email: string;
    phone: string;
    address: string;
    serviceType: string;
  };
};

const ConfirmationClient = () => {
  const params = useSearchParams();
  const quoteId = params.get("quoteId");
  const [quote, setQuote] = useState<StoredQuote | null>(null);

  useEffect(() => {
    if (!quoteId || typeof window === "undefined") return;
    const stored = window.sessionStorage.getItem(`quote:${quoteId}`) ?? window.sessionStorage.getItem("quote:last");
    if (stored) {
      try {
        setQuote(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to parse stored quote", error);
      }
    }
  }, [quoteId]);

  const nextSteps = useMemo(
    () => [
      {
        title: "Reserve your visit",
        description: "Pick a window that works for you and we’ll lock in the cleaner.",
        icon: CalendarClock
      },
      {
        title: "Confirm your eco-account",
        description: "We’ve created a Tri State account with your email so you can view quotes, receipts, and future visits.",
        icon: ShieldCheck
      },
      {
        title: "Prepare your home",
        description: "We’ll send a text checklist plus the eco-products we bring for your property.",
        icon: Sparkles
      }
    ],
    []
  );

  if (!quote) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-semibold text-accent">Thanks for your request!</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          We’re generating your quote now. Check your email for the full breakdown, or{" "}
          <Link href="/#quote" className="text-brand-600 underline">
            start another request
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-12">
      <Card className="bg-white">
        <CardHeader className="space-y-3 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-brand-600" />
          <h1 className="text-3xl font-semibold text-accent">Your instant quote is ready!</h1>
          <p className="text-sm text-muted-foreground">
            We’ve created a Tri State account for {quote.form.name}. Use the steps below to confirm your visit.
          </p>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-brand-100 bg-brand-50/40 p-6 shadow-sm shadow-brand-100/50">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent/70">{quote.summary.serviceLabel}</p>
              <p className="text-3xl font-semibold text-accent mt-2">{formatCurrency(quote.pricing.total)}</p>
              <p className="text-sm text-muted-foreground">
                {quote.summary.frequencyLabel} • {quote.summary.locationLabel}
              </p>
              <dl className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <div>
                  <dt>Add-ons</dt>
                  <dd className="font-semibold text-accent">{formatCurrency(quote.pricing.addOnTotal)}</dd>
                </div>
                <div>
                  <dt>Recurring savings</dt>
                  <dd className="font-semibold text-accent">-{formatCurrency(quote.pricing.frequencyDiscount)}</dd>
                </div>
                <div>
                  <dt>Cleaner pay</dt>
                  <dd className="font-semibold text-accent">{formatCurrency(quote.pricing.cleanerPay)}</dd>
                </div>
                <div>
                  <dt>Deposit to reserve</dt>
                  <dd className="font-semibold text-accent">{formatCurrency(quote.pricing.recommendedDeposit)}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-3xl border border-brand-100 bg-white p-6 shadow-sm shadow-brand-100/30">
              <h2 className="text-xl font-semibold text-accent">What happens next</h2>
              <p className="text-sm text-muted-foreground">
                As soon as you reserve a window, we’ll text your cleaner, sync the visit to your calendar, and send you prep tips.
              </p>
              <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                {nextSteps.map((step, index) => (
                  <li key={step.title} className="flex items-start gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-accent">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-accent">{step.title}</p>
                      <p>{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={quote.schedulingUrl || `tel:+16068362534`}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
                >
                  Reserve my visit
                </Link>
                <a
                  href="tel:+16068362534"
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-accent bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-accent transition hover:bg-brand-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
                >
                  Talk with HQ
                </a>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent/70">Account Snapshot</p>
              <p className="mt-3 text-sm text-muted-foreground">We’ll keep you posted at:</p>
              <p className="font-semibold text-accent">{quote.form.email}</p>
              <p className="text-sm text-muted-foreground">{quote.form.phone}</p>
              <p className="mt-3 text-xs text-muted-foreground">{quote.form.address}</p>
            </div>
            <div className="rounded-3xl border border-brand-100 bg-brand-50/40 p-5 text-sm text-muted-foreground">
              <p>
                Keep an eye out for a welcome email with your Tri State account login. From there you’ll be able to update payment methods,
                manage visits, and download eco-product lists anytime.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmationClient;
