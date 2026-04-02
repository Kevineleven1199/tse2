/**
 * Email Unsubscribe Handler
 * GET /api/campaigns/unsubscribe?rid=RECIPIENT_ID
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rid = request.nextUrl.searchParams.get("rid");

  if (rid) {
    try {
      const recipient = await prisma.emailCampaignRecipient.findUnique({
        where: { id: rid },
        include: { campaign: true },
      });

      if (recipient) {
        await prisma.emailCampaignRecipient.update({
          where: { id: rid },
          data: { status: "unsubscribed" },
        });

        // Tag the lead as unsubscribed
        await prisma.crmLead.updateMany({
          where: { contactEmail: recipient.email, tenantId: recipient.campaign.tenantId },
          data: { tags: { push: "unsubscribed" } },
        });
      }
    } catch (err) {
      console.error("[unsubscribe] Error:", err);
    }
  }

  // Return a simple HTML page
  const html = `<!DOCTYPE html><html><head><title>Unsubscribed</title><style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f9fafb;margin:0;}.card{background:white;border-radius:12px;padding:40px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:400px;}h1{color:#059669;font-size:24px;}p{color:#6b7280;}</style></head><body><div class="card"><h1>Unsubscribed</h1><p>You've been removed from our mailing list. You won't receive any more emails from Tri State Enterprise.</p></div></body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
