import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export type OpenPhoneMessagePayload = {
  to: string;
  body: string;
  metadata?: Record<string, unknown>;
};

/**
 * Send an SMS via OpenPhone API v1.
 * Docs: https://www.openphone.com/docs/api-reference/messages/send-a-text-message
 *
 * Required body fields:
 *   content  – message text (1-1600 chars)
 *   from     – E.164 sender number OR phoneNumberId (PN-prefixed)
 *   to       – array with exactly one E.164 recipient
 */
export const sendOpenPhoneMessage = async (payload: OpenPhoneMessagePayload) => {
  if (!process.env.OPENPHONE_API_KEY) {
    console.warn("[openphone] API key missing. Skipping message.");
    return { status: "skipped" } as const;
  }

  const fromNumber = process.env.OPENPHONE_DEFAULT_NUMBER;
  if (!fromNumber) {
    console.warn("[openphone] OPENPHONE_DEFAULT_NUMBER missing. Skipping message.");
    return { status: "skipped" } as const;
  }

  const toFormatted = payload.to.startsWith("+") ? payload.to : `+1${payload.to.replace(/\D/g, "")}`;

  const response = await fetch("https://api.openphone.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.OPENPHONE_API_KEY,
    },
    body: JSON.stringify({
      content: payload.body,
      from: fromNumber,
      to: [toFormatted],
    }),
  }).catch((error) => {
    console.error("[openphone] Failed to send SMS", error);
    return null;
  });

  if (response && !response.ok) {
    const errText = await response.text().catch(() => "unknown");
    console.error(`[openphone] SMS send failed (${response.status}): ${errText}`);
    return { status: "failed" } as const;
  }

  return { status: "queued" } as const;
};

/**
 * Verify OpenPhone webhook signature.
 * Signature header format: hmac;1;<timestamp>;<digest>
 */
export const verifyOpenPhoneWebhook = (
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string
): boolean => {
  try {
    const parts = signatureHeader.split(";");
    if (parts.length !== 4 || parts[0] !== "hmac") return false;

    const timestamp = parts[2];
    const receivedDigest = parts[3];

    // Replay protection: reject events older than 5 minutes
    const eventTime = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (isNaN(eventTime) || Math.abs(now - eventTime) > 300) return false;

    const signedPayload = `${timestamp}.${rawBody}`;
    const expectedDigest = crypto
      .createHmac("sha256", webhookSecret)
      .update(signedPayload)
      .digest("base64");

    return crypto.timingSafeEqual(
      Buffer.from(receivedDigest, "base64"),
      Buffer.from(expectedDigest, "base64")
    );
  } catch {
    return false;
  }
};

const toJsonValue = (value: Record<string, unknown>): Prisma.InputJsonValue => {
  const seen = new WeakSet();

  try {
    const serialised = JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === "bigint") {
          return val.toString();
        }

        if (typeof val === "object" && val !== null) {
          if (seen.has(val)) {
            return undefined;
          }

          seen.add(val);
        }

        return val;
      },
      2
    );

    return serialised ? (JSON.parse(serialised) as Prisma.InputJsonValue) : {};
  } catch (error) {
    console.error("Failed to serialise OpenPhone notification payload", error);
    return {};
  }
};

export const logNotification = async (
  tenantId: string,
  jobId: string | null,
  payload: Record<string, unknown>
) => {
  return prisma.notification.create({
    data: {
      tenantId,
      jobId,
      channel: "openphone_sms",
      payload: toJsonValue(payload),
      delivered: false,
    },
  });
};

export const markNotificationDelivered = async (notification: { id: string }) => {
  return prisma.notification.update({
    where: { id: notification.id },
    data: { delivered: true },
  });
};
