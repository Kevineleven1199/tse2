"use client";

import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/src/lib/animations";

const AREAS = [
  { title: "Flatwoods County", subtitle: "Home base & surrounding keys" },
  { title: "Manatee County", subtitle: "Ashland • South Shore" },
  { title: "Pinellas County", subtitle: "St. Petersburg • Clearwater" },
  { title: "Hillsborough County", subtitle: "Huntington • Brandon" },
  { title: "Pasco County", subtitle: "Land O’ Lakes • Wesley Chapel" }
];

export const ServiceAreasSection = () => (
  <section className="bg-surface" id="areas">
    <div className="section-wrapper py-20">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
        className="mx-auto max-w-3xl text-left md:text-center"
      >
        <motion.span variants={fadeUp} className="text-sm font-semibold uppercase tracking-[0.3em] text-accent/70">
          Where We Shine
        </motion.span>
        <motion.h2 variants={fadeUp} className="mt-4 font-display text-3xl font-semibold leading-tight text-accent md:text-4xl">
          Proudly serving Flatwoods and the Greater Tri-State Area area
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
          From residential homes to commercial properties, we provide trusted construction, HVAC, lawn care, landscaping, site work, and paving services across the Kentucky-Ohio-West Virginia Tri-State area. Not sure if you’re in range? Reach out and we’ll confirm availability within one business day.
        </motion.p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
        className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5"
      >
        {AREAS.map((area) => (
          <motion.div
            key={area.title}
            variants={fadeUp}
            className="flex h-full flex-col items-center justify-center rounded-3xl border border-brand-100 bg-white px-4 py-6 text-center shadow-sm shadow-brand-100/60"
          >
            <h3 className="text-lg font-semibold text-accent">{area.title}</h3>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              {area.subtitle}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);
