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
        alt="A sunlit Kentucky kitchen being cleaned with eco-friendly products"
        fill
        priority
        className="object-cover"
      />
      {/* Stronger overlay with gradient for text readability */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.93) 40%, rgba(241,248,244,0.88) 70%, rgba(241,248,244,0.75) 100%)"
        }}
        aria-hidden="true"
      />
    </div>

    <div className="section-wrapper relative flex flex-col items-start justify-center py-20 sm:py-24 lg:py-28">
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="max-w-3xl space-y-6">
        {/* Top badge */}
        <span className="inline-flex items-center rounded-full bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.25em] text-white shadow-lg shadow-brand-500/30">
          Flatwoods&apos;s Trusted Organic Cleaning
        </span>

        {/* Main headline with text shadow for impact */}
        <h1
          className="font-display text-4xl font-bold leading-[1.1] text-foreground sm:text-5xl lg:text-[3.75rem]"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.06)" }}
        >
          Flatwoods&apos;s Safest Organic Home Cleaning—
          <span className="text-accent">Instant Price in 30 Seconds</span>
        </h1>

        {/* Subtitle with strong contrast */}
        <p className="text-lg leading-relaxed text-foreground/80 font-medium max-w-2xl">
          EPA-certified, kid-safe cleaning <span className="font-bold text-accent">trusted by Flatwoods families</span>. No harsh chemicals. No contracts. No obligation. Get your price online right now.
        </p>

        {/* Primary CTA + phone */}
        <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:gap-4">
          <Link
            href="#quote"
            className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-500 px-12 py-4 text-base font-bold uppercase tracking-[0.12em] text-white shadow-xl shadow-brand-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-brand-500/40 hover:scale-[1.02] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
            aria-label="Get my instant organic cleaning price"
          >
            <span>Get My Instant Price</span>
            <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
          </Link>
          <Link
            href="tel:+16065550100"
            className="inline-flex min-h-[52px] items-center justify-center rounded-full border-2 border-accent/30 bg-white/90 backdrop-blur-sm px-8 py-3.5 text-base font-bold text-accent shadow-lg transition-all duration-300 hover:border-accent/60 hover:bg-brand-50 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
            Call (606) 555-0100
          </Link>
        </div>

        {/* Price anchor with pill styling */}
        <div className="inline-flex items-center gap-3 rounded-full bg-white/80 backdrop-blur-sm border border-brand-200/60 px-6 py-3 shadow-sm">
          <span className="text-sm font-bold text-foreground">
            Most homes: <span className="text-accent text-base">$120–$220</span>
          </span>
          <span className="h-4 w-px bg-brand-300/50" />
          <span className="text-sm font-medium text-foreground/70">Takes 30 seconds</span>
          <span className="h-4 w-px bg-brand-300/50" />
          <span className="text-sm font-medium text-foreground/70">No credit card needed</span>
        </div>

        {/* Tagline */}
        <div className="inline-flex items-center rounded-full bg-white/80 backdrop-blur-sm border border-brand-100 px-6 py-3 shadow-sm">
          <span className="text-sm font-semibold text-foreground">
            Eco-friendly cleaning <span className="text-accent">trusted by Flatwoods families</span>
          </span>
        </div>

        {/* Trust Badges - pill style with backgrounds */}
        <div className="flex flex-wrap items-center gap-3">
          {[
            "Licensed & Insured",
            "Background-Checked Crew",
            "EPA Safer Choice Certified"
          ].map((badge) => (
            <span
              key={badge}
              className="inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-sm border border-brand-200/60 px-4 py-2 text-sm font-semibold text-foreground shadow-sm"
            >
              <svg className="h-4 w-4 text-brand-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
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
