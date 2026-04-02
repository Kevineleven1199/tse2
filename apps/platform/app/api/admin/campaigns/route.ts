/**
 * Campaign List API
 * GET  /api/admin/campaigns  → List all campaigns with filters & stats
 * POST /api/admin/campaigns  → Create new campaign
 */
export const dynamic = "force-dynamic";

import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HQ"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { tenantId: session.tenantId };
    if (status && ["DRAFT", "SCHEDULED", "SENDING", "SENT", "FAILED"].includes(status)) {
      where.status = status;
    }

    // Get campaigns with pagination
    const [campaigns, total] = await Promise.all([
      prisma.emailCampaign.findMany({
        where,
        select: {
          id: true,
          name: true,
          subject: true,
          status: true,
          audienceType: true,
          totalRecipients: true,
          openCount: true,
          clickCount: true,
          sentAt: true,
          scheduledAt: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.emailCampaign.count({ where }),
    ]);

    // Get stats
    const [sentCount, draftCount, scheduledCount] = await Promise.all([
      prisma.emailCampaign.count({
        where: { ...where, status: "SENT" },
      }),
      prisma.emailCampaign.count({
        where: { ...where, status: "DRAFT" },
      }),
      prisma.emailCampaign.count({
        where: { ...where, status: "SCHEDULED" },
      }),
    ]);

    return NextResponse.json({
      campaigns,
      pagination: {
        total,
        limit,
        page,
        pages: Math.ceil(total / limit),
      },
      stats: {
        totalCampaigns: total,
        sent: sentCount,
        drafts: draftCount,
        scheduled: scheduledCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HQ"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, subject, htmlContent, audienceType, audienceFilter } = body;

    if (!name || !subject) {
      return NextResponse.json(
        { error: "Missing required fields: name, subject" },
        { status: 400 }
      );
    }

    const campaign = await prisma.emailCampaign.create({
      data: {
        tenantId: session.tenantId,
        name,
        subject,
        htmlContent: htmlContent || "",
        audienceType: audienceType || "all_customers",
        audienceFilter: audienceFilter || null,
        status: "DRAFT",
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
