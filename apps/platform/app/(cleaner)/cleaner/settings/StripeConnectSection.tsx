"use client";

import { useCallback, useEffect, useState } from "react";

type Props = {
  initialConnected: boolean;
};

export default function StripeConnectSection({ initialConnected }: Props) {
  const [connected, setConnected] = useState(initialConnected);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-check status when returning from Stripe onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe") === "success" || params.get("stripe") === "refresh") {
      void (async () => {
        try {
          const res = await fetch("/api/cleaner/stripe-connect");
          if (res.ok) {
            const data = (await res.json()) as { connected: boolean };
            setConnected(data.connected);
          }
        } catch {
          // Silently ignore — the initial prop is the fallback
        }
      })();
    }
  }, []);

  const handleConnect = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/cleaner/stripe-connect", {
        method: "POST",
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Failed to start Stripe onboarding");
      }

      const data = (await res.json()) as { url: string };
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }, []);

  if (connected) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 p-4">
        <span className="text-green-600 font-medium text-sm">
          Stripe Connected
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleConnect}
        disabled={loading}
        className="inline-flex min-h-[42px] w-full items-center justify-center rounded-full bg-accent px-6 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 disabled:opacity-50"
      >
        {loading ? "Connecting..." : "Connect Stripe Account"}
      </button>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
