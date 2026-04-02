import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
    const { id } = await params;
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const viewer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { tenantId: true, role: true }
    });

    if (!viewer || !["HQ", "MANAGER"].includes(viewer.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: id }
    });

    if (!campaign || campaign.tenantId !== viewer.tenantId) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Return HTML preview with wrapper
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${campaign.subject}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto; margin: 0; padding: 20px; background: #f5f5f5; }
          .preview-wrapper { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
          .preview-header { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
          .preview-subject { font-size: 24px; font-weight: bold; color: #333; }
          .preview-meta { font-size: 12px; color: #999; margin-top: 8px; }
          .preview-content { line-height: 1.6; color: #333; }
        </style>
      </head>
      <body>
        <div class="preview-wrapper">
          <div class="preview-header">
            <div class="preview-subject">${campaign.subject}</div>
            <div class="preview-meta">
              Campaign: ${campaign.name} | Recipients: ${campaign.totalRecipients}
            </div>
          </div>
          <div class="preview-content">
            ${campaign.htmlContent}
          </div>
        </div>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  } catch (err) {
    console.error("GET /api/admin/campaigns/[id]/preview error:", err);
    return NextResponse.json(
      { error: "Failed to fetch preview" },
      { status: 500 }
    );
  }
};
