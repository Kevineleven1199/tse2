import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const testSchema = z.object({ id: z.string() });

/**
 * POST /api/admin/webhooks/test
 * Send a test event payload to a registered webhook endpoint.
 */
export async function POST(request: Request) {
  const session = await requireSession({ roles: ["HQ"] });
  const body = await request.json();
  const { id } = testSchema.parse(body);

  const webhook = await prisma.webhookEndpoint.findFirst({
    where: { id, tenantId: session.tenantId },
  });

  if (!webhook) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  const testPayload = {
    event: "test.ping",
    timestamp: new Date().toISOString(),
    tenantId: session.tenantId,
    data: {
      message: "This is a test event from TriState platform.",
      webhookId: webhook.id,
    },
  };

  const payloadStr = JSON.stringify(testPayload);

  // Sign the payload if we have a signing secret
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "TriState-Webhooks/1.0",
  };

  if (webhook.signingSecret) {
    const signature = crypto
      .createHmac("sha256", webhook.signingSecret)
      .update(payloadStr)
      .digest("hex");
    headers["X-Webhook-Signature"] = `sha256=${signature}`;
  }

  const start = Date.now();
  let status: number | null = null;
  let error: string | null = null;

  try {
    const res = await fetch(webhook.targetUrl, {
      method: "POST",
      headers,
      body: payloadStr,
      signal: AbortSignal.timeout(10000),
    });
    status = res.status;
    if (!res.ok) {
      error = `HTTP ${res.status}`;
    }
  } catch (err: any) {
    error = err.message?.slice(0, 300) || "Delivery failed";
  }

  const latencyMs = Date.now() - start;

  // Update webhook delivery status
  await prisma.webhookEndpoint.update({
    where: { id: webhook.id },
    data: {
      lastStatus: status,
      lastError: error,
      lastDeliveredAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "webhook.tested",
      metadata: { webhookId: id, status, latencyMs, error },
    },
  });

  return NextResponse.json({
    ok: !error,
    status,
    latencyMs,
    error,
  });
}
