"use client";

import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/src/lib/animations";
import { Star } from "lucide-react";

// Real Google Reviews are passed as props from a server component wrapper.
// Do NOT add hardcoded fake names or quotes — FTC requires real customer testimonials.

export type GoogleReviewProp = {
  id: string;
  authorName: string;
  rating: number;
  text: string | null;
  publishedAt: string;
};

export const TestimonialsSection = ({ reviews = [] }: { reviews?: GoogleReviewProp[] }) => (
  <section className="bg-white" id="testimonials">
    <div className="section-wrapper py-20">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
        className="mx-auto max-w-4xl text-center"
      >
        <motion.span variants={fadeUp} className="text-sm font-semibold uppercase tracking-[0.3em] text-accent/70">
          What Our Clients Say
        </motion.span>
        <motion.h2 variants={fadeUp} className="mt-4 font-display text-3xl font-semibold leading-tight text-accent md:text-4xl">
          Trusted by Flatwoods families for a healthier clean
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
          We take pride in delivering quality workmanship that our community trusts.
        </motion.p>

        {reviews.length > 0 ? (
          <motion.div variants={fadeUp} className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-2xl border border-brand-100 bg-brand-50/30 p-6 text-left shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center gap-1">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-sunshine text-sunshine" />
                  ))}
                </div>
                {review.text && (
                  <p className="mt-3 text-sm leading-relaxed text-foreground/80">
                    &ldquo;{review.text.length > 140 ? `${review.text.slice(0, 140)}...` : review.text}&rdquo;
                  </p>
                )}
                <p className="mt-3 text-xs font-semibold text-accent">
                  {review.authorName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(review.publishedAt).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            ))}
          </motion.div>
        ) : null}

        <motion.a
          variants={fadeUp}
          href="https://www.google.com/maps/place/Tri+State+Enterprise"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent/90"
        >
          Read All Google Reviews
        </motion.a>
      </motion.div>
    </div>
  </section>
);
