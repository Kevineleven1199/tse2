import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/gift-cards/purchase
 *
 * DISABLED: Public gift card purchase is disabled because this endpoint
 * creates stored-value gift cards without collecting payment. Re-enabling
 * this requires integrating Stripe payment capture into the purchase flow.
 *
 * To issue gift cards, use the admin route: POST /api/admin/gift-cards
 * (requires HQ session — for comp cards, promotions, etc.)
 */
export const POST = async () => {
  return NextResponse.json(
    {
      error: "Gift card purchase is temporarily unavailable. Please contact us directly.",
    },
    { status: 503 }
  );
};
