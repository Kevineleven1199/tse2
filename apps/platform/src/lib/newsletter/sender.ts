/**
 * Newsletter Email Sender
 * Provider-agnostic email sending
 *
 * Supports:
 * - Resend (RESEND_API_KEY)
 * - SMTP via Nodemailer (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
 * - Console logging (fallback for dev/preview)
 *
 * Set EMAIL_PROVIDER env var to "resend", "smtp", or "console"
 */

import { type GeneratedNewsletter } from "./generator";

export type SendResult = {
  success: boolean;
  provider: string;
  recipientCount: number;
  error?: string;
};

const FROM_NAME = "Tri State Enterprise";
const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || "info@tsenow.com";
const REPLY_TO = "info@tsenow.com";

/**
 * Auto-detect the best available email provider
 */
const detectProvider = (): string => {
  // Explicit override always wins
  if (process.env.EMAIL_PROVIDER) return process.env.EMAIL_PROVIDER;
  // Auto-detect based on available credentials
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SENDGRID_API_KEY) return "sendgrid";
  if (process.env.SMTP_HOST) return "smtp";
  return "console";
};

/**
 * Send newsletter to a list of subscribers
 */
export const sendNewsletter = async (
  newsletter: GeneratedNewsletter,
  subscribers: string[]
): Promise<SendResult> => {
  const provider = detectProvider();

  if (subscribers.length === 0) {
    return { success: true, provider, recipientCount: 0 };
  }

  try {
    switch (provider) {
      case "resend":
        return await sendViaResend(newsletter, subscribers);
      case "sendgrid":
        return await sendViaSendGrid(newsletter, subscribers);
      case "smtp":
        return await sendViaSMTP(newsletter, subscribers);
      default:
        return sendViaConsole(newsletter, subscribers);
    }
  } catch (error) {
    console.error("[newsletter] Send failed:", error);
    return {
      success: false,
      provider,
      recipientCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Send via SendGrid API
 */
const sendViaSendGrid = async (
  newsletter: GeneratedNewsletter,
  subscribers: string[]
): Promise<SendResult> => {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error("SENDGRID_API_KEY not configured");

  let sent = 0;
  for (const email of subscribers) {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        reply_to: { email: REPLY_TO },
        subject: newsletter.subject,
        content: [
          { type: "text/plain", value: newsletter.text },
          { type: "text/html", value: newsletter.html.replace("{{EMAIL}}", encodeURIComponent(email)) },
        ],
      }),
    });
    if (!res.ok && res.status !== 202) {
      const err = await res.text();
      throw new Error(`SendGrid error: ${res.status} ${err}`);
    }
    sent++;
  }

  return { success: true, provider: "sendgrid", recipientCount: sent };
};

/**
 * Send via Resend API
 */
const sendViaResend = async (
  newsletter: GeneratedNewsletter,
  subscribers: string[]
): Promise<SendResult> => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }

  // Resend supports batch sending
  const batchSize = 50;
  let sent = 0;

  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);

    const response = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        batch.map((email) => ({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: email,
          reply_to: REPLY_TO,
          subject: newsletter.subject,
          html: newsletter.html.replace("{{EMAIL}}", encodeURIComponent(email)),
          text: newsletter.text,
        }))
      ),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Resend API error: ${response.status} ${err}`);
    }

    sent += batch.length;
  }

  return { success: true, provider: "resend", recipientCount: sent };
};

/**
 * Send via SMTP (Nodemailer)
 */
const sendViaSMTP = async (
  newsletter: GeneratedNewsletter,
  subscribers: string[]
): Promise<SendResult> => {
  // Dynamic import to avoid bundling nodemailer when not needed
  const nodemailer = await import("nodemailer");

  // Match email-failsafe.ts auth config exactly
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "",
    },
  });

  let sent = 0;
  for (const email of subscribers) {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: email,
      replyTo: REPLY_TO,
      subject: newsletter.subject,
      html: newsletter.html.replace("{{EMAIL}}", encodeURIComponent(email)),
      text: newsletter.text,
    });
    sent++;
  }

  return { success: true, provider: "smtp", recipientCount: sent };
};

/**
 * Console fallback (development/preview)
 */
const sendViaConsole = (
  newsletter: GeneratedNewsletter,
  subscribers: string[]
): SendResult => {
  console.log("========================================");
  console.log("[newsletter] CONSOLE MODE — Email Preview");
  console.log(`Subject: ${newsletter.subject}`);
  console.log(`Preview: ${newsletter.preview}`);
  console.log(`Recipients: ${subscribers.length}`);
  console.log(`Source: ${newsletter.source}`);
  console.log("========================================");
  return { success: true, provider: "console", recipientCount: subscribers.length };
};
