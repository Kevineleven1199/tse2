import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const validateCouponSchema = z.object({
  code: z.string().min(1),
  orderAmount: z.number().positive(),
  tenantId: z.string().optional(),
});

type ValidateCouponInput = z.infer<typeof validateCouponSchema>;

interface CouponValidationSuccess {
  valid: true;
  discount: number;
  finalAmount: number;
  coupon: {
    code: string;
    discountType: "PERCENTAGE" | "FIXED";
    discountValue: number;
  };
}

interface CouponValidationError {
  valid: false;
  error: string;
}

type CouponValidationResult = CouponValidationSuccess | CouponValidationError;

/**
 * POST /api/coupons/validate
 * Validate a coupon code during checkout
 * No authentication required (public endpoint for customers)
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<CouponValidationResult>> {
  try {
    const body = await request.json();
    const { code, orderAmount, tenantId } = validateCouponSchema.parse(body);

    // Find coupon by code
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        ...(tenantId && { tenantId }),
      },
    });

    // Coupon not found
    if (!coupon) {
      return NextResponse.json(
        {
          valid: false,
          error: "Coupon code not found",
        },
        { status: 400 }
      );
    }

    // Check if coupon is active
    if (!coupon.active) {
      return NextResponse.json(
        {
          valid: false,
          error: "Coupon code is no longer active",
        },
        { status: 400 }
      );
    }

    // Check if coupon has expired
    if (coupon.validUntil && coupon.validUntil < new Date()) {
      return NextResponse.json(
        {
          valid: false,
          error: "Coupon code has expired",
        },
        { status: 400 }
      );
    }

    // Check if coupon has reached max uses
    if (coupon.maxUses && coupon.maxUses > 0) {
      const usedCount = await prisma.couponUsage.count({
        where: { couponId: coupon.id },
      });

      if (usedCount >= coupon.maxUses) {
        return NextResponse.json(
          {
            valid: false,
            error: "Coupon code has reached maximum uses",
          },
          { status: 400 }
        );
      }
    }

    // Check minimum order amount
    if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
      return NextResponse.json(
        {
          valid: false,
          error: `Minimum order amount of ${coupon.minOrderAmount.toFixed(2)} required`,
        },
        { status: 400 }
      );
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = (orderAmount * coupon.discountValue) / 100;
    } else if (coupon.discountType === "FIXED") {
      discountAmount = coupon.discountValue;
    }

    // Ensure discount doesn't exceed order amount
    discountAmount = Math.min(discountAmount, orderAmount);

    const finalAmount = orderAmount - discountAmount;

    return NextResponse.json({
      valid: true,
      discount: discountAmount,
      finalAmount,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          valid: false,
          error: "Invalid request data",
        },
        { status: 400 }
      );
    }
    console.error("[coupons/validate] POST error:", error);
    return NextResponse.json(
      {
        valid: false,
        error: "Failed to validate coupon",
      },
      { status: 500 }
    );
  }
}
