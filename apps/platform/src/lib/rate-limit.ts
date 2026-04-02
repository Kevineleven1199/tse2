/**
 * In-memory sliding window rate limiter.
 *
 * LIMITATION: This is process-memory only. It works on a single-replica
 * deployment (Railway numReplicas=1) but does NOT synchronize across
 * multiple instances. For distributed rate limiting, use Upstash Redis
 * or similar. This is a launch-safe containment measure.
 *
 * Entries are automatically cleaned up every 5 minutes to prevent memory leaks.
 */

type RateLimitEntry = {
  timestamps: number[];
};

const stores = new Map<string, Map<string, RateLimitEntry>>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [, store] of stores) {
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < 600_000); // keep 10min max
      if (entry.timestamps.length === 0) store.delete(key);
    }
  }
}, 300_000);

type RateLimitConfig = {
  /** Unique name for this limiter (e.g., "auth:login") */
  name: string;
  /** Max requests allowed in the window */
  max: number;
  /** Window size in seconds */
  windowSec: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number | null;
};

/**
 * Check rate limit for a given key (typically IP or email or combination).
 * Returns whether the request is allowed and how many attempts remain.
 */
export function checkRateLimit(config: RateLimitConfig, key: string): RateLimitResult {
  if (!stores.has(config.name)) {
    stores.set(config.name, new Map());
  }
  const store = stores.get(config.name)!;

  const now = Date.now();
  const windowMs = config.windowSec * 1000;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= config.max) {
    // Rate limited
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = windowMs - (now - oldestInWindow);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil(retryAfterMs / 1000),
    };
  }

  // Allowed — record this attempt
  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: config.max - entry.timestamps.length,
    retryAfterSec: null,
  };
}

/**
 * Extract client IP from request headers.
 * Works behind Railway / Cloudflare / Nginx reverse proxies.
 */
export function getClientIp(request: Request): string {
  const headers = new Headers(request.headers);
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

// ── Pre-configured limiters for auth routes ──

export const AUTH_LIMITS = {
  /** Login: 10 attempts per IP per 15 minutes */
  login: { name: "auth:login", max: 10, windowSec: 900 },

  /** Login by email: 5 attempts per email per 15 minutes (tighter per-account) */
  loginByEmail: { name: "auth:login:email", max: 5, windowSec: 900 },

  /** Register: 5 per IP per hour */
  register: { name: "auth:register", max: 5, windowSec: 3600 },

  /** Forgot password: 3 per email per hour, 10 per IP per hour */
  forgotByEmail: { name: "auth:forgot:email", max: 3, windowSec: 3600 },
  forgotByIp: { name: "auth:forgot:ip", max: 10, windowSec: 3600 },

  /** Reset password: 5 attempts per IP per 15 minutes */
  reset: { name: "auth:reset", max: 5, windowSec: 900 },
} as const;
