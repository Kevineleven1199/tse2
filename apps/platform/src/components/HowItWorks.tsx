"use client";

import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/src/lib/animations";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { FileText, HardHat, ThumbsUp } from "lucide-react";

const STEPS = [
  {
    title: "Request Your Estimate",
    description:
      "Tell us about your project and get a free, no-obligation estimate. Construction, HVAC, lawn care, landscaping, site work, or paving — one call does it all.",
    Icon: FileText,
  },
  {
    title: "We Get to Work",
    description:
      "Our experienced Tri-State crew arrives on schedule with professional equipment and a detailed project plan. Quality craftsmanship on every job.",
    Icon: HardHat,
  },
  {
    title: "Quality Guaranteed",
    description:
      "Your project is completed to the highest standards. We stand behind every job with our satisfaction guarantee — backed by 30+ years of experience.",
    Icon: ThumbsUp,
  }
];

export const HowItWorks = () => (
  <section className="bg-gradient-to-r from-brand-50 via-brand-100 to-brand-50" id="process">
    <div className="section-wrapper py-20">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
        className="mx-auto max-w-3xl text-center text-accent"
      >
        <motion.span variants={fadeUp} className="text-sm font-semibold uppercase tracking-[0.3em] text-accent/70">
          Simple &amp; Seamless
        </motion.span>
        <motion.h2 variants={fadeUp} className="mt-4 font-display text-3xl font-semibold leading-tight md:text-4xl">
          Three steps to getting your project done right
        </motion.h2>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
        className="mt-12 grid gap-6 lg:grid-cols-3"
      >
        {STEPS.map((step) => (
          <motion.div key={step.title} variants={fadeUp}>
            <Card className="h-full bg-white text-center">
              <CardHeader className="flex flex-col items-center gap-4">
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                  <step.Icon className="h-10 w-10" />
                </span>
                <h3 className="text-lg font-semibold text-accent">{step.title}</h3>
              </CardHeader>
              <CardContent className="text-base leading-relaxed text-muted-foreground">
                <p>{step.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);
