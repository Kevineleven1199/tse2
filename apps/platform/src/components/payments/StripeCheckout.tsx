"use client";

import { useState, useEffect, useRef } from "react";
import { loadStripe, type Stripe, type StripeCardElement } from "@stripe/stripe-js";

type StripeCheckoutProps = {
  clientSecret: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
};

let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = () => {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    stripePromise = key ? loadStripe(key) : Promise.resolve(null);
  }
  return stripePromise;
};

export const StripeCheckout = ({ clientSecret, amount, onSuccess, onCancel }: StripeCheckoutProps) => {
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [ready, setReady] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const cardElementRef = useRef<StripeCardElement | null>(null);
  const stripeRef = useRef<Stripe | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const stripe = await getStripe();
      if (!stripe || !mounted) return;
      stripeRef.current = stripe;

      const elements = stripe.elements();
      const card = elements.create("card", {
        style: {
          base: {
            fontSize: "16px",
            color: "#1a1a2e",
            fontFamily: "system-ui, -apple-system, sans-serif",
            "::placeholder": { color: "#9ca3af" }
          },
          invalid: { color: "#ef4444" }
        }
      });

      if (cardRef.current) {
        card.mount(cardRef.current);
        cardElementRef.current = card;
        card.on("ready", () => mounted && setReady(true));
        card.on("change", (event) => {
          if (mounted) setError(event.error?.message || null);
        });
      }
    };

    init();

    return () => {
      mounted = false;
      cardElementRef.current?.destroy();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripeRef.current || !cardElementRef.current || processing) return;

    setProcessing(true);
    setError(null);

    const { error: confirmError, paymentIntent } = await stripeRef.current.confirmCardPayment(
      clientSecret,
      { payment_method: { card: cardElementRef.current } }
    );

    if (confirmError) {
      setError(confirmError.message || "Payment failed");
      setProcessing(false);
    } else if (paymentIntent?.status === "succeeded") {
      onSuccess();
    } else {
      setError("Payment was not completed. Please try again.");
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-brand-200 bg-white p-4">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Card Details
        </label>
        <div
          ref={cardRef}
          className="rounded-lg border border-brand-100 bg-brand-50/50 p-3"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={processing || !ready}
          className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-accent px-6 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {processing ? "Processing..." : `Pay $${amount.toFixed(2)}`}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="text-sm text-muted-foreground hover:text-accent"
        >
          Cancel
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Secured by Stripe. Your card information is encrypted.
      </p>
    </form>
  );
};
