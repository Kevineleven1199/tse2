/**
 * OpenPhone Webhook Health Check — GET /api/webhooks/openphone/health
 *
 * Quick diagnostic to verify the webhook endpoint is reachable and
 * all required dependencies (AI, email, SMS) are configured.
 * No auth required — this just returns configuration status.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const aiConfigured =
    !!process.env.OPENAI_API_KEY ||
    !!process.env.ANTHROPIC_API_KEY ||
    !!process.env.OPENROUTER_API_KEY;

  const emailConfigured =
    !!process.env.SENDGRID_API_KEY || !!process.env.SMTP_HOST;

  const smsConfigured =
    !!process.env.OPENPHONE_API_KEY && !!process.env.OPENPHONE_FROM;

  // Check recent call transcript activity
  let lastTranscript: { callId: string; createdAt: Date; summary: string | null } | null = null;
  let totalTranscripts = 0;
  let todayTranscripts = 0;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    [lastTranscript, totalTranscripts, todayTranscripts] = await Promise.all([
      prisma.callTranscript.findFirst({
        orderBy: { createdAt: "desc" },
        select: { callId: true, createdAt: true, summary: true },
      }),
      prisma.callTranscript.count(),
      prisma.callTranscript.count({
        where: { createdAt: { gte: today } },
      }),
    ]);
  } catch (err) {
    // DB might not be available during build
  }

  return NextResponse.json({
    status: "ok",
    endpoint: "/api/webhooks/openphone",
    checkedAt: new Date().toISOString(),
    configuration: {
      ai: aiConfigured ? "✅ configured" : "❌ NO AI KEYS — summaries will fail",
      aiProviders: {
        openai: process.env.OPENAI_API_KEY ? "✅" : "—",
        anthropic: process.env.ANTHROPIC_API_KEY ? "✅" : "—",
        openrouter: process.env.OPENROUTER_API_KEY ? "✅" : "—",
      },
      email: emailConfigured ? "✅ configured" : "⚠️ falls back to console logging",
      emailProvider: process.env.SENDGRID_API_KEY ? "SendGrid" : process.env.SMTP_HOST ? "SMTP" : "console",
      sms: smsConfigured ? "✅ configured" : "❌ SMS alerts will not send",
      notifyEmails: process.env.CALL_NOTIFY_EMAILS || "admin@tsenow.com (default)",
      hqNumbers: process.env.OPENPHONE_HQ_NUMBERS || process.env.OPENPHONE_FROM || "NONE",
      defaultTenantId: process.env.DEFAULT_TENANT_ID || "❌ MISSING — todos/CRM will fail",
    },
    database: {
      totalTranscripts,
      todayTranscripts,
      lastTranscript: lastTranscript
        ? {
            callId: lastTranscript.callId,
            createdAt: lastTranscript.createdAt.toISOString(),
            hasSummary: !!lastTranscript.summary,
          }
        : null,
    },
    troubleshooting: [
      !aiConfigured && "Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or OPENROUTER_API_KEY",
      !smsConfigured && "Set OPENPHONE_API_KEY and OPENPHONE_FROM",
      !process.env.DEFAULT_TENANT_ID && "Set DEFAULT_TENANT_ID (e.g., ten_tse)",
      todayTranscripts === 0 && "No transcripts today — verify OpenPhone webhook URL points to this domain",
    ].filter(Boolean),
  });
}
