/**
 * CRM Leads API — CRUD for sales leads with lifecycle management
 * GET  /api/crm/leads         → List leads with filters
 * POST /api/crm/leads         → Create or update a lead
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { updateLeadScoring } from "@/src/lib/crm/lead-scoring";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Auth check — HQ or MANAGER
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const stage = searchParams.get("stage");
    const temperature = searchParams.get("temperature");
    const priority = searchParams.get("priority");
    const assignedTo = searchParams.get("assignedTo");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "score";
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = { tenantId: session.tenantId };
    if (status) where.status = status;
    if (stage) where.lifecycleStage = stage;
    if (temperature) where.leadTemperature = temperature;
    if (priority) where.priority = parseInt(priority);
    if (assignedTo) where.assignedTo = assignedTo;
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
        { contactPhone: { contains: search } },
        { industry: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }

    const orderBy: any = {};
    if (sortBy === "score") orderBy.score = "desc";
    else if (sortBy === "priority") orderBy.priority = "asc";
    else if (sortBy === "nextFollowUp") orderBy.nextFollowUpAt = "asc";
    else if (sortBy === "lastContacted") orderBy.lastContactedAt = "desc";
    else orderBy.createdAt = "desc";

    const leads = await prisma.crmLead.findMany({
      where,
      orderBy,
      take: limit,
    });

    const baseWhere = { tenantId: session.tenantId };
    const stats = {
      total: await prisma.crmLead.count({ where: baseWhere }),
      new: await prisma.crmLead.count({ where: { ...baseWhere, status: "new" } }),
      contacted: await prisma.crmLead.count({ where: { ...baseWhere, status: "contacted" } }),
      qualified: await prisma.crmLead.count({ where: { ...baseWhere, status: "qualified" } }),
      won: await prisma.crmLead.count({ where: { ...baseWhere, status: "won" } }),
      lost: await prisma.crmLead.count({ where: { ...baseWhere, status: "lost" } }),
      hotLeads: await prisma.crmLead.count({ where: { ...baseWhere, leadTemperature: "hot" } }),
    };

    return NextResponse.json({ leads, stats });
  } catch (error: any) {
    console.error("[crm-leads] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Auth check — HQ or MANAGER
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...data } = body;

    if (id) {
      // Update existing lead
      const updated = await prisma.crmLead.update({
        where: { id },
        data: {
          businessName: data.businessName,
          contactName: data.contactName,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          address: data.address,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          website: data.website,
          industry: data.industry,
          sqft: data.sqft,
          source: data.source,
          status: data.status,
          priority: data.priority,
          score: data.score,
          notes: data.notes,
          tags: data.tags,
          assignedTo: data.assignedTo,
          aiInsights: data.aiInsights,
          metadata: data.metadata,
          lifecycleStage: data.lifecycleStage,
          communicationPreference: data.communicationPreference,
          updatedAt: new Date(),
        },
      });

      // Trigger scoring update
      await updateLeadScoring(id, session.tenantId);

      return NextResponse.json({ lead: updated });
    }

    // Create new lead
    const lead = await prisma.crmLead.create({
      data: {
        tenantId: session.tenantId,
        businessName: data.businessName,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        address: data.address,
        city: data.city || "Austin",
        state: data.state || "TX",
        postalCode: data.postalCode,
        website: data.website,
        industry: data.industry,
        sqft: data.sqft,
        source: data.source || "ai_discovery",
        status: data.status || "new",
        priority: data.priority || 3,
        score: data.score || 0,
        notes: data.notes,
        tags: data.tags || [],
        assignedTo: data.assignedTo,
        aiInsights: data.aiInsights,
        metadata: data.metadata,
        lifecycleStage: data.lifecycleStage || "COLD_LEAD",
        leadTemperature: data.leadTemperature || "cold",
        communicationPreference: data.communicationPreference || "email",
      },
    });

    // Trigger initial scoring
    await updateLeadScoring(lead.id, session.tenantId);

    return NextResponse.json({ lead });
  } catch (error: any) {
    console.error("[crm-leads] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
