import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

const updateCouponSchema = z.object({
  code: z.string().min(2).max(20).toUpperCase().optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  discountValue: z.number().positive().optional(),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
  minOrderAmount: z.number().positive().optional(),
  description: z.string().optional(),
  active: z.boolean().optional(),
});

type UpdateCouponInput = z.infer<typeof updateCouponSchema>;

/**
 * GET /api/admin/coupons/[id]
 * Get a single coupon with detailed usage history
 * Required role: HQ, MANAGER
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !["HQ", "MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;

    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        usages: {
          select: {
            id: true,
            customerEmail: true,
            discountApplied: true,
            usedAt: true,
            orderId: true,
          },
          orderBy: { usedAt: "desc" },
        },
      },
    });

    if (!coupon) {
      return NextResponse.json(
        { error: "Coupon not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (coupon.tenantId !== session.tenantId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    return NextResponse.json(coupon);
  } catch (error) {
    console.error("[admin/coupons/[id]] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch coupon" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/coupons/[id]
 * Update coupon details
 * Required role: HQ only
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "HQ") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;

    // Verify ownership before updating
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      return NextResponse.json(
        { error: "Coupon not found" },
        { status: 404 }
      );
    }

    if (coupon.tenantId !== session.tenantId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = updateCouponSchema.parse(body);

    // Check if new code already exists for another coupon
    if (data.code && data.code !== coupon.code) {
      const existing = await prisma.coupon.findFirst({
        where: {
          tenantId: session.tenantId,
          code: data.code,
          id: { not: id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Coupon code already exists" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        ...(data.code && { code: data.code }),
        ...(data.discountType && { discountType: data.discountType }),
        ...(data.discountValue && { discountValue: data.discountValue }),
        ...(data.maxUses && { maxUses: data.maxUses }),
        ...(data.expiresAt && { validUntil: new Date(data.expiresAt) }),
        ...(data.minOrderAmount && { minOrderAmount: data.minOrderAmount }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.active !== undefined && { active: data.active }),
      },
      include: {
        usages: {
          select: {
            id: true,
            customerEmail: true,
            discountApplied: true,
            usedAt: true,
            orderId: true,
          },
          orderBy: { usedAt: "desc" },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid coupon data", details: error.errors },
        { status: 400 }
      );
    }
    console.error("[admin/coupons/[id]] PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update coupon" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/coupons/[id]
 * Deactivate a coupon (soft delete via active=false)
 * Required role: HQ only
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "HQ") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;

    // Verify ownership before deleting
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      return NextResponse.json(
        { error: "Coupon not found" },
        { status: 404 }
      );
    }

    if (coupon.tenantId !== session.tenantId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Soft delete: set active to false
    const deactivated = await prisma.coupon.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({
      success: true,
      message: "Coupon has been deactivated",
      coupon: deactivated,
    });
  } catch (error) {
    console.error("[admin/coupons/[id]] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to deactivate coupon" },
      { status: 500 }
    );
  }
}
