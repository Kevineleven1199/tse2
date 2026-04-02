/**
 * Client-side analytics tracker for TriState
 * Tracks page views, custom events, and user behavior
 * Batches events and sends to API endpoint
 */

export type AnalyticsEvent = {
  type: "pageview" | "click" | "scroll" | "funnel" | "custom";
  page: string;
  event?: string;
  label?: string;
  value?: string | number;
  metadata?: Record<string, string | number | boolean>;
  timestamp: number;
  visitorId: string;
  sessionId: string;
  device: "mobile" | "tablet" | "desktop";
  viewport: { width: number; height: number };
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

type ScrollDepthMilestone = 25 | 50 | 75 | 100;

// Configuration
const ANALYTICS_CONFIG = {
  BATCH_INTERVAL: 5000, // 5 seconds
  MAX_BATCH_SIZE: 50,
  STORAGE_KEY_VISITOR: "gg_visitor_id",
  STORAGE_KEY_SESSION: "gg_session_id",
  API_ENDPOINT: "/api/analytics/collect",
};

/**
 * Analytics Tracker Class
 * Manages event collection, batching, and sending
 */
class AnalyticsTracker {
  private visitorId: string;
  private sessionId: string;
  private eventBatch: AnalyticsEvent[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private scrollDepthTracked: Set<ScrollDepthMilestone> = new Set();
  private sessionStartTime: number;
  private isInitialized = false;

  constructor() {
    this.visitorId = this.getOrCreateVisitorId();
    this.sessionId = this.getOrCreateSessionId();
    this.sessionStartTime = Date.now();
  }

  /**
   * Initialize the analytics tracker
   * Sets up event listeners and starts batching
   */
  public init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Track page unload/visibility changes
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => this.flush());
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          this.flush();
        }
      });

      // Start automatic batching
      this.startBatching();
    }
  }

  /**
   * Get or create a unique visitor ID
   */
  private getOrCreateVisitorId(): string {
    if (typeof window === "undefined") return "server";

    try {
      const stored = localStorage.getItem(ANALYTICS_CONFIG.STORAGE_KEY_VISITOR);
      if (stored) return stored;

      // Generate new visitor ID (UUID v4-like)
      const visitorId = this.generateId();
      localStorage.setItem(ANALYTICS_CONFIG.STORAGE_KEY_VISITOR, visitorId);
      return visitorId;
    } catch {
      // localStorage might be disabled, use session-only ID
      return this.generateId();
    }
  }

  /**
   * Get or create a unique session ID
   */
  private getOrCreateSessionId(): string {
    if (typeof window === "undefined") return "server";

    try {
      const stored = sessionStorage.getItem(ANALYTICS_CONFIG.STORAGE_KEY_SESSION);
      if (stored) return stored;

      const sessionId = this.generateId();
      sessionStorage.setItem(ANALYTICS_CONFIG.STORAGE_KEY_SESSION, sessionId);
      return sessionId;
    } catch {
      // sessionStorage might be disabled, use generated ID
      return this.generateId();
    }
  }

  /**
   * Generate a random ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current device type based on viewport width
   */
  private getDeviceType(): "mobile" | "tablet" | "desktop" {
    if (typeof window === "undefined") return "desktop";

    const width = window.innerWidth;
    if (width < 768) return "mobile";
    if (width < 1024) return "tablet";
    return "desktop";
  }

  /**
   * Get current viewport dimensions
   */
  private getViewport(): { width: number; height: number } {
    if (typeof window === "undefined") {
      return { width: 0, height: 0 };
    }

    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  /**
   * Get UTM parameters from URL
   */
  private getUtmParams(): {
    source?: string;
    medium?: string;
    campaign?: string;
  } {
    if (typeof window === "undefined") {
      return {};
    }

    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get("utm_source") || undefined,
      medium: params.get("utm_medium") || undefined,
      campaign: params.get("utm_campaign") || undefined,
    };
  }

  /**
   * Get referrer
   */
  private getReferrer(): string | undefined {
    if (typeof document === "undefined") return undefined;
    return document.referrer || undefined;
  }

  /**
   * Create event base object with common properties
   */
  private createEventBase(): Omit<AnalyticsEvent, "type" | "page"> {
    const utm = this.getUtmParams();
    return {
      timestamp: Date.now(),
      visitorId: this.visitorId,
      sessionId: this.sessionId,
      device: this.getDeviceType(),
      viewport: this.getViewport(),
      referrer: this.getReferrer(),
      utmSource: utm.source,
      utmMedium: utm.medium,
      utmCampaign: utm.campaign,
    };
  }

  /**
   * Track a page view
   */
  public trackPageView(path: string): void {
    const event: AnalyticsEvent = {
      type: "pageview",
      page: path,
      ...this.createEventBase(),
    };

    this.addEvent(event);
  }

  /**
   * Track a custom event
   */
  public trackEvent(
    eventName: string,
    label?: string,
    value?: string | number,
    metadata?: Record<string, string | number | boolean>
  ): void {
    const event: AnalyticsEvent = {
      type: "custom",
      page: typeof window !== "undefined" ? window.location.pathname : "/",
      event: eventName,
      label,
      value,
      metadata,
      ...this.createEventBase(),
    };

    this.addEvent(event);
  }

  /**
   * Track a CTA click
   */
  public trackClick(ctaLabel: string, metadata?: Record<string, string | number | boolean>): void {
    const event: AnalyticsEvent = {
      type: "click",
      page: typeof window !== "undefined" ? window.location.pathname : "/",
      event: "cta_click",
      label: ctaLabel,
      metadata,
      ...this.createEventBase(),
    };

    this.addEvent(event);
  }

  /**
   * Track scroll depth milestones
   */
  public trackScrollDepth(): void {
    if (typeof window === "undefined") return;

    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight === 0) return; // Page is not scrollable

    const scrollTop = window.scrollY;
    const scrollPercent = Math.round((scrollTop / scrollHeight) * 100);

    const milestones: ScrollDepthMilestone[] = [25, 50, 75, 100];

    milestones.forEach((milestone) => {
      if (scrollPercent >= milestone && !this.scrollDepthTracked.has(milestone)) {
        this.scrollDepthTracked.add(milestone);

        const event: AnalyticsEvent = {
          type: "scroll",
          page: window.location.pathname,
          event: "scroll_depth",
          value: milestone,
          metadata: { scrollPercent },
          ...this.createEventBase(),
        };

        this.addEvent(event);
      }
    });
  }

  /**
   * Track funnel step (e.g., quote flow progression)
   */
  public trackFunnelStep(
    funnelName: string,
    stepName: string,
    stepNumber: number,
    metadata?: Record<string, string | number | boolean>
  ): void {
    const event: AnalyticsEvent = {
      type: "funnel",
      page: typeof window !== "undefined" ? window.location.pathname : "/",
      event: funnelName,
      label: stepName,
      value: stepNumber,
      metadata,
      ...this.createEventBase(),
    };

    this.addEvent(event);
  }

  /**
   * Add event to batch and schedule send
   */
  private addEvent(event: AnalyticsEvent): void {
    this.eventBatch.push(event);

    // Send immediately if batch is full
    if (this.eventBatch.length >= ANALYTICS_CONFIG.MAX_BATCH_SIZE) {
      this.flush();
    }
  }

  /**
   * Start automatic batching timer
   */
  private startBatching(): void {
    if (this.batchTimer) return;

    this.batchTimer = setInterval(() => {
      if (this.eventBatch.length > 0) {
        this.flush();
      }
    }, ANALYTICS_CONFIG.BATCH_INTERVAL);
  }

  /**
   * Flush all batched events to API
   */
  public flush(): void {
    if (this.eventBatch.length === 0) return;

    const events = [...this.eventBatch];
    this.eventBatch = [];

    if (typeof navigator === "undefined") return;

    // Use sendBeacon for reliable unload tracking
    if (navigator.sendBeacon) {
      try {
        const blob = new Blob([JSON.stringify({ events })], {
          type: "application/json",
        });
        navigator.sendBeacon(ANALYTICS_CONFIG.API_ENDPOINT, blob);
      } catch (error) {
        console.error("[Analytics] Failed to send beacon:", error);
        // Fallback to fetch
        this.sendEventsFetch(events);
      }
    } else {
      // Fallback to fetch
      this.sendEventsFetch(events);
    }
  }

  /**
   * Send events via fetch API
   */
  private sendEventsFetch(events: AnalyticsEvent[]): void {
    // Use keepalive to ensure request completes even if tab closes
    fetch(ANALYTICS_CONFIG.API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ events }),
      keepalive: true,
    }).catch((error) => {
      console.error("[Analytics] Failed to send events:", error);
    });
  }

  /**
   * Reset session (useful for testing)
   */
  public resetSession(): void {
    this.sessionId = this.getOrCreateSessionId();
    this.scrollDepthTracked.clear();
    this.sessionStartTime = Date.now();
  }

  /**
   * Get session duration in seconds
   */
  public getSessionDuration(): number {
    return Math.round((Date.now() - this.sessionStartTime) / 1000);
  }

  /**
   * Destroy the tracker and clean up
   */
  public destroy(): void {
    this.flush();
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }
}

// Create singleton instance
let trackerInstance: AnalyticsTracker | null = null;

/**
 * Get or create the tracker singleton
 */
function getTracker(): AnalyticsTracker {
  if (trackerInstance === null) {
    trackerInstance = new AnalyticsTracker();
  }
  return trackerInstance;
}

/**
 * Initialize analytics tracking
 */
export function initAnalytics(): void {
  const tracker = getTracker();
  tracker.init();
}

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: string,
  label?: string,
  value?: string | number,
  metadata?: Record<string, string | number | boolean>
): void {
  const tracker = getTracker();
  tracker.trackEvent(eventName, label, value, metadata);
}

/**
 * Track a page view
 */
export function trackPageView(path: string): void {
  const tracker = getTracker();
  tracker.trackPageView(path);
}

/**
 * Track a CTA click
 */
export function trackClick(
  ctaLabel: string,
  metadata?: Record<string, string | number | boolean>
): void {
  const tracker = getTracker();
  tracker.trackClick(ctaLabel, metadata);
}

/**
 * Track scroll depth
 */
export function trackScrollDepth(): void {
  const tracker = getTracker();
  tracker.trackScrollDepth();
}

/**
 * Track funnel step
 */
export function trackFunnelStep(
  funnelName: string,
  stepName: string,
  stepNumber: number,
  metadata?: Record<string, string | number | boolean>
): void {
  const tracker = getTracker();
  tracker.trackFunnelStep(funnelName, stepName, stepNumber, metadata);
}

/**
 * Flush pending events
 */
export function flushAnalytics(): void {
  const tracker = getTracker();
  tracker.flush();
}

/**
 * Get session duration
 */
export function getSessionDuration(): number {
  const tracker = getTracker();
  return tracker.getSessionDuration();
}

/**
 * Destroy tracker
 */
export function destroyAnalytics(): void {
  if (trackerInstance) {
    trackerInstance.destroy();
    trackerInstance = null;
  }
}

// Export tracker instance for advanced usage
export function getAnalyticsTracker(): AnalyticsTracker {
  return getTracker();
}
