"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Wrench, ShieldCheck, Sparkles, Award, Hammer, ThermometerSun,
  TreePine, HardHat, ArrowRight,
  CheckCircle2, Shield,
} from "lucide-react";
import { fadeUp, staggerContainer } from "@/src/lib/animations";

const WHY_TSE = [
  { stat: "30+", label: "years serving the Tri-State area", source: "Established 1992" },
  { stat: "1000+", label: "residential and commercial projects completed", source: "KY, OH, WV" },
  { stat: "6", label: "service lines under one roof — one call does it all", source: "Full-service contractor" },
  { stat: "100%", label: "licensed, bonded, and insured for your protection", source: "State-certified" },
];

const SERVICE_HIGHLIGHTS = [
  {
    category: "Construction",
    description: "From new builds to renovations, additions, and structural repairs. Residential and commercial construction backed by decades of hands-on experience.",
    icon: Hammer,
  },
  {
    category: "HVAC / Heating & Air",
    description: "Installation, repair, and maintenance of heating and air conditioning systems. Keep your home or business comfortable year-round.",
    icon: ThermometerSun,
  },
  {
    category: "Lawn Care & Landscaping",
    description: "Professional lawn maintenance, landscape design, planting, mulching, and seasonal cleanup to keep your property looking its best.",
    icon: TreePine,
  },
  {
    category: "Site Work & Paving",
    description: "Grading, excavation, driveway paving, parking lots, and site preparation for commercial and residential projects.",
    icon: HardHat,
  },
];

export const PillarsSection = () => (
  <section id="why-tse">
    {/* Hero header */}
    <div className="bg-gradient-to-br from-brand-900 via-brand-800 to-emerald-900 py-16 md:py-20">
      <div className="section-wrapper text-center">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
          <motion.span variants={fadeUp} className="inline-flex items-center gap-2 rounded-full bg-brand-500/20 border border-brand-400/30 px-5 py-2 text-xs font-bold uppercase tracking-[0.3em] text-brand-200">
            <Award className="h-4 w-4" /> Why Choose Tri State Enterprise
          </motion.span>
          <motion.h2 variants={fadeUp} className="mt-5 font-display text-4xl font-bold text-white md:text-5xl leading-tight">
            One Call Does It All
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-2xl text-lg text-brand-100/80">
            Since 1992, Tri State Enterprise has been the trusted name for construction, HVAC, lawn care, landscaping, site work, and paving across Kentucky, Ohio, and West Virginia.
          </motion.p>
        </motion.div>

        {/* Stats */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_TSE.map((fact) => (
            <div key={fact.label} className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-5 text-left">
              <p className="text-3xl font-bold text-brand-300">{fact.stat}</p>
              <p className="mt-1 text-sm text-brand-100/80">{fact.label}</p>
              <p className="mt-2 text-[10px] text-brand-200/50 italic">{fact.source}</p>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Service highlights */}
    <div className="bg-white py-16 md:py-20">
      <div className="section-wrapper">
        <div className="text-center mb-12">
          <h3 className="font-display text-3xl font-bold text-accent">Our Core Services</h3>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">From the foundation to the finishing touches, we handle every aspect of your project with reliability and expertise.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {SERVICE_HIGHLIGHTS.map((item) => (
            <div key={item.category} className="rounded-3xl border border-brand-100 overflow-hidden p-6 bg-gradient-to-br from-white to-brand-50/30 shadow-sm hover:shadow-lg transition hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <item.icon className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-accent text-lg">{item.category}</h4>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/get-a-quote" className="inline-flex items-center gap-2 rounded-full bg-accent px-10 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-xl transition hover:bg-brand-700 active:scale-[0.97]">
            Get a Free Estimate <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">Licensed &amp; insured. Free estimates. Satisfaction guaranteed.</p>
        </div>
      </div>
    </div>
  </section>
);
