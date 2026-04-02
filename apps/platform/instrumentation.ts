/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts — perfect for starting background jobs.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on the server (not during build or edge runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Validate environment before anything else
    const { validateEnv } = await import("@/src/lib/env-check");
    validateEnv();

    const { startScheduler } = await import("@/src/lib/scheduler");
    startScheduler();
  }
}
