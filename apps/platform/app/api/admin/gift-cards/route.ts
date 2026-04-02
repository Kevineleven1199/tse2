import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { getTenantGiftCards, getGiftCardStats, purchaseGiftCard } from "@/src/lib/gift-cards";

export const dynamic = "force-dynamic";

const createGiftCardSchema = z.object({
  initialBalance: z.number().positive(),
  purchaserEmail: z.string().email(),
  purchaserName: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().optional(),
  message: z.string().max(500).optional(),
  expiresAt: z.string().datetime().optional()
});

export const GET = async (request: Request) => {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const viewer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { tenantId: true, role: true }
    });

    if (!viewer || !["HQ", "MANAGER"].includes(viewer.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [giftCards, stats] = await Promise.all([
      getTenantGiftCards(viewer.tenantId),
      getGiftCardStats(viewer.tenantId)
    ]);

    return NextResponse.json({
      giftCards,
      stats
    });
  } catch (err) {
    console.error("GET /api/admin/gift-cards error:", err);
    return NextResponse.json(
      { error: "Failed to fetch gift cards" },
      { status: 500 }
    );
  }
};

export const POST = async (request: Request) => {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const viewer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { tenantId: true, role: true }
    });

    if (!viewer || !["HQ", "MANAGER"].includes(viewer.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validated = createGiftCardSchema.parse(body);

    const giftCard = await purchaseGiftCard({
      tenantId: viewer.tenantId,
      ...validated,
      expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : undefined
    });

    return NextResponse.json(
      {
        success: true,
        message: "Gift card created successfully",
        giftCard
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("POST /api/admin/gift-cards error:", err);
    return NextResponse.json(
      { error: "Failed to create gift card" },
      { status: 500 }
    );
  }
};
