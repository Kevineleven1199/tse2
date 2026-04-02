"use client";

export type Metric = {
  label: string;
  value: string;
  delta: string;
  tone: "positive" | "negative" | "neutral";
};

type MetricCardsProps = {
  metrics: Metric[];
};

const MetricCards = ({ metrics }: MetricCardsProps) => (
  <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    {metrics.map((metric) => (
      <article
        key={metric.label}
        className="glass rounded-3xl p-6 text-white transition hover:-translate-y-1"
      >
        <p className="text-sm uppercase tracking-widest text-white/60">
          {metric.label}
        </p>
        <div className="mt-3 text-3xl font-bold">{metric.value}</div>
        <p
          className={`mt-2 text-sm ${
            metric.tone === "positive"
              ? "text-emerald-300"
              : metric.tone === "negative"
                ? "text-rose-300"
                : "text-white/70"
          }`}
        >
          {metric.delta}
        </p>
      </article>
    ))}
  </section>
);

export default MetricCards;
