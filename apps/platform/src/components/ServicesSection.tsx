"use client";

import { motion } from "framer-motion";
import { Sparkles, Home, Building2, RefreshCcw } from "lucide-react";
import { fadeUp, staggerContainer } from "@/src/lib/animations";
import { ServiceCard } from "@/src/components/ServiceCard";

const SERVICES = [
  {
    title: "Healthy Home Cleaning",
    description:
      "Weekly, bi-weekly, or monthly visits tailored to your household rhythm. We maintain shine without synthetic fragrances or harsh residues.",
    highlights: ["Dusting, sanitizing, and floor care with plant-based solutions", "Kitchen & bath detailing every visit", "Custom task list matched to your lifestyle"],
    icon: Home,
    image: "/images/service-basic-clean.jpg"
  },
  {
    title: "Deep Refresh & Detox",
    description:
      "Reset your space with meticulous attention to baseboards, vents, appliances, and high-touch areas—perfect for seasonal resets or special events.",
    highlights: ["High/low dusting, grout and fixture polishing", "HEPA-filter vacuuming to remove allergens", "Add-ons available for inside appliances & windows"],
    icon: Sparkles,
    image: "/images/service-deep-clean.jpg"
  },
  {
    title: "Move-In / Move-Out Detail",
    description:
      "Leave no room overlooked before the keys change hands. We prepare homes and rentals with a chemical-free finish future residents will love.",
    highlights: ["Cabinetry, closets, and appliances cleaned inside & out", "Construction dust and debris removal", "Landlord or realtor checklists welcomed"],
    icon: RefreshCcw,
    image: "/images/service-moveout-clean.jpg"
  },
  {
    title: "Eco Commercial Care",
    description:
      "Keep offices, studios, and clinics feeling fresh and professional. Flexible schedules minimize disruption while maintaining a toxin-free workspace.",
    highlights: ["Night or off-hour visits available", "Electrostatic disinfecting with green products", "Custom scopes for lobbies, breakrooms, and shared areas"],
    icon: Building2,
    image: "/images/gallery-organic-cleaning.jpg"
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
          Services
        </motion.span>
        <motion.h2 variants={fadeUp} className="mt-4 font-display text-3xl font-semibold leading-tight text-accent md:text-4xl">
          Organic cleaning in Flatwoods, Ashland &amp; Tri-State Area
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
          Eco-friendly house cleaning, deep detox, move-out details, and green commercial service—weekly, biweekly, or one-time.
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
