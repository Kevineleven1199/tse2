"use client";

import { motion } from "framer-motion";
import { Leaf, Shield, Droplets, HeartPulse } from "lucide-react";
import { fadeUp, staggerContainer } from "@/src/lib/animations";

const CREDENTIALS = [
  {
    title: "Certified Green Products",
    description: "We exclusively use EPA Safer Choice, Green Seal, and EWG Verified cleaners with full ingredient transparency.",
    icon: Leaf
  },
  {
    title: "Indoor Air Quality Focus",
    description: "HEPA-filter vacuuming and low-VOC processes protect respiratory health and reduce allergens with every visit.",
    icon: HeartPulse
  },
  {
    title: "Licensed, Bonded & Insured",
    description: "Fully insured professionals with background checks, ongoing training, and a satisfaction guarantee on every clean.",
    icon: Shield
  },
  {
    title: "Water & Waste Conscious",
    description: "Microfiber systems, refillable glass bottles, and biodegradable disposables minimize waste sent to Kentucky landfills.",
    icon: Droplets
  }
];

export const CredentialsSection = () => (
  <section className="bg-brand-50" id="credentials">
    <div className="section-wrapper py-20">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
        className="mx-auto max-w-3xl text-center"
      >
        <motion.span variants={fadeUp} className="text-sm font-semibold uppercase tracking-[0.3em] text-accent/70">
          Health & Sustainability First
        </motion.span>
        <motion.h2 variants={fadeUp} className="mt-4 font-display text-3xl font-semibold leading-tight text-accent md:text-4xl">
          Credentials that keep your clean honest—and truly green
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
          Greenwashing isn’t in our vocabulary. Every product, process, and person on our team is vetted to deliver health-forward results you can trust.
        </motion.p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
        className="mt-12 grid gap-6 md:grid-cols-2"
      >
        {CREDENTIALS.map(({ title, description, icon: Icon }) => (
          <motion.div key={title} variants={fadeUp} className="rounded-3xl border border-brand-100 bg-white/90 p-8 shadow-lg shadow-brand-100/30">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-accent shadow-sm shadow-brand-100/50">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="mt-5 font-display text-xl font-semibold text-accent">{title}</h3>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">{description}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);
