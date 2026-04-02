"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Leaf, ShieldCheck, Sparkles, AlertTriangle, Heart, Baby,
  Dog, Droplets, Wind, Skull, FlaskConical, ArrowRight,
  CheckCircle2, XCircle, Shield,
} from "lucide-react";
import { fadeUp, staggerContainer } from "@/src/lib/animations";

const TOXIC_FACTS = [
  { stat: "62+", label: "toxic chemicals in the average household cleaner", source: "Environmental Working Group" },
  { stat: "5x", label: "more air pollution INSIDE your home than outside after traditional cleaning", source: "EPA Indoor Air Quality Study" },
  { stat: "30%", label: "increase in childhood asthma linked to household chemical exposure", source: "American Lung Association" },
  { stat: "10x", label: "more sensitive to chemical residue — that's how much pets absorb through their paws", source: "ASPCA Poison Control" },
];

const COMPARISON = [
  {
    category: "Chemicals Used",
    traditional: "Ammonia, bleach, phthalates, triclosan, quaternary ammonium compounds",
    organic: "Plant-derived surfactants, essential oils, biodegradable compounds",
    risk: "Endocrine disruptors linked to hormonal imbalance and reproductive issues",
  },
  {
    category: "Indoor Air Quality",
    traditional: "VOCs released for 24-48 hours after cleaning, triggering headaches and respiratory irritation",
    organic: "Zero VOCs. Air quality actually improves after cleaning with HEPA filtration",
    risk: "WHO classifies some cleaning VOCs as Group 1 carcinogens",
  },
  {
    category: "Children's Safety",
    traditional: "Chemical residue on floors, toys, and surfaces where children crawl and play",
    organic: "Food-grade safe ingredients. No residue. Safe if touched or accidentally ingested",
    risk: "Children's developing immune systems are 3x more vulnerable to chemical exposure",
  },
  {
    category: "Pet Safety",
    traditional: "Paw absorption of floor chemicals, grooming ingestion, respiratory sensitivity",
    organic: "100% pet-safe. No toxic residue on floors. No fumes that irritate airways",
    risk: "Cats lack liver enzymes to process common cleaning chemicals — chronic exposure causes organ damage",
  },
  {
    category: "Environmental Impact",
    traditional: "Chemical runoff into Kentucky waterways, plastic packaging, non-biodegradable",
    organic: "Biodegradable within 28 days, no waterway contamination, minimal packaging",
    risk: "Cleaning chemicals are the #2 source of household water pollution in Kentucky",
  },
];

export const PillarsSection = () => (
  <section id="why-green">
    {/* Hero header */}
    <div className="bg-gradient-to-br from-red-900 via-red-800 to-amber-900 py-16 md:py-20">
      <div className="section-wrapper text-center">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
          <motion.span variants={fadeUp} className="inline-flex items-center gap-2 rounded-full bg-red-500/20 border border-red-400/30 px-5 py-2 text-xs font-bold uppercase tracking-[0.3em] text-red-200">
            <AlertTriangle className="h-4 w-4" /> The Hidden Danger in Your Home
          </motion.span>
          <motion.h2 variants={fadeUp} className="mt-5 font-display text-4xl font-bold text-white md:text-5xl leading-tight">
            What Your Current Cleaning<br />Company Isn&apos;t Telling You
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-2xl text-lg text-red-100/80">
            Traditional cleaning products contain dozens of chemicals classified as endocrine disruptors, carcinogens, and respiratory irritants.
            Your home should be the safest place on earth — not a chemical exposure zone.
          </motion.p>
        </motion.div>

        {/* Shocking stats */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOXIC_FACTS.map((fact) => (
            <div key={fact.label} className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-5 text-left">
              <p className="text-3xl font-bold text-red-300">{fact.stat}</p>
              <p className="mt-1 text-sm text-red-100/80">{fact.label}</p>
              <p className="mt-2 text-[10px] text-red-200/50 italic">— {fact.source}</p>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Organic vs Traditional comparison */}
    <div className="bg-white py-16 md:py-20">
      <div className="section-wrapper">
        <div className="text-center mb-12">
          <h3 className="font-display text-3xl font-bold text-accent">Traditional vs. Organic: The Facts</h3>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Side-by-side comparison backed by research from the EPA, American Lung Association, and Environmental Working Group.</p>
        </div>

        <div className="space-y-4">
          {COMPARISON.map((item) => (
            <div key={item.category} className="rounded-3xl border border-brand-100 overflow-hidden">
              <div className="bg-brand-50/30 px-6 py-3 border-b border-brand-100">
                <h4 className="font-bold text-accent">{item.category}</h4>
              </div>
              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-brand-100">
                <div className="p-5 bg-red-50/30">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-red-600">Traditional Chemicals</span>
                  </div>
                  <p className="text-sm text-red-900/80">{item.traditional}</p>
                  <p className="mt-2 text-xs text-red-600/70 italic flex items-start gap-1">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    {item.risk}
                  </p>
                </div>
                <div className="p-5 bg-green-50/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-green-700">Tri State Organic</span>
                  </div>
                  <p className="text-sm text-green-900/80">{item.organic}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Who benefits most */}
    <div className="bg-brand-50/30 py-16">
      <div className="section-wrapper">
        <h3 className="text-center font-display text-3xl font-bold text-accent mb-10">Who Benefits Most From Organic Cleaning?</h3>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Baby, title: "Families with Children", desc: "Children crawl on floors, put things in their mouths, and have developing immune systems 3x more vulnerable to chemicals. Organic cleaning eliminates this risk entirely.", image: "/images/Untitled-design-2-1.png" },
            { icon: Dog, title: "Pet Owners", desc: "Dogs and cats walk on chemically-treated floors then groom their paws — directly ingesting toxins. Our products are 100% pet-safe with zero residue.", image: "/images/Untitled-design-6-1.png" },
            { icon: Heart, title: "Allergy & Asthma Sufferers", desc: "Traditional cleaners release VOCs that trigger asthma attacks and allergic reactions. Our HEPA filtration + plant-based products actually improve indoor air quality.", image: "/images/Untitled-design-7-1.png" },
            { icon: Shield, title: "Health-Conscious Homeowners", desc: "If you eat organic food and filter your water, why breathe chemical fumes in your own home? Complete the circle with organic cleaning.", image: "/images/clean.png" },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl bg-white border border-brand-100 overflow-hidden shadow-sm hover:shadow-lg transition hover:-translate-y-1">
              <div className="relative h-40">
                <Image src={item.image} alt={item.title} fill className="object-cover" />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <item.icon className="h-5 w-5 text-brand-600" />
                  <h4 className="font-bold text-accent">{item.title}</h4>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/get-a-quote" className="inline-flex items-center gap-2 rounded-full bg-accent px-10 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-xl transition hover:bg-brand-700 active:scale-[0.97]">
            Switch to Organic Today <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">EPA Safer Choice certified. Licensed & insured. Satisfaction guaranteed.</p>
        </div>
      </div>
    </div>
  </section>
);
