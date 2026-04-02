import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

const createCouponSchema = z.object({
  code: z.string().min(2).max(20).toUpperCase(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().positive(),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
  minOrderAmount: z.number().positive().optional(),
  description: z.string().optional(),
});

type CreateCouponInput = z.infer<typeof createCouponSchema>;

/**
 * GET /api/admin/coupons
 * Fetch all coupons with usage stats
 * Required role: HQ, MANAGER
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !["HQ", "MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    const searchFilter = search
      ? {
          code: {
            contains: search,
            mode: "insensitive" as Prisma.QueryMode,
          },
        }
      : {};

    const coupons = await prisma.coupon.findMany({
      where: {
        tenantId: session.tenantId,
        ...searchFilter,
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
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const total = await prisma.coupon.count({
      where: {
        tenantId: session.tenantId,
        ...searchFilter,
      },
    });

    // Add usage stats to each coupon
    const couponsWithStats = coupons.map((coupon) => ({
      ...coupon,
      totalUsageCount: coupon.usages.length,
      totalDiscountApplied: coupon.usages.reduce(
        (sum, usage) => sum + usage.discountApplied,
        0
      ),
    }));

    return NextResponse.json({
      coupons: couponsWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[admin/coupons] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch coupons" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/coupons
 * Create a new coupon
 * Required role: HQ only
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "HQ") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = createCouponSchema.parse(body);

    // Check if coupon code already exists for this tenant
    const existing = await prisma.coupon.findFirst({
      where: { tenantId: session.tenantId, code: data.code },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Coupon code already exists" },
        { status: 400 }
      );
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxUses: data.maxUses ?? null,
        tenantId: session.tenantId,
        validUntil: data.expiresAt ? new Date(data.expiresAt) : null,
        minOrderAmount: data.minOrderAmount ?? null,
        description: data.description ?? null,
        active: true,
      },
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid coupon data", details: error.errors },
        { status: 400 }
      );
    }
    console.error("[admin/coupons] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create coupon" },
      { status: 500 }
    );
  }
}
