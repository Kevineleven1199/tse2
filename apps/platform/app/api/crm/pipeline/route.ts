/**
 * CRM Pipeline API — Lead lifecycle management
 * GET  /api/crm/pipeline         → Returns all leads grouped by lifecycle stage with counts
 * PATCH /api/crm/pipeline         → Move a lead to a different stage (with audit trail)
 * POST  /api/crm/pipeline         → Create new lead with auto-scoring
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { moveLeadToStage, createLeadWithScoring } from "@/src/lib/crm/pipeline";
import type { CustomerLifecycleStage } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Auth check
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage");
    const temperature = searchParams.get("temperature");
    const sortBy = searchParams.get("sortBy") || "score";
    const limit = parseInt(searchParams.get("limit") || "100");

    const where: any = { tenantId: session.tenantId };
    if (stage) where.lifecycleStage = stage;
    if (temperature) where.leadTemperature = temperature;

    const orderBy: any = {};
    if (sortBy === "score") orderBy.score = "desc";
    else if (sortBy === "daysInStage") orderBy.updatedAt = "asc";
    else if (sortBy === "followUp") orderBy.nextFollowUpAt = "asc";
    else orderBy.createdAt = "desc";

    const leads = await prisma.crmLead.findMany({
      where,
      select: {
        id: true,
        businessName: true,
        contactName: true,
        contactPhone: true,
        contactEmail: true,
        score: true,
        leadTemperature: true,
        lifecycleStage: true,
        lastContactedAt: true,
        nextFollowUpAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy,
      take: limit,
    });

    // Group by stage and count
    const stages = [
      "COLD_LEAD",
      "WARM_LEAD",
      "PROSPECT",
      "FIRST_TIME_CUSTOMER",
      "REPEAT_CUSTOMER",
      "LOYAL_CUSTOMER",
      "REFERRER",
      "CHAMPION",
    ] as const;

    const stageCounts: Record<string, number> = {};
    for (const s of stages) {
      const count = await prisma.crmLead.count({
        where: { tenantId: session.tenantId, lifecycleStage: s },
      });
      stageCounts[s] = count;
    }

    return NextResponse.json({
      leads,
      stageCounts,
      total: leads.length,
    });
  } catch (error) {
    console.error("[pipeline-get]", error);
    return NextResponse.json(
      { error: "Failed to fetch pipeline" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    // Auth check
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { leadId, stage } = body;

    if (!leadId || !stage) {
      return NextResponse.json(
        { error: "Missing leadId or stage" },
        { status: 400 }
      );
    }

    // Verify lead belongs to tenant
    const lead = await prisma.crmLead.findFirst({
      where: { id: leadId, tenantId: session.tenantId },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Move lead
    const oldStage = lead.lifecycleStage;
    const success = await moveLeadToStage(leadId, stage as CustomerLifecycleStage, session.tenantId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to move lead" },
        { status: 500 }
      );
    }

    // Log audit trail
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: session.tenantId,
          actorId: session.userId,
          action: "LEAD_MOVED_STAGE",
          metadata: { resourceId: leadId, resourceType: "CrmLead", before: { stage: oldStage }, after: { stage } },
        },
      });
    } catch (auditError) {
      console.warn("[pipeline-audit] Failed to log move:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: `Lead moved from ${oldStage} to ${stage}`,
    });
  } catch (error) {
    console.error("[pipeline-patch]", error);
    return NextResponse.json(
      { error: "Failed to move lead" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Auth check
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      businessName,
      contactName,
      contactEmail,
      contactPhone,
      address,
      city,
      state,
      postalCode,
      website,
      industry,
      sqft,
      source,
      referralSource,
    } = body;

    if (!businessName) {
      return NextResponse.json(
        { error: "businessName is required" },
        { status: 400 }
      );
    }

    // Create lead with scoring
    const lead = await createLeadWithScoring(
      {
        businessName,
        contactName,
        contactEmail,
        contactPhone,
        address,
        city,
        state,
        postalCode,
        website,
        industry,
        sqft,
        source,
        referralSource,
      },
      session.tenantId
    );

    // Log audit trail
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: session.tenantId,
          actorId: session.userId,
          action: "LEAD_CREATED",
          metadata: {
            resourceId: lead.id,
            resourceType: "CrmLead",
            businessName: lead.businessName,
            score: lead.score,
            stage: lead.lifecycleStage,
          },
        },
      });
    } catch (auditError) {
      console.warn("[pipeline-audit] Failed to log create:", auditError);
    }

    return NextResponse.json({
      success: true,
      lead,
      message: "Lead created with auto-scoring",
    });
  } catch (error) {
    console.error("[pipeline-post]", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}
