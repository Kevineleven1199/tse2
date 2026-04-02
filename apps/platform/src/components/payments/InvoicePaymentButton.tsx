"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/src/lib/toast";
import { StripeCheckout } from "./StripeCheckout";
import { CelebrationOverlay } from "@/src/components/CelebrationOverlay";

type InvoicePaymentButtonProps = {
  quoteId: string;
  amount: number;
  deposit?: boolean;
};

export const InvoicePaymentButton = ({ quoteId, amount, deposit }: InvoicePaymentButtonProps) => {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [stripeSecret, setStripeSecret] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"deposit" | "full">(deposit ? "deposit" : "full");
  const { toast } = useToast();

  const depositAmount = Math.max(Math.round(amount * 0.2 * 100) / 100, 50);
  const chargeAmount = paymentMode === "deposit" ? depositAmount : amount;

  const handlePay = () => {
    setError(null);
    toast({ variant: "info", title: "Connecting...", description: "Preparing your secure checkout." });
    startTransition(async () => {
      try {
        const response = await fetch("/api/payments/intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quoteId, amount: chargeAmount, deposit: paymentMode === "deposit", provider: "stripe" })
        });

        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          const message = data.error ?? "Unable to start payment.";
          setError(message);
          toast({ variant: "error", title: "Payment failed", description: message });
          return;
        }

        const data = await response.json();

        if (data.clientSecret) {
          setStripeSecret(data.clientSecret);
          toast({ variant: "info", title: "Ready", description: "Enter your card details below." });
        } else {
          const message = "Payment provider not configured. Please contact HQ.";
          setError(message);
          toast({ variant: "error", title: "Payment unavailable", description: message });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Network error";
        setError(message);
        toast({ variant: "error", title: "Payment failed", description: message });
      }
    });
  };

  if (paid) {
    return (
      <>
        <CelebrationOverlay type="payment" show={showCelebration} onComplete={() => setShowCelebration(false)} />
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3">
          <span className="text-green-600">Payment successful!</span>
        </div>
      </>
    );
  }

  if (stripeSecret) {
    return (
      <StripeCheckout
        clientSecret={stripeSecret}
        amount={amount}
        onSuccess={() => {
          setShowCelebration(true);
          setPaid(true);
          toast({ variant: "success", title: "Payment complete!", description: "Your payment has been processed." });
        }}
        onCancel={() => setStripeSecret(null)}
      />
    );
  }

  return (
    <div className="flex flex-col items-start gap-4">
      {/* Deposit / Full Payment Toggle */}
      {amount > 100 && (
        <div className="flex w-full items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50/30 p-1">
          <button
            type="button"
            onClick={() => setPaymentMode("deposit")}
            className={`flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-all ${
              paymentMode === "deposit"
                ? "bg-white text-accent shadow-sm"
                : "text-muted-foreground hover:text-accent"
            }`}
          >
            Pay Deposit — ${depositAmount.toFixed(2)}
          </button>
          <button
            type="button"
            onClick={() => setPaymentMode("full")}
            className={`flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-all ${
              paymentMode === "full"
                ? "bg-white text-accent shadow-sm"
                : "text-muted-foreground hover:text-accent"
            }`}
          >
            Pay Full — ${amount.toFixed(2)}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handlePay}
        disabled={pending}
        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 disabled:opacity-70"
      >
        {pending ? "Connecting..." : `Pay $${chargeAmount.toFixed(2)} with Card`}
      </button>
      {error ? <span className="text-xs text-red-500">{error}</span> : null}
    </div>
  );
};
