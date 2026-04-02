"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2, Shield, Leaf, Camera, Star, Clock, ArrowRight,
  Phone, Mail, Sparkles, Lock, Loader2, PartyPopper, AlertTriangle,
} from "lucide-react";

type EstimateData = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  serviceType: string;
  serviceLabel: string;
  estimatedCost: number;
  breakdown: Record<string, unknown>;
  includes: string[];
  isExpired: boolean;
  isAccepted: boolean;
  daysLeft: number;
  createdAt: string;
};

type Review = { authorName: string; rating: number; text: string };

export function EstimateClient({
  estimate, reviews, token,
}: {
  estimate: EstimateData;
  reviews: Review[];
  token: string;
}) {
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(estimate.isAccepted);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showRegister, setShowRegister] = useState(false);

  // ── Expired State ──
  if (estimate.isExpired) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold text-accent">This Estimate Has Expired</h1>
          <p className="mt-3 text-muted-foreground">
            This estimate is no longer available. Prices and availability may have changed since it was created.
          </p>
          <Link
            href="/get-a-quote"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition hover:bg-brand-700"
          >
            Get a Fresh Quote <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // ── Accepted State ──
  if (accepted) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <PartyPopper className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="mt-5 font-display text-3xl font-bold text-accent">You&apos;re All Set!</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Your {estimate.serviceLabel} has been confirmed. We&apos;re matching you with the perfect crew.
          </p>
          <div className="mt-8 rounded-3xl border border-brand-100 bg-brand-50/30 p-6 text-left">
            <h3 className="font-semibold text-accent mb-3">What happens next:</h3>
            <div className="space-y-3">
              {["We're assigning your dedicated cleaning crew", "You'll receive a confirmation text with your crew's name", "24 hours before: we'll send a reminder with arrival window", "After service: before & after photos delivered to your portal"].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{i + 1}</span>
                  <span className="text-sm text-accent">{step}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/client" className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition hover:bg-brand-700">
              Go to My Portal <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-full border-2 border-accent px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-accent transition hover:bg-brand-50">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Accept handler ──
  const handleAccept = async () => {
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch("/api/confirm-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: estimate.id,
          token,
          password: password || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setAccepted(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setAccepting(false);
    }
  };

  // ── Main Estimate Page ──
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-emerald-700 pb-32 pt-16">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djJoLTJ2LTJoMnptMC00djJoLTJ2LTJoMnptLTQgOHYyaC0ydi0yaDJ6bTAgNHYyaC0ydi0yaDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <Image src="/images/cropped-Mobile-Logo-164x76.png" alt="Tri State" width={140} height={65} className="mx-auto mb-6 brightness-200" />
          <p className="text-xs font-bold uppercase tracking-[0.5em] text-brand-200/70">Your Personalized Estimate</p>
          <h1 className="mt-3 font-display text-4xl font-bold text-white md:text-5xl">
            {estimate.serviceLabel}
          </h1>
          <p className="mt-3 text-lg text-brand-100/80">
            Prepared for {estimate.customerName || "you"} &bull; {estimate.address || "your home"}
          </p>
        </div>
      </section>

      {/* Price Card (floating over hero) */}
      <section className="mx-auto -mt-20 max-w-2xl px-4">
        <div className="rounded-3xl border border-brand-100 bg-white p-8 shadow-2xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">Your Estimate</p>
            <p className="mt-2 text-5xl font-bold text-accent">${estimate.estimatedCost.toFixed(2)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              One-time service &bull; Valid for {estimate.daysLeft} day{estimate.daysLeft !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Price breakdown if available */}
          {Object.keys(estimate.breakdown).length > 0 && (
            <div className="mt-6 space-y-2 rounded-2xl bg-brand-50/30 p-4">
              {Object.entries(estimate.breakdown).filter(([k]) => !k.startsWith("_")).slice(0, 6).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                  <span className="font-semibold text-accent">{typeof value === "number" ? `$${value.toFixed(2)}` : String(value)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Accept / Register Section */}
          <div className="mt-8">
            {!showRegister ? (
              <button
                onClick={() => setShowRegister(true)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-8 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition hover:bg-brand-700 active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4" /> Accept & Book My Cleaning
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-center text-sm font-semibold text-accent">Create your account to confirm</p>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a password (min 8 characters)"
                  className="w-full rounded-2xl border border-brand-100 bg-brand-50/30 px-4 py-3.5 text-sm text-accent placeholder:text-muted-foreground/50 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
                <button
                  onClick={handleAccept}
                  disabled={accepting || password.length < 8}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-8 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition hover:bg-brand-700 disabled:opacity-60"
                >
                  {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  {accepting ? "Confirming..." : "Confirm & Create Account"}
                </button>
                <p className="text-center text-xs text-muted-foreground">
                  Already have an account? <Link href="/login" className="text-brand-600 underline">Sign in</Link> then come back to confirm.
                </p>
              </div>
            )}
            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="mx-auto max-w-2xl px-4 py-12">
        <h2 className="text-center font-display text-2xl font-bold text-accent">What&apos;s Included</h2>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {estimate.includes.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-2xl border border-brand-100 bg-brand-50/20 px-4 py-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <span className="text-sm text-accent">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-brand-50/30 py-12">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-center font-display text-2xl font-bold text-accent">Why Families Trust TriState</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Shield, title: "Licensed & Insured", desc: "Background-checked, fully insured crew members" },
              { icon: Leaf, title: "EPA Safer Choice", desc: "100% plant-based, certified organic products" },
              { icon: Camera, title: "Photo Accountability", desc: "Before & after photos for every visit" },
              { icon: Star, title: "4.9★ on Google", desc: "Hundreds of 5-star reviews from local families" },
              { icon: CheckCircle2, title: "Satisfaction Guarantee", desc: "Not happy? We re-clean within 24 hours, free" },
              { icon: Lock, title: "Your Own Portal", desc: "Track visits, pay invoices, manage your account" },
            ].map((badge) => (
              <div key={badge.title} className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <badge.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-accent">{badge.title}</p>
                  <p className="text-xs text-muted-foreground">{badge.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Google Reviews */}
      {reviews.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 py-12">
          <h2 className="text-center font-display text-2xl font-bold text-accent">What Our Customers Say</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {reviews.map((review, i) => (
              <div key={i} className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-3 text-sm text-accent leading-relaxed">
                  &ldquo;{review.text.slice(0, 150)}{review.text.length > 150 ? "..." : ""}&rdquo;
                </p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">— {review.authorName}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-brand-900 to-accent py-16">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="font-display text-3xl font-bold text-white">Ready to experience the TriState difference?</h2>
          <p className="mt-3 text-lg text-brand-100/80">Accept your estimate above to get started. Questions? Call us anytime.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <a href="tel:+16065550100" className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/20">
              <Phone className="h-4 w-4" /> (606) 555-0100
            </a>
            <a href="mailto:info@tsenow.com" className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/20">
              <Mail className="h-4 w-4" /> Email Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
