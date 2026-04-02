"use client";

import Link from "next/link";

const CTA = () => (
  <section className="glass flex flex-col gap-6 rounded-3xl p-10 text-white md:flex-row md:items-center md:justify-between">
    <div>
      <h2 className="font-display text-3xl text-white">
        Launch GoGreenOS on Railway in days, not months.
      </h2>
      <p className="mt-2 max-w-xl text-white/75">
        Bring your WordPress site into read-only mode while the new SaaS
        platform handles customers, crews, billing, and community growth.
      </p>
    </div>
    <div className="flex min-w-[220px] flex-col gap-3 md:items-end">
      <Link
        href="/request"
        className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-brand-100 hover:text-brand-900"
      >
        Schedule onboarding
      </Link>
      <Link
        href="/community"
        className="text-sm text-white/70 underline underline-offset-4 hover:text-white"
      >
        Visit the community →
      </Link>
    </div>
  </section>
);

export default CTA;
