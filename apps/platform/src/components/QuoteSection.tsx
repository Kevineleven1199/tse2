"use client";

import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/src/lib/animations";
import { QuoteWizard } from "@/src/components/QuoteWizard";

export const QuoteSection = () => (
  <section className="bg-gradient-to-b from-white via-brand-50/30 to-white" id="quote">
    <div className="section-wrapper py-20">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
        className="mx-auto max-w-2xl text-center mb-10"
      >
        <motion.span variants={fadeUp} className="text-sm font-semibold uppercase tracking-[0.3em] text-accent/70">
          Free Estimate &mdash; No Obligation
        </motion.span>
        <motion.h2 variants={fadeUp} className="mt-4 font-display text-3xl font-semibold leading-tight text-accent md:text-4xl">
          Get your free quote today
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
          Tell us about your project and get a fast, no-obligation estimate.
          Prefer to talk? Call{" "}
          <a href="tel:+16068362534" className="font-semibold text-accent underline underline-offset-4">
            (606) 836-2534
          </a>.
        </motion.p>
      </motion.div>
      <QuoteWizard />
    </div>
  </section>
);
