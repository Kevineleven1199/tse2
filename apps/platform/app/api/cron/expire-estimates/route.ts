import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/expire-estimates
 * Auto-expire draft estimates older than 30 days that haven't been confirmed.
 * Also expires estimates with explicit expiresAt dates that have passed.
 * Creates follow-up todo for admin to re-engage.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const now = new Date();
    const cutoff30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const expired = await prisma.draftEstimate.findMany({
      where: {
        status: { in: ["draft", "sent"] },
        OR: [
          { expiresAt: { lt: now } },           // Explicit expiry date passed
          { expiresAt: null, createdAt: { lt: cutoff30d } }, // No explicit expiry, 30 days old
        ],
      },
    });

    let expiredCount = 0;
    for (const draft of expired) {
      await prisma.draftEstimate.update({
        where: { id: draft.id },
        data: { status: "expired" },
      });

      // Create follow-up todo
      await prisma.todoItem.create({
        data: {
          tenantId: draft.tenantId,
          userId: "system",
          title: `[EXPIRED] Estimate for ${draft.customerName} — follow up?`,
          description: `${draft.serviceType?.replace(/_/g, " ") || "Cleaning"} estimate of ${draft.estimatedCost ? `$${draft.estimatedCost.toFixed(0)}` : "custom"} expired after 30 days without confirmation.\n\nPhone: ${draft.customerPhone}\n\nConsider calling to re-engage.`,
          priority: 2,
          isShared: true,
          category: "follow_up",
          relatedId: draft.id,
          relatedType: "draft_estimate",
        },
      });

      expiredCount++;
    }

    return NextResponse.json({ ok: true, expired: expiredCount });
  } catch (error) {
    console.error("[expire-estimates] Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
