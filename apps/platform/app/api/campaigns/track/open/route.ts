/**
 * Email Open Tracking Pixel
 * GET /api/campaigns/track/open?rid=RECIPIENT_ID
 * Returns a 1x1 transparent GIF
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 1x1 transparent GIF
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(request: NextRequest) {
  const rid = request.nextUrl.searchParams.get("rid");
  
  if (rid) {
    try {
      const recipient = await prisma.emailCampaignRecipient.findUnique({
        where: { id: rid },
      });

      if (recipient && !recipient.openedAt) {
        await prisma.emailCampaignRecipient.update({
          where: { id: rid },
          data: { status: "opened", openedAt: new Date() },
        });

        await prisma.emailCampaign.update({
          where: { id: recipient.campaignId },
          data: { openCount: { increment: 1 } },
        });
      }
    } catch (err) {
      // Silently fail — don't break the email
    }
  }

  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
