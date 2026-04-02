/**
 * In-App Scheduler
 *
 * Self-contained cron-like scheduler that runs inside the Next.js process.
 * Eliminates the need for external cron services (Railway cron, cron-job.org).
 *
 * Jobs:
 * 1. Daily newsletter + cleaning tip  — 8:00 AM ET
 * 2. Weekly newsletter digest          — Monday 9:00 AM ET
 * 3. Appointment reminders             — 10:00 AM ET daily
 *
 * Each job checks the database for "already ran today/this week" before executing,
 * so it's safe if the server restarts or the check runs multiple times.
 */

const TIMEZONE = "America/New_York";
const CHECK_INTERVAL_MS = 60_000; // Check every 60 seconds

let schedulerStarted = false;

type SchedulerJob = {
  name: string;
  /** Check if this job should run right now */
  shouldRun: (now: Date) => boolean;
  /** Execute the job */
  execute: () => Promise<void>;
  /** Track last run to avoid double-fire within same interval */
  lastRun?: string;
};

/**
 * Get current time in ET timezone
 */
const getETTime = () => {
  const now = new Date();
  const etStr = now.toLocaleString("en-US", { timeZone: TIMEZONE });
  return new Date(etStr);
};

const getETHour = () => getETTime().getHours();
const getETMinute = () => getETTime().getMinutes();
const getETDay = () => getETTime().getDay(); // 0=Sun, 1=Mon
const getETDateKey = () => {
  const et = getETTime();
  return `${et.getFullYear()}-${String(et.getMonth() + 1).padStart(2, "0")}-${String(et.getDate()).padStart(2, "0")}`;
};
const getETWeekKey = () => {
  const et = getETTime();
  const yearStart = new Date(et.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((et.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);
  return `${et.getFullYear()}-W${weekNum}`;
};

/**
 * Internal fetch to our own API routes
 */
const selfFetch = async (path: string, options?: RequestInit) => {
  const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const secret = process.env.CRON_SECRET || process.env.NEWSLETTER_SECRET || "internal";

  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
      ...(options?.headers || {}),
    },
  });
};

const jobs: SchedulerJob[] = [
  // ──────────────────────────────────────────────
  // Daily Newsletter + Cleaning Tip — 8:00 AM ET
  // ──────────────────────────────────────────────
  {
    name: "daily-newsletter",
    shouldRun: (now) => {
      const hour = getETHour();
      const minute = getETMinute();
      return hour === 8 && minute >= 0 && minute < 2;
    },
    execute: async () => {
      console.log("[scheduler] Triggering daily newsletter...");
      try {
        const res = await selfFetch("/api/newsletter/send", { method: "POST" });
        const data = await res.json();
        console.log("[scheduler] Newsletter result:", JSON.stringify(data));
      } catch (err) {
        console.error("[scheduler] Newsletter failed:", err);
      }
    },
  },

  // ──────────────────────────────────────────────
  // Appointment Reminders — 10:00 AM ET daily
  // ──────────────────────────────────────────────
  {
    name: "appointment-reminders",
    shouldRun: () => {
      const hour = getETHour();
      const minute = getETMinute();
      return hour === 10 && minute >= 0 && minute < 2;
    },
    execute: async () => {
      console.log("[scheduler] Triggering appointment reminders...");
      try {
        const res = await selfFetch("/api/cron/reminders", { method: "GET" });
        const data = await res.json();
        console.log("[scheduler] Reminders result:", JSON.stringify(data));
      } catch (err) {
        console.error("[scheduler] Reminders failed:", err);
      }
    },
  },

  // ──────────────────────────────────────────────
  // Weekly Digest — Monday 9:00 AM ET
  // ──────────────────────────────────────────────
  {
    name: "weekly-digest",
    shouldRun: () => {
      const hour = getETHour();
      const minute = getETMinute();
      const day = getETDay();
      return day === 1 && hour === 9 && minute >= 0 && minute < 2;
    },
    execute: async () => {
      console.log("[scheduler] Triggering weekly digest...");
      try {
        const res = await selfFetch("/api/newsletter/weekly", { method: "POST" });
        const data = await res.json();
        console.log("[scheduler] Weekly digest result:", JSON.stringify(data));
      } catch (err) {
        console.error("[scheduler] Weekly digest failed:", err);
      }
    },
  },
];

/**
 * Run the scheduler tick — check all jobs
 */
const tick = () => {
  const now = new Date();
  const dateKey = getETDateKey();

  for (const job of jobs) {
    const runKey = job.name === "weekly-digest" ? getETWeekKey() : dateKey;

    // Skip if already ran in this period
    if (job.lastRun === runKey) continue;

    if (job.shouldRun(now)) {
      job.lastRun = runKey;
      job.execute().catch((err) => {
        console.error(`[scheduler] Job ${job.name} uncaught error:`, err);
      });
    }
  }
};

/**
 * Start the scheduler (idempotent — safe to call multiple times)
 */
export const startScheduler = () => {
  if (schedulerStarted) return;
  schedulerStarted = true;

  console.log("[scheduler] Starting automated scheduler...");
  console.log("[scheduler] Jobs: daily-newsletter (8am ET), appointment-reminders (10am ET), weekly-digest (Mon 9am ET)");

  // Run first tick after a short delay to let the server fully start
  setTimeout(tick, 5_000);

  // Then run every minute
  setInterval(tick, CHECK_INTERVAL_MS);
};
