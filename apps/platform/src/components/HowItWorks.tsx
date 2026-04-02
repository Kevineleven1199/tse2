"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/src/lib/animations";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

const STEPS = [
  {
    title: "Request Your Quote",
    description:
      "Tell us about your home or workspace, choose your ideal schedule, and get a personalized organic cleaning plan in minutes.",
    icon: "/images/broom.png"
  },
  {
    title: "We Prepare & Clean Green",
    description:
      "Our Flatwoods crew arrives with certified eco products and a task list built just for you — every surface polished without the harsh chemicals.",
    icon: "/images/booking.png"
  },
  {
    title: "Breathe & Enjoy",
    description:
      "Come back to a healthier space with long-lasting freshness, improved indoor air, and zero toxic residue — backed by our satisfaction guarantee.",
    icon: "/images/clean.png"
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
          Simple & Seamless
        </motion.span>
        <motion.h2 variants={fadeUp} className="mt-4 font-display text-3xl font-semibold leading-tight md:text-4xl">
          Three steps to a naturally clean space
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
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100">
                  <Image src={step.icon} alt={step.title} width={64} height={64} />
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
