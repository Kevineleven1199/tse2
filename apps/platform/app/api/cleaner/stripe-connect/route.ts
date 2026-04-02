import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-08-16",
});

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  "https://web-production-cfe11.up.railway.app";

/**
 * GET /api/cleaner/stripe-connect
 * Check whether the current cleaner has a connected Stripe account.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "CLEANER" && session.role !== "HQ") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const profile = await prisma.cleanerProfile.findUnique({
      where: { userId: session.userId },
      select: { stripeAccountId: true },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Cleaner profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      connected: Boolean(profile.stripeAccountId),
      stripeAccountId: profile.stripeAccountId ?? null,
    });
  } catch (err) {
    console.error("[stripe-connect] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cleaner/stripe-connect
 * Create (or re-link) a Stripe Connect Express account for the cleaner
 * and return an onboarding URL.
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "CLEANER" && session.role !== "HQ") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const profile = await prisma.cleanerProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true, stripeAccountId: true },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Cleaner profile not found" },
        { status: 404 }
      );
    }

    let stripeAccountId = profile.stripeAccountId;

    // Create a new Express connected account if one doesn't exist yet
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: session.email ?? undefined,
        metadata: {
          cleanerProfileId: profile.id,
          userId: session.userId,
        },
      });

      stripeAccountId = account.id;

      await prisma.cleanerProfile.update({
        where: { id: profile.id },
        data: { stripeAccountId },
      });
    }

    // Generate an onboarding link (works for both new and returning accounts)
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${BASE_URL}/cleaner/settings?stripe=refresh`,
      return_url: `${BASE_URL}/cleaner/settings?stripe=success`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    console.error("[stripe-connect] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
