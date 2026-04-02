/**
 * Environment Variable Validation
 *
 * Runs at app startup to detect missing configuration early.
 * Logs CRITICAL errors for vars that will cause data loss if missing,
 * and WARNINGs for vars that degrade functionality.
 */

const REQUIRED_VARS = [
  { key: "DATABASE_URL", impact: "No database connection — app cannot function" },
  { key: "DEFAULT_TENANT_ID", impact: "TodoItems, CRM leads, and activity tracking will silently fail" },
  { key: "OPENPHONE_API_KEY", impact: "SMS notifications and call webhook processing will fail" },
  { key: "OPENPHONE_FROM", impact: "No sender number for outbound SMS" },
] as const;

const RECOMMENDED_VARS = [
  { key: "OPENAI_API_KEY", impact: "Call transcript AI summaries unavailable (fallback email will still send)" },
  { key: "SENDGRID_API_KEY", impact: "Email delivery falls back to SMTP or console logging" },
  { key: "CALL_NOTIFY_EMAILS", impact: "Call summary emails default to admin@tsenow.com" },
  { key: "STRIPE_SECRET_KEY", impact: "Payment processing unavailable" },
  { key: "OPENPHONE_HQ_NUMBERS", impact: "HQ SMS alerts fall back to OPENPHONE_FROM number" },
] as const;

export function validateEnv(): { ok: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];

  console.log("[ENV] ─── Startup Environment Check ───");

  for (const { key, impact } of REQUIRED_VARS) {
    if (!process.env[key]) {
      missing.push(key);
      console.error(`[ENV] ❌ CRITICAL: ${key} is NOT SET — ${impact}`);
    }
  }

  for (const { key, impact } of RECOMMENDED_VARS) {
    if (!process.env[key]) {
      warnings.push(key);
      console.warn(`[ENV] ⚠️  WARNING: ${key} is not set — ${impact}`);
    }
  }

  if (missing.length === 0 && warnings.length === 0) {
    console.log("[ENV] ✅ All environment variables configured");
  } else if (missing.length === 0) {
    console.log(`[ENV] ✅ Required vars OK | ${warnings.length} optional var(s) missing`);
  } else {
    console.error(`[ENV] ❌ ${missing.length} REQUIRED var(s) missing — data loss may occur!`);
  }

  console.log("[ENV] ─── End Environment Check ───");

  return { ok: missing.length === 0, missing, warnings };
}
