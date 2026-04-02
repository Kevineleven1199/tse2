"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  initAnalytics,
  trackPageView,
  trackScrollDepth,
  destroyAnalytics,
} from "@/src/lib/analytics";

/**
 * AnalyticsProvider Component
 * Wraps the app and initializes analytics tracking
 * Automatically tracks page views and scroll depth
 * Should be added to root layout
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Initialize analytics on mount
  useEffect(() => {
    initAnalytics();
    trackPageView(pathname);

    // Clean up on unmount
    return () => {
      destroyAnalytics();
    };
  }, []);

  // Track page view on pathname change
  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      trackScrollDepth();
    };

    // Debounce scroll events (track every 500ms)
    let scrollTimeout: NodeJS.Timeout;

    const debouncedScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 500);
    };

    window.addEventListener("scroll", debouncedScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", debouncedScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  return <>{children}</>;
}
