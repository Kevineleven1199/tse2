"use client";

const features = [
  {
    title: "Instant booking page",
    description:
      "Customers request eco-friendly cleanings, pressure washing, or mobile detailing with a couple taps.",
    metric: "12s avg booking"
  },
  {
    title: "AI quote intelligence",
    description:
      "Leverage past jobs, market rates, and margins to auto-build a competitive quote you can fine tune.",
    metric: "98% acceptance"
  },
  {
    title: "Crew marketplace",
    description:
      "Certified cleaners claim jobs first-come-first-serve while we orchestrate capacity and 65/35 payouts.",
    metric: "0 manual dispatch"
  },
  {
    title: "Neighborhood social",
    description:
      "A GoGreen-branded community wall boosts referrals with before/after reels, tips, and loyalty perks.",
    metric: "+34% referrals"
  },
  {
    title: "Unified comms",
    description:
      "OpenPhone SMS, automated voice drops, email and push notifications fire across every touchpoint.",
    metric: "3m response time"
  },
  {
    title: "Accounting & compliance",
    description:
      "Wise, Zelle, PayPal, and ADP sync for automated payouts, invoicing, 1099s, and monthly statements.",
    metric: "100% synced ledgers"
  }
];

const FeatureGrid = () => (
  <section id="features" className="space-y-10">
    <div className="space-y-3">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand-300">
        Why GoGreenOS
      </p>
      <h2 className="font-display text-3xl text-white md:text-4xl">
        Designed to feel like the most gorgeous app in the service industry.
      </h2>
      <p className="max-w-2xl text-white/70">
        Everything from quoting and dispatch to neighborhood engagement runs on
        one multi-tenant SaaS experience you can resell to other operators.
      </p>
    </div>
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {features.map((feature) => (
        <article
          key={feature.title}
          className="glass flex h-full flex-col rounded-2xl p-6 transition hover:translate-y-[-4px]"
        >
          <div className="text-xs uppercase tracking-wider text-brand-200">
            {feature.metric}
          </div>
          <h3 className="mt-3 font-display text-xl text-white">
            {feature.title}
          </h3>
          <p className="mt-3 text-sm text-white/70">{feature.description}</p>
        </article>
      ))}
    </div>
  </section>
);

export default FeatureGrid;
