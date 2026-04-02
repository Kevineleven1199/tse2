/**
 * Email Click Tracking
 * GET /api/campaigns/track/click?rid=RECIPIENT_ID&url=REDIRECT_URL
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rid = request.nextUrl.searchParams.get("rid");
  const url = request.nextUrl.searchParams.get("url") || "https://tseorganic.com";

  if (rid) {
    try {
      const recipient = await prisma.emailCampaignRecipient.findUnique({
        where: { id: rid },
      });

      if (recipient && !recipient.clickedAt) {
        await prisma.emailCampaignRecipient.update({
          where: { id: rid },
          data: { status: "clicked", clickedAt: new Date() },
        });

        await prisma.emailCampaign.update({
          where: { id: recipient.campaignId },
          data: { clickCount: { increment: 1 } },
        });
      }
    } catch (err) {
      // Silently fail
    }
  }

  return NextResponse.redirect(url);
}
