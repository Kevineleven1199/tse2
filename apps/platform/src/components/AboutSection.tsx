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
          Locally Rooted &bull; Family Owned &bull; Since 1992
        </motion.span>
        <motion.h2 variants={fadeUp} className="font-display text-3xl font-semibold leading-tight text-accent md:text-4xl">
          Decades of trusted service across the Tri-State area
        </motion.h2>
        <motion.p variants={fadeUp} className="text-base leading-relaxed text-muted-foreground md:text-lg">
          Tri State Enterprise was founded in 1992 with a simple mission: deliver reliable, quality workmanship to our neighbors in the Kentucky-Ohio-West Virginia Tri-State area. What started as a small local operation has grown into a full-service company offering construction, HVAC, lawn care, landscaping, site work, and paving.
        </motion.p>
        <motion.p variants={fadeUp} className="text-base leading-relaxed text-muted-foreground md:text-lg">
          Today, our experienced team serves Flatwoods, Ashland, Russell, Catlettsburg, South Shore, Huntington, and surrounding communities with the same values we started with: honest work, fair pricing, and standing behind every job we do. One call really does do it all.
        </motion.p>
        <motion.p variants={fadeUp} className="text-base font-semibold uppercase tracking-[0.2em] text-accent">
          Your trusted local contractor &bull; Licensed &amp; insured
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
          alt="Tri State Enterprise crew on a job site"
          width={900}
          height={640}
          className="h-full w-full object-cover"
        />
      </motion.div>
    </div>
  </section>
);
