/**
 * Campaign Tracking Pixel API
 * GET /api/admin/campaigns/[id]/track → Track opens and clicks
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Return a 1x1 transparent GIF
const transparentGif = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const rid = searchParams.get("rid");
    const action = searchParams.get("action") || "open";

    if (!rid) {
      // Return GIF even without rid to avoid suspicion
      return new Response(transparentGif, {
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    }

    // Find recipient
    const recipient = await prisma.emailCampaignRecipient.findUnique({
      where: { id: rid },
      include: { campaign: true },
    });

    if (!recipient) {
      // Return GIF silently for missing recipients
      return new Response(transparentGif, {
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      });
    }

    // Verify campaign ID matches
    if (recipient.campaignId !== id) {
      return new Response(transparentGif, {
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      });
    }

    // Update recipient based on action
    const now = new Date();
    if (action === "click") {
      await prisma.emailCampaignRecipient.update({
        where: { id: rid },
        data: {
          clickedAt: recipient.clickedAt || now,
          status: "clicked",
        },
      });

      // Increment campaign click count
      await prisma.emailCampaign.update({
        where: { id },
        data: {
          clickCount: {
            increment: 1,
          },
        },
      });
    } else {
      // Track open
      await prisma.emailCampaignRecipient.update({
        where: { id: rid },
        data: {
          openedAt: recipient.openedAt || now,
          status: recipient.status === "clicked" ? "clicked" : "opened",
        },
      });

      // Increment campaign open count (only if not already opened)
      if (!recipient.openedAt) {
        await prisma.emailCampaign.update({
          where: { id },
          data: {
            openCount: {
              increment: 1,
            },
          },
        });
      }
    }

    // Return transparent GIF
    return new Response(transparentGif, {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("[campaign-track] Error:", error);
    // Return GIF silently on error
    return new Response(transparentGif, {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  }
}
