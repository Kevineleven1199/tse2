"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/src/lib/animations";

export const AboutSection = () => (
  <section className="bg-surface" id="about">
    <div className="section-wrapper grid gap-10 py-20 md:grid-cols-2 md:items-center">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
        className="space-y-6"
      >
        <motion.span variants={fadeUp} className="text-sm font-semibold uppercase tracking-[0.3em] text-accent/70">
          Locally Rooted • Family Owned • Flatwoods Proud
        </motion.span>
        <motion.h2 variants={fadeUp} className="font-display text-3xl font-semibold leading-tight text-accent md:text-4xl">
          Born from a belief that clean should never come with compromise
        </motion.h2>
        <motion.p variants={fadeUp} className="text-base leading-relaxed text-muted-foreground md:text-lg">
          Tri State Enterprise started in Flatwoods when we saw families and local businesses searching for safer options than the harsh chemicals used by traditional cleaners. We built a company around transparency, plant-powered products, and a crew you’d trust in your own home.
        </motion.p>
        <motion.p variants={fadeUp} className="text-base leading-relaxed text-muted-foreground md:text-lg">
          Today, our team expertly serves Flatwoods, Manatee, and Hillsborough counties with certified green supplies, low-VOC processes, and friendly professionals who love making spaces shine. We're as committed to outstanding service as we are to sustainability.
        </motion.p>
        <motion.p variants={fadeUp} className="text-base font-semibold uppercase tracking-[0.2em] text-accent">
          Your wellbeing is our mission. Your satisfaction is guaranteed.
        </motion.p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl shadow-lg shadow-brand-100"
      >
        <Image
          src="/images/about-team.jpg"
          alt="Tri State Enterprise team in Flatwoods providing eco-friendly cleaning services"
          width={900}
          height={640}
          className="h-full w-full object-cover"
        />
      </motion.div>
    </div>
  </section>
);
