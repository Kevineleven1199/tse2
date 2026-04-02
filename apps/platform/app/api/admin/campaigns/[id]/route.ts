/**
 * Single Campaign API
 * GET  /api/admin/campaigns/[id]  → Get campaign with recipients
 * PUT  /api/admin/campaigns/[id]  → Update campaign
 * DELETE /api/admin/campaigns/[id] → Delete draft campaign
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      include: {
        recipients: {
          orderBy: { sentAt: "desc" },
        },
      },
    });

    if (!campaign || campaign.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !["HQ"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!campaign || campaign.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.emailCampaign.update({
      where: { id },
      data: {
        name: body.name,
        subject: body.subject,
        htmlContent: body.htmlContent,
        audienceType: body.audienceType,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !["HQ"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!campaign || campaign.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (campaign.status !== "DRAFT") {
      return NextResponse.json({ error: "Can only delete draft campaigns" }, { status: 400 });
    }

    await prisma.emailCampaignRecipient.deleteMany({ where: { campaignId: id } });
    await prisma.emailCampaign.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
