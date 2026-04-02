import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Tracks review request clicks and redirects to Google review page
 * URL format: /api/review-click?id={reviewRequestId}
 */
export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reviewRequestId = searchParams.get("id");

    if (!reviewRequestId) {
      return NextResponse.json(
        { error: "Missing review request ID" },
        { status: 400 }
      );
    }

    const reviewRequest = await prisma.reviewRequest.findUnique({
      where: { id: reviewRequestId },
    });

    if (!reviewRequest) {
      return NextResponse.json(
        { error: "Review request not found" },
        { status: 404 }
      );
    }

    // Mark as clicked
    await prisma.reviewRequest.update({
      where: { id: reviewRequestId },
      data: { status: "CLICKED", clickedAt: new Date() },
    });

    // Redirect to review page
    const redirectUrl = reviewRequest.reviewUrl || "https://g.page/r/tse/review";
    return NextResponse.redirect(redirectUrl, { status: 302 });
  } catch (err) {
    console.error("[review-click] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
