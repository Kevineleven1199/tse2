import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    if (!code) {
      return NextResponse.json({ valid: false, message: "Referral code required" }, { status: 400 });
    }

    const referral = await prisma.referral.findUnique({
      where: { referralCode: code.toUpperCase().trim() },
    });

    if (!referral) {
      return NextResponse.json({ valid: false, message: "Invalid referral code" });
    }

    return NextResponse.json({
      valid: true,
      referrerName: referral.referrerName,
      discount: referral.referreeDiscount ?? 25,
      message: `Referred by ${referral.referrerName ?? "a friend"} — $${referral.referreeDiscount ?? 25} off your first clean!`,
    });
  } catch (error) {
    console.error("[referral-validate] GET error:", error);
    return NextResponse.json({ valid: false, message: "Could not validate code" });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { code, referreeName, referreeEmail, referreePhone } = await request.json();

    if (!code) {
      return NextResponse.json({ error: "Referral code required" }, { status: 400 });
    }

    const referral = await prisma.referral.findUnique({
      where: { referralCode: code.toUpperCase().trim() },
    });

    if (!referral) {
      return NextResponse.json({ valid: false, error: "Invalid referral code" }, { status: 404 });
    }

    if (referral.status !== "PENDING") {
      return NextResponse.json({ valid: false, error: "This referral code has already been used" }, { status: 400 });
    }

    // Update with referee info
    if (referreeName || referreeEmail || referreePhone) {
      await prisma.referral.update({
        where: { id: referral.id },
        data: {
          referreeName: referreeName || referral.referreeName,
          referreeEmail: referreeEmail || referral.referreeEmail,
          referreePhone: referreePhone || referral.referreePhone,
        },
      });
    }

    return NextResponse.json({
      valid: true,
      referrerName: referral.referrerName,
      discount: referral.referreeDiscount,
      message: `${referral.referreeDiscount}% off your first cleaning — referred by ${referral.referrerName}!`,
    });
  } catch (error) {
    console.error("[referral-validate] Error:", error);
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
