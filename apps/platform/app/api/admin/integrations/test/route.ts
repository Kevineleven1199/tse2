import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import { IntegrationType } from "@prisma/client";

export const dynamic = "force-dynamic";

const testSchema = z.object({
  type: z.nativeEnum(IntegrationType),
});

type TestResult = {
  ok: boolean;
  latencyMs: number;
  error?: string;
  detail?: string;
  /** If true, this was a config-presence check, not a real API call. Status stays configured_unverified. */
  configCheckOnly?: boolean;
};

/**
 * POST /api/admin/integrations/test
 * Test connection for a configured integration.
 * Uses the stored config from the Integration record for this tenant.
 * Falls back to env vars for providers that still use them.
 */
export async function POST(request: Request) {
  const session = await requireSession({ roles: ["HQ"] });
  const body = await request.json();
  const { type } = testSchema.parse(body);

  const integration = await prisma.integration.findUnique({
    where: { tenantId_type: { tenantId: session.tenantId, type } },
  });

  const config = (integration?.config as Record<string, unknown>) ?? {};

  // Helper: get config value or env fallback
  const val = (configKey: string, envKey?: string): string =>
    ((config[configKey] as string) || (envKey ? process.env[envKey] : "") || "");

  const start = Date.now();
  let result: TestResult;

  try {
    switch (type) {
      case "OPENAI": {
        const apiKey = val("apiKey", "OPENAI_API_KEY");
        const baseUrl = val("baseUrl") || "https://api.openai.com/v1";
        if (!apiKey) { result = { ok: false, latencyMs: 0, error: "API key not configured" }; break; }
        const res = await fetch(`${baseUrl}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10000),
        });
        result = res.ok
          ? { ok: true, latencyMs: Date.now() - start, detail: "Models endpoint accessible" }
          : { ok: false, latencyMs: Date.now() - start, error: `HTTP ${res.status}` };
        break;
      }

      case "ANTHROPIC": {
        const apiKey = val("apiKey", "ANTHROPIC_API_KEY");
        if (!apiKey) { result = { ok: false, latencyMs: 0, error: "API key not configured" }; break; }
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: (config.model as string) || "claude-sonnet-4-20250514",
            max_tokens: 1,
            messages: [{ role: "user", content: "ping" }],
          }),
          signal: AbortSignal.timeout(15000),
        });
        result = res.ok
          ? { ok: true, latencyMs: Date.now() - start, detail: "Messages API accessible" }
          : { ok: false, latencyMs: Date.now() - start, error: `HTTP ${res.status}` };
        break;
      }

      case "XAI": {
        const apiKey = val("apiKey", "XAI_API_KEY");
        const baseUrl = val("baseUrl") || "https://api.x.ai/v1";
        if (!apiKey) { result = { ok: false, latencyMs: 0, error: "API key not configured" }; break; }
        const res = await fetch(`${baseUrl}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10000),
        });
        result = res.ok
          ? { ok: true, latencyMs: Date.now() - start, detail: "Models endpoint accessible" }
          : { ok: false, latencyMs: Date.now() - start, error: `HTTP ${res.status}` };
        break;
      }

      case "OPENROUTER": {
        const apiKey = val("apiKey", "OPENROUTER_API_KEY");
        if (!apiKey) { result = { ok: false, latencyMs: 0, error: "API key not configured" }; break; }
        const res = await fetch("https://openrouter.ai/api/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10000),
        });
        result = res.ok
          ? { ok: true, latencyMs: Date.now() - start, detail: "Models endpoint accessible" }
          : { ok: false, latencyMs: Date.now() - start, error: `HTTP ${res.status}` };
        break;
      }

      case "OPENPHONE": {
        const apiKey = val("apiKey", "OPENPHONE_API_KEY");
        if (!apiKey) { result = { ok: false, latencyMs: 0, error: "API key not configured" }; break; }
        const res = await fetch("https://api.openphone.com/v1/phone-numbers", {
          headers: { Authorization: apiKey },
          signal: AbortSignal.timeout(10000),
        });
        result = res.ok
          ? { ok: true, latencyMs: Date.now() - start, detail: "Phone numbers retrieved" }
          : { ok: false, latencyMs: Date.now() - start, error: `HTTP ${res.status}` };
        break;
      }

      case "SENDGRID": {
        const apiKey = val("apiKey", "SENDGRID_API_KEY");
        if (!apiKey) { result = { ok: false, latencyMs: 0, error: "API key not configured" }; break; }
        const res = await fetch("https://api.sendgrid.com/v3/user/profile", {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10000),
        });
        result = res.ok
          ? { ok: true, latencyMs: Date.now() - start, detail: "SendGrid profile accessible" }
          : { ok: false, latencyMs: Date.now() - start, error: `HTTP ${res.status}` };
        break;
      }

      case "GOOGLE_CALENDAR": {
        const email = val("serviceAccountEmail", "GOOGLE_CALENDAR_CLIENT_EMAIL");
        const key = val("privateKey", "GOOGLE_CALENDAR_PRIVATE_KEY");
        const calendarId = val("calendarId", "GOOGLE_CALENDAR_ID");
        if (!email || !key) { result = { ok: false, latencyMs: 0, error: "Service account not configured" }; break; }
        try {
          const { google } = await import("googleapis");
          const auth = new google.auth.GoogleAuth({
            credentials: { client_email: email, private_key: key.replace(/\\n/g, "\n") },
            scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
          });
          const calendar = google.calendar({ version: "v3", auth });
          const targetCalendar = calendarId || "primary";
          const cal = await calendar.calendars.get({ calendarId: targetCalendar });
          result = {
            ok: true,
            latencyMs: Date.now() - start,
            detail: `Calendar: ${cal.data.summary || targetCalendar}`,
          };
        } catch (err: any) {
          result = {
            ok: false,
            latencyMs: Date.now() - start,
            error: err.message?.slice(0, 200) || "Calendar API error",
          };
        }
        break;
      }

      case "GOOGLE_DRIVE": {
        const rawKey = val("serviceAccountKey", "GOOGLE_SERVICE_ACCOUNT_KEY");
        const parentId = val("parentFolderId", "GOOGLE_DRIVE_PARENT_FOLDER_ID");
        if (!rawKey) { result = { ok: false, latencyMs: 0, error: "Service account key not configured" }; break; }
        if (!parentId) { result = { ok: false, latencyMs: 0, error: "Parent folder ID not configured" }; break; }
        try {
          // Try to parse the key and verify folder access
          const { google } = await import("googleapis");
          let credentials: { client_email?: string; private_key?: string };
          try {
            credentials = JSON.parse(Buffer.from(rawKey, "base64").toString());
          } catch {
            credentials = JSON.parse(rawKey);
          }
          const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ["https://www.googleapis.com/auth/drive"],
          });
          const drive = google.drive({ version: "v3", auth });
          const folder = await drive.files.get({
            fileId: parentId,
            fields: "id,name,mimeType",
          });
          result = {
            ok: true,
            latencyMs: Date.now() - start,
            detail: `Folder: ${folder.data.name} (${parentId})`,
          };
        } catch (err: any) {
          result = {
            ok: false,
            latencyMs: Date.now() - start,
            error: err.message?.slice(0, 200) || "Drive API error",
          };
        }
        break;
      }

      case "STRIPE": {
        const key = val("secretKey", "STRIPE_SECRET_KEY");
        if (!key) { result = { ok: false, latencyMs: 0, error: "Secret key not configured" }; break; }
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(key, { apiVersion: "2023-08-16" });
        const balance = await stripe.balance.retrieve();
        result = {
          ok: true,
          latencyMs: Date.now() - start,
          detail: `Available: ${balance.available.map(b => `${b.amount / 100} ${b.currency}`).join(", ")}`,
        };
        break;
      }

      case "JOBBER": {
        // Jobber uses OAuth — attempt a real GraphQL introspection query
        if (!integration || integration.status === "disconnected") {
          result = { ok: false, latencyMs: 0, error: "Not connected (OAuth required)" };
        } else {
          const accessToken = config.accessToken as string | undefined;
          if (!accessToken) {
            result = { ok: false, latencyMs: 0, error: "No access token stored" };
          } else {
            try {
              const res = await fetch("https://api.getjobber.com/api/graphql", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ query: "{ account { name } }" }),
                signal: AbortSignal.timeout(10000),
              });
              if (res.ok) {
                const data = await res.json();
                result = {
                  ok: true,
                  latencyMs: Date.now() - start,
                  detail: `Account: ${data?.data?.account?.name || "connected"}`,
                };
              } else {
                result = {
                  ok: false,
                  latencyMs: Date.now() - start,
                  error: `HTTP ${res.status} — token may be expired`,
                };
              }
            } catch (err: any) {
              result = {
                ok: false,
                latencyMs: Date.now() - start,
                error: err.message?.slice(0, 200) || "Jobber API error",
              };
            }
          }
        }
        break;
      }

      case "PABBLY": {
        const apiKey = val("apiKey");
        const webhookUrl = val("webhookUrl");
        if (!apiKey && !webhookUrl) {
          result = { ok: false, latencyMs: 0, error: "Neither API key nor webhook URL configured" };
        } else {
          // Config presence only — no real API call available.
          result = {
            ok: true,
            configCheckOnly: true,
            latencyMs: Date.now() - start,
            detail: `${apiKey ? "API key set" : ""}${apiKey && webhookUrl ? " + " : ""}${webhookUrl ? "Webhook URL set" : ""} (config only, no live test)`,
          };
        }
        break;
      }

      case "GMAIL": {
        // Gmail via Google Workspace service account or OAuth
        const email = val("serviceAccountEmail");
        const key = val("privateKey");
        if (!email && !key) {
          result = { ok: false, latencyMs: 0, error: "Service account or OAuth credentials not configured" };
        } else {
          try {
            const { google } = await import("googleapis");
            const auth = new google.auth.GoogleAuth({
              credentials: { client_email: email, private_key: key.replace(/\\n/g, "\n") },
              scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
            });
            const gmail = google.gmail({ version: "v1", auth });
            const profile = await gmail.users.getProfile({ userId: "me" });
            result = {
              ok: true,
              latencyMs: Date.now() - start,
              detail: `Connected: ${profile.data.emailAddress}`,
            };
          } catch (err: any) {
            result = {
              ok: false,
              latencyMs: Date.now() - start,
              error: err.message?.includes("delegation")
                ? "Service account needs domain-wide delegation for Gmail"
                : err.message?.slice(0, 200) || "Gmail API error",
            };
          }
        }
        break;
      }

      case "GUSTO": {
        const apiToken = val("apiToken", "GUSTO_API_TOKEN");
        if (!apiToken) { result = { ok: false, latencyMs: 0, error: "API token not configured" }; break; }
        try {
          const res = await fetch("https://api.gusto.com/v1/me", {
            headers: { Authorization: `Bearer ${apiToken}` },
            signal: AbortSignal.timeout(10000),
          });
          if (res.ok) {
            const data = await res.json();
            result = {
              ok: true,
              latencyMs: Date.now() - start,
              detail: `Connected: ${data.email || "authenticated"}`,
            };
          } else {
            result = { ok: false, latencyMs: Date.now() - start, error: `HTTP ${res.status}` };
          }
        } catch (err: any) {
          result = { ok: false, latencyMs: Date.now() - start, error: err.message?.slice(0, 200) || "Gusto API error" };
        }
        break;
      }

      case "POSTHOG": {
        const apiKey = val("apiKey");
        const host = val("host") || "https://app.posthog.com";
        if (!apiKey) { result = { ok: false, latencyMs: 0, error: "API key not configured" }; break; }
        try {
          const res = await fetch(`${host}/api/projects/`, {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(10000),
          });
          if (res.ok) {
            const data = await res.json();
            const projectCount = data.results?.length ?? data.count ?? "unknown";
            result = {
              ok: true,
              latencyMs: Date.now() - start,
              detail: `Connected: ${projectCount} project(s)`,
            };
          } else {
            result = { ok: false, latencyMs: Date.now() - start, error: `HTTP ${res.status}` };
          }
        } catch (err: any) {
          result = { ok: false, latencyMs: Date.now() - start, error: err.message?.slice(0, 200) || "PostHog API error" };
        }
        break;
      }

      case "SENTRY": {
        const authToken = val("authToken");
        if (!authToken) { result = { ok: false, latencyMs: 0, error: "Auth token not configured" }; break; }
        try {
          const res = await fetch("https://sentry.io/api/0/projects/", {
            headers: { Authorization: `Bearer ${authToken}` },
            signal: AbortSignal.timeout(10000),
          });
          if (res.ok) {
            const data = await res.json();
            result = {
              ok: true,
              latencyMs: Date.now() - start,
              detail: `Connected: ${data.length ?? 0} project(s)`,
            };
          } else {
            result = { ok: false, latencyMs: Date.now() - start, error: `HTTP ${res.status}` };
          }
        } catch (err: any) {
          result = { ok: false, latencyMs: Date.now() - start, error: err.message?.slice(0, 200) || "Sentry API error" };
        }
        break;
      }

      case "GOOGLE_SHEETS": {
        const rawKey = val("serviceAccountKey", "GOOGLE_SERVICE_ACCOUNT_KEY");
        const spreadsheetId = val("spreadsheetId", "GOOGLE_SPREADSHEET_ID");
        if (!rawKey) { result = { ok: false, latencyMs: 0, error: "Service account key not configured" }; break; }
        try {
          const { google } = await import("googleapis");
          let credentials: { client_email?: string; private_key?: string };
          try { credentials = JSON.parse(Buffer.from(rawKey, "base64").toString()); }
          catch { credentials = JSON.parse(rawKey); }
          const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
          });
          const sheets = google.sheets({ version: "v4", auth });
          if (spreadsheetId) {
            const sheet = await sheets.spreadsheets.get({ spreadsheetId, fields: "properties.title" });
            result = { ok: true, latencyMs: Date.now() - start, detail: `Sheet: ${sheet.data.properties?.title}` };
          } else {
            result = { ok: true, latencyMs: Date.now() - start, detail: "Authenticated (no spreadsheet ID set)" };
          }
        } catch (err: any) {
          result = { ok: false, latencyMs: Date.now() - start, error: err.message?.slice(0, 200) || "Sheets API error" };
        }
        break;
      }

      case "GOOGLE_MAPS": {
        const apiKey = val("apiKey", "GOOGLE_PLACES_API_KEY");
        if (!apiKey) { result = { ok: false, latencyMs: 0, error: "API key not configured" }; break; }
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=Flatwoods,FL&key=${apiKey}`,
            { signal: AbortSignal.timeout(10000) }
          );
          const data = await res.json();
          if (data.status === "OK") {
            result = { ok: true, latencyMs: Date.now() - start, detail: "Geocoding API active" };
          } else {
            result = { ok: false, latencyMs: Date.now() - start, error: `Geocode status: ${data.status}` };
          }
        } catch (err: any) {
          result = { ok: false, latencyMs: Date.now() - start, error: err.message?.slice(0, 200) || "Maps API error" };
        }
        break;
      }

      case "TELEGRAM": {
        const botToken = val("botToken");
        const chatId = val("chatId");
        if (!botToken) { result = { ok: false, latencyMs: 0, error: "Bot token not configured" }; break; }
        if (!chatId) { result = { ok: false, latencyMs: 0, error: "Chat ID not configured" }; break; }
        try {
          const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
            signal: AbortSignal.timeout(10000),
          });
          if (res.ok) {
            const data = await res.json();
            result = { ok: true, latencyMs: Date.now() - start, detail: `Bot: @${data.result?.username || "connected"}` };
          } else {
            result = { ok: false, latencyMs: Date.now() - start, error: `HTTP ${res.status} — invalid bot token` };
          }
        } catch (err: any) {
          result = { ok: false, latencyMs: Date.now() - start, error: err.message?.slice(0, 200) || "Telegram API error" };
        }
        break;
      }

      case "WHATSAPP": {
        const accessToken = val("accessToken");
        const phoneNumberId = val("phoneNumberId");
        if (!accessToken) { result = { ok: false, latencyMs: 0, error: "Access token not configured" }; break; }
        if (!phoneNumberId) { result = { ok: false, latencyMs: 0, error: "Phone number ID not configured" }; break; }
        try {
          const res = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: AbortSignal.timeout(10000),
          });
          if (res.ok) {
            const data = await res.json();
            result = { ok: true, latencyMs: Date.now() - start, detail: `Phone: ${data.display_phone_number || phoneNumberId}` };
          } else {
            result = { ok: false, latencyMs: Date.now() - start, error: `HTTP ${res.status}` };
          }
        } catch (err: any) {
          result = { ok: false, latencyMs: Date.now() - start, error: err.message?.slice(0, 200) || "WhatsApp API error" };
        }
        break;
      }

      case "FACEBOOK": {
        const token = val("pageAccessToken");
        const pageId = val("pageId");
        if (!token || !pageId) { result = { ok: false, latencyMs: 0, error: "Page access token and page ID required" }; break; }
        try {
          const res = await fetch(`https://graph.facebook.com/v18.0/${pageId}?fields=name,fan_count&access_token=${token}`, { signal: AbortSignal.timeout(10000) });
          if (res.ok) { const d = await res.json(); result = { ok: true, latencyMs: Date.now() - start, detail: `Page: ${d.name} (${d.fan_count || 0} fans)` }; }
          else { result = { ok: false, latencyMs: Date.now() - start, error: `HTTP ${res.status}` }; }
        } catch (err: any) { result = { ok: false, latencyMs: Date.now() - start, error: err.message?.slice(0, 200) || "Facebook API error" }; }
        break;
      }

      case "INSTAGRAM": {
        const token = val("accessToken");
        const acctId = val("accountId");
        if (!token || !acctId) { result = { ok: false, latencyMs: 0, error: "Access token and account ID required" }; break; }
        try {
          const res = await fetch(`https://graph.facebook.com/v18.0/${acctId}?fields=username,followers_count&access_token=${token}`, { signal: AbortSignal.timeout(10000) });
          if (res.ok) { const d = await res.json(); result = { ok: true, latencyMs: Date.now() - start, detail: `@${d.username} (${d.followers_count || 0} followers)` }; }
          else { result = { ok: false, latencyMs: Date.now() - start, error: `HTTP ${res.status}` }; }
        } catch (err: any) { result = { ok: false, latencyMs: Date.now() - start, error: err.message?.slice(0, 200) || "Instagram API error" }; }
        break;
      }

      case "TWITTER_X": {
        const apiKey = val("apiKey");
        if (!apiKey) { result = { ok: false, latencyMs: 0, error: "API key not configured" }; break; }
        result = { ok: true, configCheckOnly: true, latencyMs: Date.now() - start, detail: "API key configured (X API requires OAuth 2.0 for full test)" };
        break;
      }

      case "TIKTOK": {
        const token = val("accessToken");
        if (!token) { result = { ok: false, latencyMs: 0, error: "Access token not configured" }; break; }
        result = { ok: true, configCheckOnly: true, latencyMs: Date.now() - start, detail: "Access token configured" };
        break;
      }

      default:
        result = { ok: false, latencyMs: 0, error: `Test not implemented for ${type}` };
    }
  } catch (err: any) {
    result = {
      ok: false,
      latencyMs: Date.now() - start,
      error: err.message?.slice(0, 300) || "Connection test failed",
    };
  }

  // Update integration status and test timestamp
  if (integration) {
    // configCheckOnly = credential presence verified, not a real API call → stay configured_unverified
    const newStatus = result.configCheckOnly
      ? "configured_unverified"
      : result.ok
        ? "healthy"
        : "failing";
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        status: (config.enabled === false) ? "disabled" : newStatus,
        config: {
          ...(config as any),
          lastTestedAt: new Date().toISOString(),
          lastTestResult: result.ok ? "ok" : "error",
          lastTestError: result.error ?? null,
        },
      },
    });
  }

  // Audit
  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "integration.tested",
      metadata: { type, ok: result.ok, latencyMs: result.latencyMs, error: result.error },
    },
  });

  return NextResponse.json(result);
}
