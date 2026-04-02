"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/src/lib/animations";

const GALLERY_ITEMS = [
  {
    src: "/images/gallery-organic-cleaning.jpg",
    title: "Organic Home Cleaning",
    description: "Safe, all-organic cleaning for residential and commercial spaces",
  },
  {
    src: "/images/gallery-pressure-washing.jpg",
    title: "Pressure & Power Washing",
    description: "Professional pressure washing for driveways, patios, and walkways",
  },
  {
    src: "/images/gallery-car-detailing.jpg",
    title: "Mobile Car Detailing",
    description: "Professional mobile detailing for cars, SUVs, and work vehicles",
  },
];

export const GallerySection = () => (
  <section className="bg-surface py-20">
    <div className="section-wrapper">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
        className="mx-auto max-w-3xl text-center"
      >
        <motion.span variants={fadeUp} className="text-sm font-semibold uppercase tracking-[0.3em] text-accent/70">
          Our Work
        </motion.span>
        <motion.h2 variants={fadeUp} className="mt-4 font-display text-3xl font-semibold leading-tight text-accent md:text-4xl">
          See the TriState difference
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
          From spotless kitchens to gleaming driveways, our eco-friendly services leave every surface looking its best—without harsh chemicals.
        </motion.p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
        className="mt-12 grid gap-6 md:grid-cols-3"
      >
        {GALLERY_ITEMS.map((item) => (
          <motion.div key={item.title} variants={fadeUp} className="group">
            <div className="relative overflow-hidden rounded-2xl shadow-lg shadow-brand-100/40">
              <div className="relative h-64 w-full overflow-hidden">
                <Image
                  src={item.src}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-accent/70 via-accent/15 to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-1 text-sm text-white/80">{item.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        className="mt-10 text-center"
      >
        <Link
          href="#quote"
          className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-accent px-10 py-3 text-base font-semibold uppercase tracking-[0.12em] text-white shadow-brand transition hover:bg-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
        >
          Get a Free Quote Today
        </Link>
      </motion.div>
    </div>
  </section>
);
