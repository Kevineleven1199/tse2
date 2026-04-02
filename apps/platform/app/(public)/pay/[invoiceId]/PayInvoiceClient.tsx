"use client";

import { useState, useTransition } from "react";
import { StripeCheckout } from "@/src/components/payments/StripeCheckout";
import { CelebrationOverlay } from "@/src/components/CelebrationOverlay";
import { Check, Loader2 } from "lucide-react";

type Props = {
  invoiceId: string;
  amount: number;
  email: string;
};

export const PayInvoiceClient = ({ invoiceId, amount, email }: Props) => {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [stripeSecret, setStripeSecret] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"deposit" | "full">("full");

  const depositAmount = Math.max(Math.round(amount * 0.2 * 100) / 100, 50);
  const chargeAmount = paymentMode === "deposit" ? depositAmount : amount;

  const handlePay = () => {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/payments/invoice-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoiceId,
            provider: "stripe",
            deposit: paymentMode === "deposit",
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error ?? "Unable to start payment.");
          return;
        }

        const data = await response.json();
        if (data.clientSecret) {
          setStripeSecret(data.clientSecret);
        } else {
          setError("Payment system unavailable. Please contact us.");
        }
      } catch {
        setError("Network error. Please try again.");
      }
    });
  };

  if (paid) {
    return (
      <>
        <CelebrationOverlay type="payment" show={showCelebration} onComplete={() => setShowCelebration(false)} />
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-green-50 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-green-800">Payment Successful!</h3>
          <p className="text-sm text-green-700">
            ${chargeAmount.toFixed(2)} has been processed. You'll receive a confirmation email shortly.
          </p>
        </div>
      </>
    );
  }

  if (stripeSecret) {
    return (
      <StripeCheckout
        clientSecret={stripeSecret}
        amount={chargeAmount}
        onSuccess={() => {
          setShowCelebration(true);
          setPaid(true);
        }}
        onCancel={() => setStripeSecret(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {amount > 100 && (
        <div className="flex items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50/30 p-1">
          <button
            type="button"
            onClick={() => setPaymentMode("deposit")}
            className={`flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-all ${
              paymentMode === "deposit"
                ? "bg-white text-accent shadow-sm"
                : "text-muted-foreground hover:text-accent"
            }`}
          >
            Deposit — ${depositAmount.toFixed(2)}
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
            Full Amount — ${amount.toFixed(2)}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handlePay}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-brand-700 disabled:opacity-70"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          `Pay $${chargeAmount.toFixed(2)}`
        )}
      </button>

      {error && (
        <p className="text-center text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
