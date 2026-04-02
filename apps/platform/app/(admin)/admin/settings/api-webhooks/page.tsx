import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ApiWebhooksClient } from "./api-webhooks-client";

export const dynamic = "force-dynamic";

export default async function ApiWebhooksPage() {
  const session = await requireSession({ roles: ["HQ"], redirectTo: "/login" });

  // Fetch integrations, webhooks, recent audit, and storage stats in parallel
  const [integrations, webhooks, recentAudit, driveStats] = await Promise.all([
    prisma.integration.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { type: "asc" },
    }),
    prisma.webhookEndpoint.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({
      where: {
        tenantId: session.tenantId,
        action: { startsWith: "integration." },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    // Drive storage health stats
    Promise.all([
      prisma.jobPhoto.count({
        where: { tenantId: session.tenantId, driveFileId: { not: null } },
      }),
      prisma.jobPhoto.count({
        where: {
          tenantId: session.tenantId,
          driveFileId: null,
          imageData: { not: null },
        },
      }),
      prisma.estimatePhoto.count({
        where: { tenantId: session.tenantId },
      }),
      prisma.jobPhoto.count({ where: { tenantId: session.tenantId } }),
    ]),
  ]);

  const [photosInDrive, photosInDb, estimatePhotosInDb, totalPhotos] = driveStats;

  // Mask secrets before passing to client — recursive to catch nested objects
  const SECRET_PATTERN = /key|secret|token|password|private/i;

  function maskObj(obj: Record<string, any>): Record<string, any> {
    const masked: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (SECRET_PATTERN.test(k) && typeof v === "string" && v.length > 0) {
        masked[k] = v.length > 8 ? `${"•".repeat(8)}${v.slice(-4)}` : "••••••••";
      } else if (v && typeof v === "object" && !Array.isArray(v)) {
        masked[k] = maskObj(v);
      } else {
        masked[k] = v;
      }
    }
    return masked;
  }

  const maskedIntegrations = integrations.map((i) => {
    const rawConfig = (i.config as Record<string, any>) ?? {};
    return {
      id: i.id,
      type: i.type,
      status: i.status,
      config: maskObj(rawConfig),
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    };
  });

  // Mask webhook signing secrets
  const maskedWebhooks = webhooks.map((w) => ({
    ...w,
    signingSecret: w.signingSecret ? "whsec_••••••••" : null,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
    lastDeliveredAt: w.lastDeliveredAt?.toISOString() ?? null,
  }));

  // Check env vars for providers that still primarily use them
  const envStatus: Record<string, boolean> = {
    OPENAI: !!process.env.OPENAI_API_KEY,
    OPENPHONE: !!process.env.OPENPHONE_API_KEY,
    SENDGRID: !!process.env.SENDGRID_API_KEY,
    STRIPE: !!process.env.STRIPE_SECRET_KEY,
    GOOGLE_DRIVE: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    GOOGLE_CALENDAR: !!(process.env.GOOGLE_CALENDAR_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT),
    JOBBER: !!process.env.JOBBER_CLIENT_ID,
  };

  return (
    <ApiWebhooksClient
      integrations={maskedIntegrations}
      webhooks={maskedWebhooks}
      recentAudit={recentAudit.map((a) => ({
        id: a.id,
        action: a.action,
        actorId: a.actorId,
        metadata: a.metadata as Record<string, unknown>,
        createdAt: a.createdAt.toISOString(),
      }))}
      envStatus={envStatus}
      storageStats={{
        photosInDrive,
        photosInDb,
        estimatePhotosInDb,
        totalPhotos,
      }}
    />
  );
}
