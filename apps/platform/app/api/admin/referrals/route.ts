import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: List all referrals with stats
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !["HQ", "MANAGER"].includes(session.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where: any = { tenantId: session.tenantId };
  if (status) where.status = status;

  const [referrals, stats] = await Promise.all([
    prisma.referral.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.referral.groupBy({
      by: ["status"],
      where: { tenantId: session.tenantId },
      _count: true,
    }),
  ]);

  const totalRewards = await prisma.referral.aggregate({
    where: { tenantId: session.tenantId, status: "REWARDED" },
    _sum: { rewardAmount: true },
    _count: true,
  });

  return NextResponse.json({
    referrals,
    stats: {
      byStatus: Object.fromEntries(stats.map((s) => [s.status, s._count])),
      totalRewarded: totalRewards._count,
      totalRewardsPaid: totalRewards._sum.rewardAmount || 0,
    },
  });
}

// POST: Create a new referral (generate code)
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !["HQ", "MANAGER"].includes(session.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { referrerName, referrerEmail, referrerPhone, rewardAmount, referreeDiscount } = body;

    if (!referrerName || !referrerEmail) {
      return NextResponse.json({ error: "referrerName and referrerEmail required" }, { status: 400 });
    }

    // Generate unique referral code
    const code = `GG-${referrerName.split(" ")[0].toUpperCase().slice(0, 4)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const referral = await prisma.referral.create({
      data: {
        tenantId: session.tenantId,
        referrerName,
        referrerEmail,
        referrerPhone: referrerPhone || null,
        referralCode: code,
        rewardAmount: rewardAmount || 25.0,
        referreeDiscount: referreeDiscount || 15.0,
      },
    });

    return NextResponse.json({ success: true, referral });
  } catch (error) {
    console.error("[referrals] Create failed:", error);
    return NextResponse.json({ error: "Failed to create referral" }, { status: 500 });
  }
}
