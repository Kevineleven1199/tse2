import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const SUPPORTED_EVENTS = [
  "lead.created",
  "quote.created",
  "quote.approved",
  "job.created",
  "job.assigned",
  "job.completed",
  "job.cancelled",
  "invoice.created",
  "invoice.sent",
  "invoice.paid",
  "payment.captured",
  "payment.failed",
  "timesheet.approved",
  "payroll.processed",
  "customer.created",
  "cleaner.onboarded",
] as const;

const createWebhookSchema = z.object({
  label: z.string().min(1).max(100),
  targetUrl: z.string().url(),
  events: z.array(z.string()).min(1),
  enabled: z.boolean().optional().default(true),
});

const updateWebhookSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  targetUrl: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  enabled: z.boolean().optional(),
});

/**
 * GET /api/admin/webhooks
 * List outbound webhook endpoints for this tenant.
 */
export async function GET() {
  const session = await requireSession({ roles: ["HQ"] });

  const webhooks = await prisma.webhookEndpoint.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    webhooks,
    supportedEvents: SUPPORTED_EVENTS,
  });
}

/**
 * POST /api/admin/webhooks
 * Create a new outbound webhook endpoint.
 * Auto-generates a signing secret.
 */
export async function POST(request: Request) {
  const session = await requireSession({ roles: ["HQ"] });
  const body = await request.json();
  const data = createWebhookSchema.parse(body);

  // Generate signing secret
  const signingSecret = `whsec_${crypto.randomBytes(24).toString("hex")}`;

  const webhook = await prisma.webhookEndpoint.create({
    data: {
      tenantId: session.tenantId,
      label: data.label,
      targetUrl: data.targetUrl,
      events: data.events,
      enabled: data.enabled,
      signingSecret,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "webhook.created",
      metadata: { webhookId: webhook.id, label: data.label, events: data.events },
    },
  });

  // Return signing secret ONLY on creation — never again
  return NextResponse.json({
    ...webhook,
    signingSecret, // visible once
    _notice: "Save this signing secret now. It will not be shown again.",
  }, { status: 201 });
}

/**
 * PATCH /api/admin/webhooks?id=xxx
 */
export async function PATCH(request: Request) {
  const session = await requireSession({ roles: ["HQ"] });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await prisma.webhookEndpoint.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const data = updateWebhookSchema.parse(body);

  const updated = await prisma.webhookEndpoint.update({
    where: { id },
    data: {
      ...(data.label !== undefined ? { label: data.label } : {}),
      ...(data.targetUrl !== undefined ? { targetUrl: data.targetUrl } : {}),
      ...(data.events !== undefined ? { events: data.events } : {}),
      ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "webhook.updated",
      metadata: { webhookId: id, changes: Object.keys(data) },
    },
  });

  return NextResponse.json({
    ...updated,
    signingSecret: updated.signingSecret ? "whsec_••••••••" : null,
  });
}

/**
 * DELETE /api/admin/webhooks?id=xxx
 */
export async function DELETE(request: Request) {
  const session = await requireSession({ roles: ["HQ"] });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await prisma.webhookEndpoint.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.webhookEndpoint.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "webhook.deleted",
      metadata: { webhookId: id, label: existing.label },
    },
  });

  return NextResponse.json({ success: true });
}
