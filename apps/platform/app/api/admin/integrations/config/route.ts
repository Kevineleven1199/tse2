import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import { IntegrationType } from "@prisma/client";

export const dynamic = "force-dynamic";

// Fields that contain secrets — masked on read, write-only on update
const SECRET_FIELD_PATTERN = /key|secret|token|password|private/i;

function maskSecrets(config: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (SECRET_FIELD_PATTERN.test(key) && typeof value === "string" && value.length > 0) {
      masked[key] = value.length > 8
        ? `${"•".repeat(8)}${value.slice(-4)}`
        : "••••••••";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      // Recurse into nested objects
      masked[key] = maskSecrets(value as Record<string, unknown>);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

const configSchema = z.object({
  type: z.nativeEnum(IntegrationType),
  config: z.record(z.unknown()),
});

/**
 * GET /api/admin/integrations/config
 * List all integrations for the tenant with secrets masked.
 */
export async function GET() {
  const session = await requireSession({ roles: ["HQ"] });

  const integrations = await prisma.integration.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { type: "asc" },
  });

  return NextResponse.json({
    integrations: integrations.map((i) => ({
      id: i.id,
      type: i.type,
      status: i.status,
      config: maskSecrets((i.config as Record<string, unknown>) ?? {}),
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    })),
  });
}

/**
 * POST /api/admin/integrations/config
 * Create or update integration config for a provider type.
 * Empty string secret values = keep existing value.
 * Never returns raw secrets.
 */
export async function POST(request: Request) {
  const session = await requireSession({ roles: ["HQ"] });
  const body = await request.json();
  const { type, config: incomingConfig } = configSchema.parse(body);

  const existing = await prisma.integration.findUnique({
    where: { tenantId_type: { tenantId: session.tenantId, type } },
  });

  // Merge incoming on top of existing config.
  // Empty string secret fields = keep existing value.
  // Absent keys = keep existing value (prevents accidental config wipe).
  const existingConfig = existing
    ? ((existing.config as Record<string, unknown>) ?? {})
    : {};
  const incoming = incomingConfig as Record<string, unknown>;
  const mergedConfig: Record<string, unknown> = { ...existingConfig };

  for (const [key, value] of Object.entries(incoming)) {
    if (SECRET_FIELD_PATTERN.test(key) && value === "") {
      // Keep existing secret — do not overwrite
      continue;
    }
    mergedConfig[key] = value;
  }

  // Determine status
  const enabled = mergedConfig.enabled !== false;
  const status = enabled ? "configured_unverified" : "disabled";

  const integration = await prisma.integration.upsert({
    where: { tenantId_type: { tenantId: session.tenantId, type } },
    create: {
      tenantId: session.tenantId,
      type,
      status,
      config: mergedConfig as any,
    },
    update: {
      status,
      config: mergedConfig as any,
    },
  });

  // Audit log
  const changedKeys = Object.keys(incomingConfig as Record<string, unknown>).filter(
    (k) => {
      const val = (incomingConfig as Record<string, unknown>)[k];
      return !(SECRET_FIELD_PATTERN.test(k) && val === "");
    }
  );

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "integration.configured",
      metadata: {
        type,
        keysChanged: changedKeys,
        status,
      },
    },
  });

  return NextResponse.json({
    id: integration.id,
    type: integration.type,
    status: integration.status,
    config: maskSecrets((integration.config as Record<string, unknown>) ?? {}),
  });
}

/**
 * DELETE /api/admin/integrations/config
 * Remove an integration config.
 */
export async function DELETE(request: Request) {
  const session = await requireSession({ roles: ["HQ"] });
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as IntegrationType | null;

  if (!type) {
    return NextResponse.json({ error: "type is required" }, { status: 400 });
  }

  const existing = await prisma.integration.findUnique({
    where: { tenantId_type: { tenantId: session.tenantId, type } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.integration.delete({ where: { id: existing.id } });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "integration.removed",
      metadata: { type },
    },
  });

  return NextResponse.json({ success: true });
}
