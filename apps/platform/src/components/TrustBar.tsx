"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const TRUST_SIGNALS = [
  "Construction \u2022 HVAC \u2022 Lawn Care \u2022 Landscaping \u2022 Site Work \u2022 Paving",
  "\u2713 Licensed, Bonded & Insured \u2022 Serving the KY-OH-WV Tri-State Area Since 1992",
  "\u260E (606) 836-2534 \u2022 One Call Does It All",
];

export const TrustBar = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
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
