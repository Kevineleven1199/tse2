"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

type CelebrationProps = {
  /** What triggered the celebration */
  type: "register" | "login" | "schedule" | "reschedule" | "payment";
  /** Show the overlay */
  show: boolean;
  /** Called when the overlay finishes */
  onComplete?: () => void;
};

const MESSAGES: Record<CelebrationProps["type"], { emoji: string; title: string; subtitle: string }> = {
  register: {
    emoji: "🎉",
    title: "Welcome to the Tri State Family!",
    subtitle: "Your account is all set. Let's get your first eco-clean booked!",
  },
  login: {
    emoji: "👋",
    title: "Welcome Back!",
    subtitle: "Great to see you again. Your green home awaits.",
  },
  schedule: {
    emoji: "✨",
    title: "Clean Scheduled!",
    subtitle: "Your project is booked! We'll send a confirmation and reminder before we arrive.",
  },
  reschedule: {
    emoji: "📅",
    title: "Rescheduled Successfully!",
    subtitle: "Your new service date is confirmed. Flexibility is our thing!",
  },
  payment: {
    emoji: "💚",
    title: "Thank You!",
    subtitle: "Payment received — you're keeping it green! We appreciate your support.",
  },
};

/** Simple confetti particle */
type Particle = {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
};

const COLORS = ["#2d5016", "#4a7c28", "#86c545", "#f0c40f", "#fff", "#a8d86e", "#16a34a", "#bbf7d0"];

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 20,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
    delay: Math.random() * 0.6,
  }));
}

export const CelebrationOverlay = ({ type, show, onComplete }: CelebrationProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const msg = MESSAGES[type];

  useEffect(() => {
    if (show) {
      setParticles(generateParticles(type === "payment" ? 60 : 40));
      const timer = setTimeout(() => {
        onComplete?.();
      }, 3200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [show, type, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onComplete}
          />

          {/* Confetti particles */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute rounded-sm"
                style={{
                  left: `${p.x}%`,
                  width: p.size,
                  height: p.size * 0.6,
                  backgroundColor: p.color,
                }}
                initial={{ y: "-10vh", rotate: 0, opacity: 1 }}
                animate={{
                  y: "110vh",
                  rotate: p.rotation + 720,
                  opacity: [1, 1, 1, 0.5, 0],
                  x: [0, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 120],
                }}
                transition={{
                  duration: 2.5 + Math.random(),
                  delay: p.delay,
                  ease: "easeIn",
                }}
              />
            ))}
          </div>

          {/* Message card */}
          <motion.div
            className="relative z-10 mx-4 max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl"
            initial={{ scale: 0.5, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.1 }}
          >
            <motion.div
              className="mb-3 text-6xl"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 10, stiffness: 200, delay: 0.3 }}
            >
              {msg.emoji}
            </motion.div>
            <motion.h2
              className="text-xl font-bold text-accent"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {msg.title}
            </motion.h2>
            <motion.p
              className="mt-2 text-sm text-muted-foreground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {msg.subtitle}
            </motion.p>

            {/* Sparkle ring animation */}
            <motion.div
              className="absolute -inset-1 rounded-3xl border-2 border-brand-300"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: [0.95, 1.05, 1], opacity: [0, 0.6, 0] }}
              transition={{ duration: 1.2, delay: 0.3, repeat: 1 }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Hook to trigger celebration and auto-dismiss
 */
export const useCelebration = () => {
  const [celebrationState, setCelebrationState] = useState<{
    show: boolean;
    type: CelebrationProps["type"];
  }>({ show: false, type: "login" });

  const celebrate = useCallback((type: CelebrationProps["type"]) => {
    setCelebrationState({ show: true, type });
  }, []);

  const dismiss = useCallback(() => {
    setCelebrationState((prev) => ({ ...prev, show: false }));
  }, []);

  return { celebrationState, celebrate, dismiss };
};
