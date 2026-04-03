"use client";

import { motion } from "framer-motion";
import { Award, Shield, Clock, Wrench } from "lucide-react";
import { fadeUp, staggerContainer } from "@/src/lib/animations";

const CREDENTIALS = [
  {
    title: "30+ Years Experience",
    description: "Established in 1992, Tri State Enterprise brings over three decades of hands-on expertise to every project across the KY-OH-WV Tri-State area.",
    icon: Clock
  },
  {
    title: "Full-Service Contractor",
    description: "Construction, HVAC, lawn care, landscaping, site work, and paving — all under one roof. One call truly does it all.",
    icon: Wrench
  },
  {
    title: "Licensed, Bonded & Insured",
    description: "Fully licensed professionals with comprehensive insurance coverage. Every project is backed by our commitment to quality and your peace of mind.",
    icon: Shield
  },
  {
    title: "Quality Guaranteed",
    description: "We stand behind every job we do. From small residential repairs to large commercial projects, our work meets the highest standards of craftsmanship.",
    icon: Award
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
          Why Choose Us
        </motion.span>
        <motion.h2 variants={fadeUp} className="mt-4 font-display text-3xl font-semibold leading-tight text-accent md:text-4xl">
          Reliable service you can count on
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
          When you hire Tri State Enterprise, you get a trusted local team with the experience, equipment, and commitment to get the job done right.
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
