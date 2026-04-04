"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Shield, Leaf, Camera, Star, Loader2, Phone } from "lucide-react";

const SERVICE_LABELS: Record<string, string> = {
  HOME_CLEAN: "Construction",
  PRESSURE_WASH: "Pressure Washing",
  AUTO_DETAIL: "Eco Auto Detail",
  CUSTOM: "Custom Service",
  DEEP_CLEAN: "Deep Refresh & Detox",
  MOVE_CLEAN: "Move-In / Move-Out Detail",
};

export default function ConfirmEstimatePage({
  params,
  searchParams,
}: {
  params: Promise<{ draftId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [draftId, setDraftId] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [draft, setDraft] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const p = await params;
      const sp = await searchParams;
      setDraftId(p.draftId);
      setToken(sp.token || "");

      // Fetch draft data
      try {
        const res = await fetch(`/api/confirm-estimate?draftId=${p.draftId}&token=${sp.token || ""}`);
        if (res.ok) {
          const data = await res.json();
          setDraft(data);
          if (data.customerConfirmed) setConfirmed(true);
        } else {
          const data = await res.json();
          setError(data.error || "Invalid estimate link");
        }
      } catch {
        setError("Unable to load estimate");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleConfirm = async () => {
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch("/api/confirm-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Confirmation failed");
        return;
      }
      setConfirmed(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-50 to-white p-4">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">You're All Set!</h1>
          <p className="mt-4 text-gray-600 leading-relaxed">
            We're matching you with one of our background-checked crew members right now.
            You'll receive a confirmation text and email once your cleaner is assigned.
          </p>
          <div className="mt-6 rounded-2xl bg-green-50 border border-green-200 p-5">
            <p className="text-sm font-semibold text-green-800">What happens next:</p>
            <ol className="mt-3 space-y-2 text-left text-sm text-green-700">
              <li className="flex gap-2"><span className="font-bold">1.</span> A crew member will claim your job (usually within hours)</li>
              <li className="flex gap-2"><span className="font-bold">2.</span> You'll get a confirmation with their name and arrival time</li>
              <li className="flex gap-2"><span className="font-bold">3.</span> 24 hours before, we'll send a reminder</li>
              <li className="flex gap-2"><span className="font-bold">4.</span> After your project, view before/after photos in your portal</li>
            </ol>
          </div>
          <a
            href="tel:+16068362534"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900"
          >
            <Phone className="h-4 w-4" /> Questions? Call (606) 836-2534
          </a>
        </div>
      </div>
    );
  }

  if (error && !draft) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-red-50 to-white p-4">
        <div className="mx-auto max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900">Estimate Unavailable</h1>
          <p className="mt-3 text-gray-600">{error}</p>
          <a href="tel:+16068362534" className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-white">
            <Phone className="h-4 w-4" /> Call (606) 836-2534
          </a>
        </div>
      </div>
    );
  }

  const serviceLabel = SERVICE_LABELS[draft?.serviceType ?? ""] ?? "Service Estimate";
  const price = draft?.estimatedCost ? `$${draft.estimatedCost.toFixed(0)}` : "Custom";

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0d5e3b] to-[#16a34a] text-white">
        <div className="mx-auto max-w-lg px-5 py-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/60">Tri State Enterprise</p>
          <h1 className="mt-3 text-2xl font-bold">Your Service Estimate</h1>
          <p className="mt-2 text-white/80 text-sm">Personalized for {draft?.customerName?.split(" ")[0] || "you"}</p>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-5 py-6 space-y-5">
        {/* Price Card */}
        <div className="rounded-[24px] bg-white border border-brand-100 p-6 text-center shadow-lg">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-700">{serviceLabel}</p>
          <p className="mt-2 text-5xl font-extrabold text-accent">{price}</p>
          {draft?.address && <p className="mt-2 text-sm text-gray-500">{draft.address}</p>}
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 gap-3">
          <TrustBadge icon={Shield} label="Licensed & Insured" sub="Background-checked crew" />
          <TrustBadge icon={Leaf} label="Licensed & Insured" sub="Since 1992" />
          <TrustBadge icon={Camera} label="Photo Accountability" sub="Before & after every visit" />
          <TrustBadge icon={Star} label="5.0 ★ on Google" sub="Satisfaction guaranteed" />
        </div>

        {/* CTA */}
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="w-full rounded-2xl bg-accent py-5 text-lg font-bold text-white shadow-lg shadow-brand-600/20 transition active:scale-[0.97] hover:bg-brand-700 disabled:opacity-50"
        >
          {confirming ? (
            <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Confirming...</span>
          ) : (
            "Confirm My Service"
          )}
        </button>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center">{error}</div>
        )}

        <p className="text-center text-xs text-gray-400">
          or call us at <a href="tel:+16068362534" className="font-semibold text-brand-700">(606) 836-2534</a>
        </p>

        {/* Footer */}
        <div className="pt-4 text-center text-xs text-gray-400">
          <p>Tri State Enterprise · Flatwoods, KY</p>
          <p className="mt-1">Quality service you can trust</p>
        </div>
      </div>
    </div>
  );
}

function TrustBadge({ icon: Icon, label, sub }: { icon: any; label: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-4 text-center">
      <Icon className="mx-auto h-6 w-6 text-brand-600 mb-2" />
      <p className="text-xs font-bold text-accent">{label}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
}
