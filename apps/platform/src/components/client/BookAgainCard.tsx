"use client";

import { useState } from "react";
import Link from "next/link";
import { RefreshCcw, Loader2, CheckCircle2, PenLine } from "lucide-react";

type LastService = {
  requestId: string;
  service: string;
  address: string;
  date: string;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  sqft: number | null;
};

type Props = {
  lastService: LastService;
};

/** Map Prisma ServiceType enum values to quote-form serviceType slugs */
const SERVICE_TYPE_MAP: Record<string, string> = {
  HOME_CLEAN: "healthy_home",
  PRESSURE_WASH: "deep_refresh",
  AUTO_DETAIL: "commercial",
  CUSTOM: "deep_refresh",
};

function buildRebookUrl(lastService: LastService): string {
  const params = new URLSearchParams();
  const quoteService = SERVICE_TYPE_MAP[lastService.service] || "healthy_home";
  params.set("service", quoteService);
  if (lastService.addressLine1) params.set("address", lastService.addressLine1);
  if (lastService.city) params.set("city", lastService.city);
  if (lastService.state) params.set("state", lastService.state);
  if (lastService.zip) params.set("zip", lastService.zip);
  if (lastService.sqft) params.set("sqft", String(lastService.sqft));
  return `/get-a-quote?${params.toString()}`;
}

export const BookAgainCard = ({ lastService }: Props) => {
  const [loading, setLoading] = useState(false);
  const [booked, setBooked] = useState(false);

  const handleBookAgain = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/client/book-again", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceRequestId: lastService.requestId }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to re-book");
        return;
      }

      setBooked(true);
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (booked) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-green-500 mb-2" />
        <p className="font-semibold text-green-700">Booking Confirmed!</p>
        <p className="mt-1 text-sm text-green-600">
          We&apos;ll confirm your cleaner and schedule shortly.
        </p>
      </div>
    );
  }

  const rebookUrl = buildRebookUrl(lastService);

  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <RefreshCcw className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-accent">Book Again</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Re-book your last {lastService.service.replace(/_/g, " ").toLowerCase()} at{" "}
            {lastService.address}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Last service: {lastService.date}
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-col gap-2">
          <button
            onClick={handleBookAgain}
            disabled={loading}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Booking...
              </>
            ) : (
              "Book Again"
            )}
          </button>
          <Link
            href={rebookUrl}
            className="rounded-xl border border-brand-200 px-5 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-brand-50 flex items-center justify-center gap-2"
          >
            <PenLine className="h-3.5 w-3.5" />
            Customize
          </Link>
        </div>
      </div>
    </div>
  );
};
