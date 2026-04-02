"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const Hero = () => {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-500/60 via-slate-900 to-slate-950 p-10 text-white shadow-brand md:p-16">
      <div className="relative z-10 grid gap-10 lg:grid-cols-[1fr,minmax(0,420px)] lg:items-center">
        <div className="space-y-6">
          <p className="inline-flex items-center rounded-full bg-white/15 px-4 py-1 text-sm font-medium uppercase tracking-wide text-white">
            Automated operating system for service businesses
          </p>
          <h1 className="text-balance font-display text-4xl leading-tight md:text-5xl lg:text-6xl">
            Go beyond Jobber. Run{" "}
            <span className="text-brand-100">GoGreenOS</span> and scale on full
            autopilot.
          </h1>
          <p className="max-w-xl text-lg text-white/80">
            Capture new requests, quote with AI, route jobs to your certified
            cleaners, sync everyone&apos;s calendars, automate payments, and
            delight neighbors with a nextdoor-style community.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/request"
              className="inline-flex min-w-[200px] items-center justify-center rounded-full bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-brand-100 hover:text-brand-900"
            >
              Request a demo clean
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3 font-semibold text-white transition hover:border-white hover:bg-white/10"
            >
              Explore features
            </Link>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-white/70">
            <div>
              <span className="text-lg font-semibold text-white">65%</span>{" "}
              revenue share to cleaners automatically
            </div>
            <div>
              <span className="text-lg font-semibold text-white">35%</span>{" "}
              retained by HQ with zero manual billing
            </div>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="glass rounded-2xl p-6 text-sm text-white/80"
        >
          <div className="space-y-4">
            <h2 className="font-display text-xl text-white">
              Real-time automation snapshot
            </h2>
            <ul className="space-y-3">
              <li className="flex gap-3 rounded-xl bg-white/5 p-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-emerald-300" />
                <div>
                  <p className="font-semibold text-white">Auto-quote in 12s</p>
                  <p>AI drafts a price grid and sends for approval instantly.</p>
                </div>
              </li>
              <li className="flex gap-3 rounded-xl bg-white/5 p-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-sky-300" />
                <div>
                  <p className="font-semibold text-white">
                    Dispatch to certified crews
                  </p>
                  <p>
                    Cleaners get the job on OpenPhone, Wise handles payouts.
                  </p>
                </div>
              </li>
              <li className="flex gap-3 rounded-xl bg-white/5 p-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-amber-300" />
                <div>
                  <p className="font-semibold text-white">Calendar + reviews</p>
                  <p>
                    Google & Apple calendars update and review requests go out
                    automatically.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(31,183,122,0.3),_transparent_55%)]" />
    </section>
  );
};

export default Hero;
