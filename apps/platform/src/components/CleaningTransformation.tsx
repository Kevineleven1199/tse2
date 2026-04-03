"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

const TRANSFORMATIONS = [
  {
    label: "Kitchen Deep Clean",
    before: "/images/service-deep-clean.jpg",
    after: "/images/service-basic-clean.jpg",
  },
  {
    label: "Move-Out Detail",
    before: "/images/service-moveout-clean.jpg",
    after: "/images/gallery-organic-cleaning.jpg",
  },
  {
    label: "Pressure Wash",
    before: "/images/gallery-pressure-washing.jpg",
    after: "/images/gallery-car-detailing.jpg",
  },
];

export const CleaningTransformation = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });

  const handleMove = (clientX: number) => {
    if (!containerRef.current || !isDragging) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percent);
  };

  const active = TRANSFORMATIONS[activeIndex];

  return (
    <section ref={sectionRef} className="py-16 md:py-24 bg-white overflow-hidden">
      <div className="section-wrapper">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-10"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 border border-brand-100 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-700">
            <Sparkles className="h-3.5 w-3.5" /> See the Difference
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold text-accent md:text-4xl">
            Drag to Reveal the Transformation
          </h2>
          <p className="mt-3 text-muted-foreground">
            Slide left and right to see the before and after of a real Tri State project.
          </p>
        </motion.div>

        {/* Transformation selector */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {TRANSFORMATIONS.map((t, i) => (
            <button
              key={t.label}
              onClick={() => { setActiveIndex(i); setSliderPosition(50); }}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                activeIndex === i
                  ? "bg-accent text-white shadow-lg"
                  : "bg-brand-50 text-accent hover:bg-brand-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Before/After slider */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mx-auto max-w-4xl"
        >
          <div
            ref={containerRef}
            className="relative aspect-[16/10] overflow-hidden rounded-3xl shadow-2xl cursor-col-resize select-none"
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onMouseMove={(e) => handleMove(e.clientX)}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
            onTouchMove={(e) => handleMove(e.touches[0].clientX)}
          >
            {/* After image (full) */}
            <Image src={active.after} alt="After cleaning" fill className="object-cover" />

            {/* Before image (clipped) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPosition}%` }}
            >
              <Image
                src={active.before}
                alt="Before cleaning"
                fill
                className="object-cover"
                style={{ minWidth: containerRef.current ? `${containerRef.current.offsetWidth}px` : "100%" }}
              />
            </div>

            {/* Slider handle */}
            <div
              className="absolute top-0 bottom-0 z-10"
              style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
            >
              <div className="h-full w-1 bg-white shadow-lg" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-xl">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-accent">
                  <path d="M8 5L3 12L8 19M16 5L21 12L16 19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Labels */}
            <div className="absolute top-4 left-4 rounded-full bg-red-500/90 px-3 py-1 text-xs font-bold uppercase text-white backdrop-blur-sm">
              Before
            </div>
            <div className="absolute top-4 right-4 rounded-full bg-green-500/90 px-3 py-1 text-xs font-bold uppercase text-white backdrop-blur-sm">
              After
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-10 text-center"
        >
          <Link href="/get-a-quote" className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition hover:bg-brand-700 active:scale-[0.97]">
            Get Your Transformation <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};
