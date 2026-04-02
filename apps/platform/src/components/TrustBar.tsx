"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

// Only verifiable claims — no specific review counts or home counts
const TRUST_SIGNALS = [
  "🌿 100% Organic & Eco-Friendly Cleaning Products",
  "✓ Licensed, Insured & Background-Checked • Flatwoods, KY",
  "🏠 Safe for Kids, Pets & the Environment",
];

export const TrustBar = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check if hidden in session
    const isHidden = sessionStorage.getItem("trustBarHidden");
    if (isHidden) {
      setIsVisible(false);
      return;
    }

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % TRUST_SIGNALS.length);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    sessionStorage.setItem("trustBarHidden", "true");
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="relative bg-accent text-white"
        >
          <div className="section-wrapper flex items-center justify-center gap-4 py-1.5 text-center text-xs font-medium">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                {TRUST_SIGNALS[currentIndex]}
              </motion.div>
            </AnimatePresence>

            {/* Close button */}
            <button
              onClick={handleClose}
              className="ml-auto flex-shrink-0 p-1 opacity-70 transition-opacity hover:opacity-100"
              aria-label="Hide trust bar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
