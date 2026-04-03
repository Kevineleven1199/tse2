"use client";

import { motion } from "framer-motion";
import { Hammer, ThermometerSun, TreePine, HardHat } from "lucide-react";
import { fadeUp, staggerContainer } from "@/src/lib/animations";
import { ServiceCard } from "@/src/components/ServiceCard";

const SERVICES = [
  {
    title: "Construction",
    description:
      "New builds, renovations, additions, and structural repairs for residential and commercial properties. From foundation to finish, we handle it all.",
    highlights: ["New construction & additions", "Renovations & remodeling", "Commercial build-outs & tenant improvements"],
    icon: Hammer,
    image: "/images/service-basic-clean.jpg"
  },
  {
    title: "HVAC / Heating & Air",
    description:
      "Complete heating and air conditioning services including installation, repair, and maintenance. Keep your home or business comfortable year-round.",
    highlights: ["System installation & replacement", "Repair & emergency service", "Preventive maintenance plans"],
    icon: ThermometerSun,
    image: "/images/service-deep-clean.jpg"
  },
  {
    title: "Lawn Care & Landscaping",
    description:
      "Professional lawn maintenance and landscape design to enhance your property's curb appeal. Weekly, bi-weekly, or one-time service available.",
    highlights: ["Mowing, edging & trimming", "Landscape design & planting", "Mulching, grading & seasonal cleanup"],
    icon: TreePine,
    image: "/images/service-moveout-clean.jpg"
  },
  {
    title: "Site Work & Paving",
    description:
      "Grading, excavation, driveway paving, parking lots, and complete site preparation for residential and commercial projects.",
    highlights: ["Driveways & parking lot paving", "Grading & excavation", "Drainage solutions & site prep"],
    icon: HardHat,
    image: "/images/tse-landscaping.jpg"
  }
];

export const ServicesSection = () => (
  <section className="bg-gradient-to-b from-white via-brand-50/40 to-white" id="services">
    <div className="section-wrapper py-20">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
        className="mx-auto max-w-3xl text-center"
      >
        <motion.span variants={fadeUp} className="text-sm font-semibold uppercase tracking-[0.3em] text-accent/70">
          Our Services
        </motion.span>
        <motion.h2 variants={fadeUp} className="mt-4 font-display text-3xl font-semibold leading-tight text-accent md:text-4xl">
          One call does it all across the Tri-State area
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
          Construction, HVAC, lawn care, landscaping, site work, and paving — serving Kentucky, Ohio, and West Virginia since 1992.
        </motion.p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
        className="mt-12 grid gap-6 lg:grid-cols-2"
      >
        {SERVICES.map((service) => (
          <ServiceCard key={service.title} {...service} />
        ))}
      </motion.div>
    </div>
  </section>
);
