const SENDGRID_BASE_URL = "https://api.sendgrid.com/v3/mail/send";

type SmsPayload = {
  to: string;
  text: string;
  from?: string;
};

type EmailPayload = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
};

const defaultFromName = "Tri State Enterprise";
const defaultFromEmail = process.env.SENDGRID_FROM_EMAIL ?? "no-reply@tsenow.com";

const logMissing = (service: string) => console.warn(`[notifications] Missing configuration for ${service}, skipping send.`);

/**
 * Send SMS via OpenPhone API v1.
 * API requires: content (string), from (E.164), to (array of one E.164 number).
 * Auth header is just the API key (no "Bearer" prefix per OpenPhone docs).
 */
export const sendSms = async ({ to, text, from }: SmsPayload) => {
  const apiKey = process.env.OPENPHONE_API_KEY;
  const fromNumber = from ?? process.env.OPENPHONE_DEFAULT_NUMBER;

  if (!apiKey || !fromNumber) {
    logMissing("OpenPhone SMS");
    return;
  }

  const toFormatted = to.startsWith("+") ? to : `+1${to.replace(/\D/g, "")}`;

  try {
    const res = await fetch("https://api.openphone.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        content: text,
        from: fromNumber,
        to: [toFormatted],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`[notifications] OpenPhone SMS failed (${res.status}): ${errBody}`);
    }
  } catch (error) {
    console.error("[notifications] Failed to send SMS", error);
  }
};

export const sendOperationalSms = async (message: string) => {
  const alertNumber = process.env.OPENPHONE_ALERT_NUMBER;
  if (!alertNumber) {
    logMissing("Operational SMS alert number");
    return;
  }
  await sendSms({ to: alertNumber, text: message });
};

export const sendEmail = async ({ to, subject, text, html, fromEmail, fromName, replyTo }: EmailPayload) => {
  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey) {
    logMissing("SendGrid");
    return;
  }

  try {
    const res = await fetch(SENDGRID_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: {
          email: fromEmail ?? defaultFromEmail,
          name: fromName ?? defaultFromName
        },
        reply_to: replyTo ? { email: replyTo } : undefined,
        subject,
        content: [
          html
            ? { type: "text/html", value: html }
            : { type: "text/plain", value: text ?? "" }
        ]
      })
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`[notifications] SendGrid email failed (${res.status}): ${errBody}`);
    }
  } catch (error) {
    console.error("[notifications] Failed to send email", error);
  }
};

export const sendSlackNotification = async (message: string) => {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    logMissing("Slack webhook");
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: message })
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`[notifications] Slack webhook failed (${res.status}): ${errBody}`);
    }
  } catch (error) {
    console.error("[notifications] Failed to post to Slack", error);
  }
};

// ── Telegram ──

type TelegramConfig = { botToken: string; chatId: string };

export const sendTelegram = async (config: TelegramConfig, message: string) => {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${config.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: config.chatId,
          text: message,
          parse_mode: "HTML",
        }),
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error(`[notifications] Telegram failed (${res.status}): ${err}`);
    }
  } catch (error) {
    console.error("[notifications] Telegram send error:", error);
  }
};

// ── WhatsApp Business Cloud API ──

type WhatsAppConfig = { accessToken: string; phoneNumberId: string };

export const sendWhatsApp = async (config: WhatsAppConfig, to: string, message: string) => {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to.replace(/[^\d+]/g, ""),
          type: "text",
          text: { body: message },
        }),
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error(`[notifications] WhatsApp failed (${res.status}): ${err}`);
    }
  } catch (error) {
    console.error("[notifications] WhatsApp send error:", error);
  }
};

// ── Gmail API ──

type GmailConfig = { serviceAccountEmail: string; privateKey: string; delegatedUser: string };

export const sendGmailAlert = async (config: GmailConfig, to: string[], subject: string, htmlBody: string) => {
  try {
    const { google } = await import("googleapis");
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: config.serviceAccountEmail,
        private_key: config.privateKey.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/gmail.send"],
      clientOptions: { subject: config.delegatedUser },
    });

    const gmail = google.gmail({ version: "v1", auth });

    const rawEmail = [
      `From: ${config.delegatedUser}`,
      `To: ${to.join(", ")}`,
      `Subject: ${subject}`,
      `Content-Type: text/html; charset=utf-8`,
      "",
      htmlBody,
    ].join("\r\n");

    const encodedMessage = Buffer.from(rawEmail).toString("base64url");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage },
    });
  } catch (error) {
    console.error("[notifications] Gmail send error:", error);
  }
};

// ── Unified Clock Alert Dispatcher ──

import { prisma } from "@/lib/prisma";

type ClockAlertPayload = {
  tenantId: string;
  cleanerName: string;
  eventType: "clock_in" | "clock_out";
  jobInfo?: string;
  timestamp: Date;
  hoursWorked?: number;
};

/**
 * Dispatch clock-in/out alerts to all enabled notification channels for a tenant.
 * Reads integration configs from the Integration table.
 * Fails gracefully per channel — one channel failing does not block others.
 */
export const dispatchClockAlert = async (payload: ClockAlertPayload) => {
  const { tenantId, cleanerName, eventType, jobInfo, timestamp, hoursWorked } = payload;
  const timeStr = timestamp.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const dateStr = timestamp.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const emoji = eventType === "clock_in" ? "🟢" : "🔴";
  const action = eventType === "clock_in" ? "clocked IN" : "clocked OUT";
  const hoursStr = hoursWorked ? ` (${hoursWorked.toFixed(1)} hrs)` : "";

  const plainMessage = `${emoji} ${cleanerName} ${action} at ${timeStr} on ${dateStr}${jobInfo ? ` — ${jobInfo}` : ""}${hoursStr}`;

  const htmlMessage = `
    <div style="font-family:system-ui,sans-serif;max-width:500px;">
      <p style="font-size:16px;margin:0 0 8px;">${emoji} <strong>${cleanerName}</strong> ${action}</p>
      <p style="color:#666;margin:0;">🕐 ${timeStr} • ${dateStr}</p>
      ${jobInfo ? `<p style="color:#666;margin:4px 0 0;">📋 ${jobInfo}</p>` : ""}
      ${hoursStr ? `<p style="color:#666;margin:4px 0 0;">⏱ ${hoursStr}</p>` : ""}
    </div>
  `;

  // Load all integrations for this tenant
  const integrations = await prisma.integration.findMany({
    where: { tenantId },
    select: { type: true, status: true, config: true },
  });

  const getConfig = (type: string) => {
    const int = integrations.find((i) => i.type === type && i.status !== "disabled");
    return int ? (int.config as Record<string, string>) : null;
  };

  const promises: Promise<void>[] = [];

  // OpenPhone SMS
  const opConfig = getConfig("OPENPHONE");
  if (opConfig?.enabled !== "false") {
    const hqNumbers = (opConfig?.hqNumbers || process.env.OPENPHONE_HQ_NUMBERS || "")
      .split(",")
      .map((n: string) => n.trim())
      .filter(Boolean);
    for (const num of hqNumbers) {
      promises.push(
        sendSms({ to: num, text: plainMessage }).catch((e) =>
          console.error("[clock-alert] SMS failed:", e)
        )
      );
    }
  }

  // Telegram
  const tgConfig = getConfig("TELEGRAM");
  if (tgConfig?.botToken && tgConfig?.chatId && tgConfig?.enabled !== "false") {
    promises.push(
      sendTelegram({ botToken: tgConfig.botToken, chatId: tgConfig.chatId }, plainMessage).catch((e) =>
        console.error("[clock-alert] Telegram failed:", e)
      )
    );
  }

  // WhatsApp
  const waConfig = getConfig("WHATSAPP");
  if (waConfig?.accessToken && waConfig?.phoneNumberId && waConfig?.enabled !== "false") {
    const recipients = (waConfig.recipientNumbers || "")
      .split(",")
      .map((n: string) => n.trim())
      .filter(Boolean);
    for (const num of recipients) {
      promises.push(
        sendWhatsApp(
          { accessToken: waConfig.accessToken, phoneNumberId: waConfig.phoneNumberId },
          num,
          plainMessage
        ).catch((e) => console.error("[clock-alert] WhatsApp failed:", e))
      );
    }
  }

  // Gmail
  const gmConfig = getConfig("GMAIL");
  if (gmConfig?.serviceAccountEmail && gmConfig?.privateKey && gmConfig?.delegatedUser && gmConfig?.enabled !== "false") {
    const recipients = (gmConfig.alertRecipients || gmConfig.delegatedUser)
      .split(",")
      .map((e: string) => e.trim())
      .filter(Boolean);
    if (recipients.length) {
      promises.push(
        sendGmailAlert(
          {
            serviceAccountEmail: gmConfig.serviceAccountEmail,
            privateKey: gmConfig.privateKey,
            delegatedUser: gmConfig.delegatedUser,
          },
          recipients,
          `${emoji} ${cleanerName} ${action}`,
          htmlMessage
        ).catch((e) => console.error("[clock-alert] Gmail failed:", e))
      );
    }
  }

  // Slack
  const slackConfig = getConfig("SLACK");
  if (slackConfig?.webhookUrl && slackConfig?.enabled !== "false") {
    promises.push(
      sendSlackNotification(plainMessage).catch((e) =>
        console.error("[clock-alert] Slack failed:", e)
      )
    );
  }

  await Promise.allSettled(promises);
  console.log(`[clock-alert] ${plainMessage} → dispatched to ${promises.length} channel(s)`);
};
