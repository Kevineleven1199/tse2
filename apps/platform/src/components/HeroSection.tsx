"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { fadeUp } from "@/src/lib/animations";

export const HeroSection = () => (
  <section className="relative isolate overflow-hidden bg-gradient-to-br from-brand-50 via-white to-brand-100">
    <div className="absolute inset-0">
      <Image
        src="/images/hero-banner.jpg"
        alt="Tri State Enterprise crew working on a commercial project"
        fill
        priority
        className="object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, rgba(0,20,10,0.85) 0%, rgba(0,20,10,0.72) 40%, rgba(0,40,20,0.60) 70%, rgba(0,40,20,0.45) 100%)"
        }}
        aria-hidden="true"
      />
    </div>

    <div className="section-wrapper relative flex flex-col items-start justify-center py-20 sm:py-24 lg:py-28">
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="max-w-3xl space-y-6">
        {/* Top badge */}
        <span className="inline-flex items-center rounded-full bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.25em] text-white shadow-lg shadow-brand-500/30">
          Serving the Tri-State Area Since 1992
        </span>

        {/* Main headline */}
        <h1
          className="font-display text-4xl font-bold leading-[1.1] text-white sm:text-5xl lg:text-[3.75rem]"
          style={{ textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}
        >
          One Call Does It All
        </h1>

        {/* Subtitle */}
        <p className="text-lg leading-relaxed text-white/90 font-medium max-w-2xl">
          Serving the <span className="font-bold text-brand-200">Kentucky-Ohio-West Virginia Tri-State area</span> since 1992, Tri State Enterprise delivers trusted services in <span className="font-bold text-white">Construction, HVAC, Lawn Care, Landscaping, Site Work, and Paving</span>.
        </p>

        <p className="text-base leading-relaxed text-white/80 max-w-2xl">
          From home improvements to large commercial projects, we provide reliable, local expertise backed by decades of experience.
        </p>

        {/* Primary CTA + phone */}
        <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:gap-4">
          <Link
            href="#quote"
            className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-500 px-12 py-4 text-base font-bold uppercase tracking-[0.12em] text-white shadow-xl shadow-brand-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-brand-500/40 hover:scale-[1.02] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
            aria-label="Get a free quote"
          >
            <span>GET A FREE QUOTE</span>
            <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
          </Link>
          <Link
            href="tel:+16068362534"
            className="inline-flex min-h-[52px] items-center justify-center rounded-full border-2 border-white/40 bg-white/10 backdrop-blur-sm px-8 py-3.5 text-base font-bold text-white shadow-lg transition-all duration-300 hover:border-white/70 hover:bg-white/20 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
            Call (606) 836-2534
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center gap-3">
          {[
            "Licensed & Insured",
            "30+ Years Experience",
            "Free Estimates",
            "Residential & Commercial"
          ].map((badge) => (
            <span
              key={badge}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-2 text-sm font-semibold text-white shadow-sm"
            >
              <svg className="h-4 w-4 text-brand-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {badge}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);
