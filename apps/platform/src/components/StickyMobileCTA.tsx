"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Phone } from "lucide-react";
import { trackClick } from "@/src/lib/analytics";

// Honest trust message — no fake scarcity
const TRUST_MESSAGE = "Eco-friendly • Licensed & insured • Flatwoods's organic cleaning choice";

export const StickyMobileCTA = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const trustMessage = TRUST_MESSAGE;

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling 400px
      const shouldShow = window.scrollY > 400;
      setIsVisible(shouldShow);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Don't render if dismissed or if we're at the quote section
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === "#quote") {
        setIsVisible(false);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleQuoteClick = () => {
    trackClick("mobile_cta_quote");
  };

  const handlePhoneClick = () => {
    trackClick("mobile_cta_phone");
  };

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        >
          {/* Gradient fade effect at top */}
          <div className="h-4 bg-gradient-to-t from-white to-transparent" />
          
          <div className="bg-white border-t border-brand-100 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 py-3 safe-area-pb">
            <div className="flex items-center gap-3">
              {/* Dismiss button */}
              <button
                onClick={() => setIsDismissed(true)}
                className="flex-shrink-0 p-2 text-muted-foreground hover:text-accent transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Main CTA */}
              <Link
                href="#quote"
                onClick={handleQuoteClick}
                className="flex-1 flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white shadow-brand transition-all hover:bg-brand-700 active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4" />
                Get My Instant Price
              </Link>

              {/* Phone button */}
              <Link
                href="tel:+16065550100"
                onClick={handlePhoneClick}
                className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full border-2 border-brand-200 bg-white text-accent transition-all hover:border-brand-300 hover:bg-brand-50"
                aria-label="Call us"
              >
                <Phone className="h-5 w-5" />
              </Link>
            </div>

            {/* Trust text */}
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {trustMessage}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
