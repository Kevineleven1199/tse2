"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Shield, Leaf, Star, MapPin, Users, Clock } from "lucide-react";

const METRICS = [
  { value: "5.0", suffix: "★", label: "Google Rating", sublabel: "106 verified reviews", icon: Star, color: "text-amber-500" },
  { value: "100", suffix: "%", label: "Organic Products", sublabel: "EPA Safer Choice certified", icon: Leaf, color: "text-green-500" },
  { value: "500", suffix: "+", label: "Jobs Completed", sublabel: "Homes & businesses served", icon: Users, color: "text-blue-500" },
  { value: "3", suffix: "+", label: "Years in Business", sublabel: "Licensed & insured", icon: Shield, color: "text-purple-500" },
  { value: "Same", suffix: "", label: "Week Availability", sublabel: "Often next-day scheduling", icon: Clock, color: "text-teal-500" },
  { value: "SW", suffix: " FL", label: "Service Area", sublabel: "Flatwoods to Tri-State Area", icon: MapPin, color: "text-pink-500" },
];

function AnimatedNumber({ value, suffix }: { value: string; suffix: string }) {
  // For numeric values, animate the count
  const num = parseInt(value);
  if (isNaN(num)) {
    return <>{value}{suffix}</>;
  }

  return (
    <motion.span
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      {value}{suffix}
    </motion.span>
  );
}

export const StatsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section className="bg-white" ref={ref}>
      <div className="section-wrapper py-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {METRICS.map((metric, i) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="group rounded-2xl border border-brand-100 bg-gradient-to-br from-white to-brand-50/50 p-5 text-center shadow-sm transition hover:shadow-lg hover:-translate-y-1"
            >
              <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 ${metric.color} transition-transform group-hover:scale-110 mb-3`}>
                <metric.icon className="h-5 w-5" />
              </div>
              <p className="font-display text-2xl font-bold text-accent">
                <AnimatedNumber value={metric.value} suffix={metric.suffix} />
              </p>
              <p className="text-sm font-semibold text-accent mt-1">{metric.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{metric.sublabel}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
