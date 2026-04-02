import { NextResponse } from "next/server";
import { z } from "zod";
import { checkGiftCardBalance } from "@/src/lib/gift-cards";

export const dynamic = "force-dynamic";

const checkSchema = z.object({
  code: z.string().min(5)
});

export const POST = async (request: Request) => {
  try {
    const body = await request.json();
    const validated = checkSchema.parse(body);

    const balance = await checkGiftCardBalance(validated.code);

    if (!balance) {
      return NextResponse.json(
        { error: "Gift card not found or expired" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...balance
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("POST /api/gift-cards/check error:", err);
    return NextResponse.json(
      { error: "Failed to check balance" },
      { status: 500 }
    );
  }
};
