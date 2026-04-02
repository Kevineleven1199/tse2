"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

export type ToastVariant = "success" | "error" | "info";

export type ToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastItem = ToastOptions & {
  id: string;
  createdAt: number;
};

type ToastContextValue = {
  toasts: ToastItem[];
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 4500;
const MAX_TOASTS = 4;

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeouts = useRef<Record<string, number>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));

    const timeout = timeouts.current[id];
    if (timeout) {
      window.clearTimeout(timeout);
      delete timeouts.current[id];
    }
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = generateId();
      const durationMs = options.durationMs ?? DEFAULT_DURATION_MS;
      const next: ToastItem = {
        id,
        createdAt: Date.now(),
        title: options.title,
        description: options.description,
        variant: options.variant ?? "info",
        durationMs
      };

      setToasts((prev) => [...prev, next].slice(-MAX_TOASTS));
      timeouts.current[id] = window.setTimeout(() => dismiss(id), durationMs);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toasts, toast, dismiss }), [toasts, toast, dismiss]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};
