import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, requestId } = body;

    if (!sessionId || !requestId) {
      return NextResponse.json(
        { error: "sessionId and requestId required" },
        { status: 400 }
      );
    }

    // Update all EstimatePhoto records matching the sessionId to set the requestId
    const result = await prisma.estimatePhoto.updateMany({
      where: { sessionId },
      data: { requestId },
    });

    return NextResponse.json({
      success: true,
      updated: result.count,
    });
  } catch (error) {
    console.error("Estimate photo link error:", error);
    return NextResponse.json(
      { error: "Failed to link photos" },
      { status: 500 }
    );
  }
}
