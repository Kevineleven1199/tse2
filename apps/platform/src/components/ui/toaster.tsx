"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { type ToastVariant, useToast } from "@/src/lib/toast";

const getVariantStyles = (variant: ToastVariant) => {
  if (variant === "success") {
    return {
      icon: CheckCircle2,
      iconClass: "text-green-600",
      border: "border-green-100",
      bg: "bg-white"
    };
  }

  if (variant === "error") {
    return {
      icon: AlertTriangle,
      iconClass: "text-red-600",
      border: "border-red-100",
      bg: "bg-white"
    };
  }

  return {
    icon: Info,
    iconClass: "text-brand-600",
    border: "border-brand-100",
    bg: "bg-white"
  };
};

export const Toaster = () => {
  const { toasts, dismiss } = useToast();

  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-end gap-3 px-4 sm:top-6 sm:px-6"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const { icon: Icon, iconClass, border, bg } = getVariantStyles(toast.variant ?? "info");

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="pointer-events-auto w-full max-w-sm"
            >
              <div
                role="status"
                className={cn(
                  "relative flex items-start gap-3 rounded-3xl border px-4 py-4 shadow-xl shadow-brand-100/40",
                  border,
                  bg
                )}
              >
                <Icon className={cn("mt-0.5 h-5 w-5 flex-shrink-0", iconClass)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-accent">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{toast.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground transition hover:bg-brand-50 hover:text-accent"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
