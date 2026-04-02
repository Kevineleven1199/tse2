"use client";

import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/src/lib/animations";

const FAQS = [
  {
    question: "What makes your cleaning organic or green?",
    answer:
      "We only use third-party certified products from EPA Safer Choice and Green Seal partners. No chlorine, ammonia, synthetic fragrances, or petroleum-derived surfactants. Every ingredient list is available on request."
  },
  {
    question: "Are your products safe for children and pets?",
    answer:
      "Absolutely. Our plant-powered formulas are non-toxic, biodegradable, and hypoallergenic. We also avoid aerosol sprays to protect sensitive lungs and paw pads."
  },
  {
    question: "Do I need to be home or prepare before you arrive?",
    answer:
      "We simply ask that surfaces are tidy so we can focus on detailed cleaning. You’re welcome to be home, leave us access instructions, or let our bonded crew lock up when finished."
  },
  {
    question: "What if I’m not satisfied with the clean?",
    answer:
      "Your satisfaction is guaranteed. If something feels off, contact us within 24 hours and we’ll revisit promptly to make it right—no additional charge."
  }
];

export const FAQSection = () => (
  <section className="bg-surface" id="faq">
    <div className="section-wrapper py-20">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
        className="mx-auto max-w-3xl text-center"
      >
        <motion.span variants={fadeUp} className="text-sm font-semibold uppercase tracking-[0.3em] text-accent/70">
          FAQ
        </motion.span>
        <motion.h2 variants={fadeUp} className="mt-4 font-display text-3xl font-semibold leading-tight text-accent md:text-4xl">
          Answers to your top questions about going green
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
          Don’t see what you’re looking for? Reach out at{" "}
          <a href="mailto:info@tsenow.com" className="font-semibold text-accent underline underline-offset-4">
            info@tsenow.com
          </a>{" "}
          and we’ll help.
        </motion.p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
        className="mt-12 space-y-6"
      >
        {FAQS.map((faq) => (
          <motion.div key={faq.question} variants={fadeUp} className="rounded-3xl border border-brand-100 bg-white px-6 py-5 text-left shadow-sm shadow-brand-100/30">
            <h3 className="font-display text-lg font-semibold text-accent">{faq.question}</h3>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">{faq.answer}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);
