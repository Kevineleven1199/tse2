"use client";

import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/src/lib/animations";

const FAQS = [
  {
    question: "What services does Tri State Enterprise offer?",
    answer:
      "We offer a full range of services including Construction, HVAC (heating & air conditioning), Lawn Care, Landscaping, Site Work, and Paving. Whether it's a small home repair or a large commercial project, one call does it all."
  },
  {
    question: "What areas do you serve?",
    answer:
      "We serve the entire Kentucky-Ohio-West Virginia Tri-State area including Flatwoods, Ashland, Russell, Catlettsburg, South Shore, Grayson, Huntington (WV), Ironton (OH), and surrounding communities in Greenup, Boyd, Carter, Lawrence, and Cabell counties."
  },
  {
    question: "Are you licensed and insured?",
    answer:
      "Yes. Tri State Enterprise is fully licensed, bonded, and insured. We've been in business since 1992 with over 30 years of experience serving the Tri-State area. Your protection and peace of mind are our priority."
  },
  {
    question: "How do I get a free estimate?",
    answer:
      "Call us at (606) 836-2534 or use our online quote form. We provide free estimates for all services and can typically schedule a site visit within the same week. No obligation, no pressure."
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
          Frequently Asked Questions
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
          Don&apos;t see what you&apos;re looking for? Call us at{" "}
          <a href="tel:+16068362534" className="font-semibold text-accent underline underline-offset-4">
            (606) 836-2534
          </a>{" "}
          or email{" "}
          <a href="mailto:tse@tristateenterprise.com" className="font-semibold text-accent underline underline-offset-4">
            tse@tristateenterprise.com
          </a>
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
