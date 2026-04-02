"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, CheckCircle, AlertCircle } from "lucide-react";

export const ExitIntentPopup = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasShownOnce, setHasShownOnce] = useState(false);

  useEffect(() => {
    // Check if already shown in this session
    const hasShown = sessionStorage.getItem("exitIntentPopupShown");
    if (hasShown) {
      setHasShownOnce(true);
      return;
    }

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger on desktop and if mouse is leaving top of viewport
      if (window.innerWidth < 768) return;
      if (hasShownOnce) return;

      if (e.clientY <= 0) {
        setIsVisible(true);
        setHasShownOnce(true);
        sessionStorage.setItem("exitIntentPopupShown", "true");

        // Fire-and-forget analytics — don't block anything
        try {
          fetch("/api/analytics/collect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              events: [{
                type: "custom",
                event: "exit_intent_popup_shown",
                page: window.location.pathname,
                visitorId: "anon",
                sessionId: "anon",
                device: window.innerWidth < 768 ? "mobile" : "desktop",
                viewport: { width: window.innerWidth, height: window.innerHeight },
                timestamp: new Date().toISOString()
              }]
            })
          }).catch(() => {});
        } catch {
          // Analytics should never block UX
        }
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [hasShownOnce]);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsVisible(false);
          setIsSuccess(false);
        }, 4000);
      } else {
        const data = await response.json().catch(() => ({}));
        setErrorMsg(
          (data as { error?: string }).error ||
            "Something went wrong. Please try again or email us at info@tsenow.com"
        );
      }
    } catch {
      setErrorMsg("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          />

          {/* Popup */}
          <motion.div
            initial={{ y: -50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -50, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4"
          >
            <div className="relative rounded-2xl bg-white shadow-2xl overflow-hidden">
              {/* Gradient accent bar */}
              <div className="h-1 bg-gradient-to-r from-accent to-brand-600" />

              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-accent transition-all hover:bg-brand-200"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Content */}
              <div className="p-8">
                {!isSuccess ? (
                  <>
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                      <Mail className="h-5 w-5 text-accent" />
                    </div>

                    <h2 className="mb-2 text-2xl font-bold text-accent">
                      Wait! Get 15% Off Your First Clean
                    </h2>

                    <p className="mb-1 text-xs font-semibold text-green-600">
                      New customers only &bull; Offer expires this Friday
                    </p>

                    <p className="mb-6 text-base text-muted-foreground">
                      Get your personalized quote + claim your discount code
                      instantly. Join 200+ Flatwoods families who made the switch.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errorMsg) setErrorMsg("");
                        }}
                        required
                        className="w-full rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm placeholder-muted-foreground transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />

                      {errorMsg && (
                        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                          <span>{errorMsg}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? "Claiming..." : "Claim My Discount"}
                      </button>
                    </form>

                    <p className="mt-4 text-center text-xs text-muted-foreground">
                      No spam. Unsubscribe anytime.
                    </p>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="mb-4 flex justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-accent">
                      Check Your Email!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your 15% discount code <span className="font-bold text-accent">GREEN15</span> is on its way.
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Don&apos;t see it? Check your spam folder or email us at info@tsenow.com
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
