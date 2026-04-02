/**
 * Commercial Prospect Discovery API
 * 
 * GET  /api/crm/prospects  → Get ranked commercial prospects
 * POST /api/crm/prospects  → Generate new prospects with AI + owner contacts
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import {
  COMMERCIAL_INDUSTRIES,
  calculateProspectScore,
  estimateMonthlyRevenue,
  buildProspectGenerationPrompt,
  getProspectTier,
} from "@/src/lib/commercial-prospects";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const industry = searchParams.get("industry");
    const tier = searchParams.get("tier");
    const sortBy = searchParams.get("sortBy") || "score";
    const limit = parseInt(searchParams.get("limit") || "50");
    const hasEmail = searchParams.get("hasEmail");

    const where: any = { tenantId: session.tenantId };
    
    if (industry) where.industry = industry;
    if (hasEmail === "true") where.contactEmail = { not: null };
    
    // Tier filtering based on score ranges
    if (tier === "A") where.score = { gte: 85 };
    else if (tier === "B") where.score = { gte: 70, lt: 85 };
    else if (tier === "C") where.score = { gte: 50, lt: 70 };
    else if (tier === "D") where.score = { lt: 50 };

    const orderBy: any = {};
    if (sortBy === "score") orderBy.score = "desc";
    else if (sortBy === "revenue") orderBy.sqft = "desc";
    else if (sortBy === "priority") orderBy.priority = "asc";
    else orderBy.createdAt = "desc";

    const leads = await prisma.crmLead.findMany({
      where,
      orderBy,
      take: limit,
    });

    // Enrich with revenue estimates and tier info
    const enrichedLeads = leads.map((lead) => {
      const revenue = estimateMonthlyRevenue(lead.industry || "", lead.sqft);
      const tierInfo = getProspectTier(lead.score);
      return {
        ...lead,
        estimatedRevenue: revenue,
        tier: tierInfo,
      };
    });

    // Stats by industry
    const industryStats = await prisma.crmLead.groupBy({
      by: ["industry"],
      where: { tenantId: session.tenantId, status: { notIn: ["lost"] } },
      _count: true,
      _avg: { score: true },
    });

    // Stats by tier
    const tierStats = {
      A: await prisma.crmLead.count({ where: { tenantId: session.tenantId, score: { gte: 85 }, status: { notIn: ["lost"] } } }),
      B: await prisma.crmLead.count({ where: { tenantId: session.tenantId, score: { gte: 70, lt: 85 }, status: { notIn: ["lost"] } } }),
      C: await prisma.crmLead.count({ where: { tenantId: session.tenantId, score: { gte: 50, lt: 70 }, status: { notIn: ["lost"] } } }),
      D: await prisma.crmLead.count({ where: { tenantId: session.tenantId, score: { lt: 50 }, status: { notIn: ["lost"] } } }),
    };

    const totalEstRevenue = enrichedLeads.reduce((sum, l) => sum + (l.estimatedRevenue.low + l.estimatedRevenue.high) / 2, 0);

    return NextResponse.json({
      prospects: enrichedLeads,
      stats: {
        total: leads.length,
        tierStats,
        industryStats,
        totalEstimatedMonthlyRevenue: Math.round(totalEstRevenue),
        industries: COMMERCIAL_INDUSTRIES,
      },
    });
  } catch (error: any) {
    console.error("[prospects] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { industries, city, count } = body;

    const targetIndustries = industries?.length > 0
      ? industries
      : ["condo_association", "medical_office", "dental_office", "daycare", "veterinary", "office_building", "gym", "law_firm"];

    const prompt = buildProspectGenerationPrompt({
      industries: targetIndustries,
      city: city || "Flatwoods",
      count: count || 25,
    });

    // Try AI providers
    const aiProviders = [
      {
        url: "https://openrouter.ai/api/v1/chat/completions",
        key: process.env.OPENROUTER_API_KEY,
        model: "google/gemini-2.0-flash-001",
        name: "OpenRouter",
      },
      {
        url: "https://api.openai.com/v1/chat/completions",
        key: process.env.OPENAI_API_KEY,
        model: "gpt-4o-mini",
        name: "OpenAI",
      },
    ];

    let prospects: any[] = [];

    for (const provider of aiProviders) {
      if (!provider.key) continue;
      try {
        const res = await fetch(provider.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${provider.key}`,
          },
          body: JSON.stringify({
            model: provider.model,
            temperature: 0.8,
            messages: [
              { role: "system", content: "You are a commercial real estate and business intelligence AI. Return only valid JSON arrays with realistic business data." },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (!res.ok) continue;
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          prospects = JSON.parse(jsonMatch[0]);
          console.log(`[prospects] Generated ${prospects.length} prospects via ${provider.name}`);
          break;
        }
      } catch {
        continue;
      }
    }

    if (prospects.length === 0) {
      return NextResponse.json({ error: "AI generation failed. Check API keys." }, { status: 500 });
    }

    // Dedup against existing leads by phone or business name
    const existingLeads = await prisma.crmLead.findMany({
      where: { tenantId: session.tenantId },
      select: { contactPhone: true, businessName: true },
    });
    const existingPhones = new Set(existingLeads.map(l => l.contactPhone?.replace(/\D/g, "")).filter(Boolean));
    const existingNames = new Set(existingLeads.map(l => l.businessName.toLowerCase()));

    const newLeads = [];
    for (const p of prospects) {
      const phone = p.contactPhone?.replace(/\D/g, "");
      const nameLower = p.businessName?.toLowerCase();
      if ((phone && existingPhones.has(phone)) || (nameLower && existingNames.has(nameLower))) continue;

      const score = calculateProspectScore({
        industry: p.industry,
        sqft: p.estimatedSqft,
        employeeCount: p.estimatedEmployees,
      });

      const lead = await prisma.crmLead.create({
        data: {
          tenantId: session.tenantId,
          businessName: p.businessName,
          contactName: p.ownerName || null,
          contactEmail: p.contactEmail || null,
          contactPhone: p.contactPhone || null,
          address: p.address || null,
          city: p.city || city || "Flatwoods",
          state: p.state || "FL",
          postalCode: p.postalCode || null,
          website: p.website || null,
          industry: p.industry,
          sqft: p.estimatedSqft || null,
          source: "ai_discovery",
          score,
          priority: score >= 85 ? 1 : score >= 70 ? 2 : 3,
          aiInsights: p.reasoning || null,
          tags: [p.industry, "commercial", "ai_generated", ...(p.hasMultipleLocations ? ["multi_location"] : [])],
          metadata: {
            ownerTitle: p.ownerTitle,
            estimatedEmployees: p.estimatedEmployees,
            hasMultipleLocations: p.hasMultipleLocations,
            bestTimeToCall: p.bestTimeToCall,
            decisionMakerRole: p.decisionMakerRole,
          },
        },
      });
      newLeads.push(lead);
    }

    return NextResponse.json({
      generated: prospects.length,
      added: newLeads.length,
      duplicatesSkipped: prospects.length - newLeads.length,
      topProspects: newLeads.slice(0, 5).map(l => ({
        name: l.businessName,
        score: l.score,
        industry: l.industry,
      })),
    });
  } catch (error: any) {
    console.error("[prospects] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
