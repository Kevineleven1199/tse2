import { NextResponse } from "next/server";
import { z } from "zod";
import { redeemGiftCard } from "@/src/lib/gift-cards";

export const dynamic = "force-dynamic";

const redeemSchema = z.object({
  code: z.string().min(5),
  amount: z.number().positive(),
  orderId: z.string().optional()
});

export const POST = async (request: Request) => {
  try {
    const body = await request.json();
    const validated = redeemSchema.parse(body);

    const result = await redeemGiftCard(validated);

    return NextResponse.json({
      message: "Gift card redeemed successfully",
      ...result
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Failed to redeem gift card";
    console.error("POST /api/gift-cards/redeem error:", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
};
