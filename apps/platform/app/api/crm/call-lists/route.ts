/**
 * AI-Powered Commercial Call Lists
 *
 * GET  /api/crm/call-lists           → Get today's AI-generated call list
 * POST /api/crm/call-lists/generate  → Generate new call list using AI
 * POST /api/crm/call-lists/log       → Log a call outcome
 *
 * PhoneBurner-style intelligent call list that:
 * 1. Discovers commercial businesses in the Flatwoods area
 * 2. Scores them by fit (sqft, industry, location)
 * 3. Prioritizes follow-ups and fresh leads
 * 4. Tracks call outcomes and reschedules
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ─── GET: Today's call list ───
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "smart"; // smart, followups, new, all
    const limit = parseInt(searchParams.get("limit") || "25");

    let leads: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (mode === "followups") {
      // Leads that need follow-up today or overdue
      leads = await prisma.crmLead.findMany({
        where: {
          status: { in: ["contacted", "qualified", "proposal_sent", "negotiating"] },
          nextFollowUpAt: { lte: new Date() },
        },
        orderBy: [{ priority: "asc" }, { nextFollowUpAt: "asc" }],
        take: limit,
      });
    } else if (mode === "new") {
      // Fresh leads never contacted
      leads = await prisma.crmLead.findMany({
        where: { status: "new", callCount: 0 },
        orderBy: [{ score: "desc" }, { priority: "asc" }],
        take: limit,
      });
    } else {
      // Smart mode: AI-prioritized mix
      // 1. Overdue follow-ups (hot first)
      const overdueFollowups: any[] = await prisma.crmLead.findMany({
        where: {
          status: { in: ["contacted", "qualified", "proposal_sent"] },
          nextFollowUpAt: { lte: new Date() },
        },
        orderBy: [{ priority: "asc" }, { score: "desc" }],
        take: Math.floor(limit * 0.4),
      });

      // 2. Hot untouched leads
      const hotNew: any[] = await prisma.crmLead.findMany({
        where: {
          status: "new",
          priority: { in: [1, 2] },
          id: { notIn: overdueFollowups.map((l) => l.id) },
        },
        orderBy: [{ score: "desc" }],
        take: Math.floor(limit * 0.3),
      });

      // 3. Cold leads to work through
      const existingIds = [...overdueFollowups, ...hotNew].map((l: any) => l.id);
      const coldLeads: any[] = await prisma.crmLead.findMany({
        where: {
          status: { in: ["new", "contacted"] },
          id: { notIn: existingIds },
        },
        orderBy: [{ score: "desc" }, { callCount: "asc" }],
        take: limit - overdueFollowups.length - hotNew.length,
      });

      leads = [...overdueFollowups, ...hotNew, ...coldLeads];
    }

    // Add call list metadata + personalize scripts with owner names
    const callList = leads.map((lead, index) => ({
      ...lead,
      position: index + 1,
      callAction: getCallAction(lead),
      suggestedScript: getSuggestedScript(lead),
      emailEngagement: lead.tags?.includes("emailed") ? "emailed" : "not_emailed",
    }));

    const stats = {
      totalInList: callList.length,
      followUpsOverdue: await prisma.crmLead.count({
        where: { nextFollowUpAt: { lte: new Date() }, status: { notIn: ["won", "lost"] } },
      }),
      callsMadeToday: await prisma.crmLead.count({
        where: {
          lastContactedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      hotLeads: await prisma.crmLead.count({ where: { priority: 1, status: { notIn: ["won", "lost"] } } }),
    };

    return NextResponse.json({ callList, stats });
  } catch (error: any) {
    console.error("[call-lists] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST: Log call outcome or generate list ───
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "log_call") {
      return handleLogCall(body);
    } else if (action === "generate") {
      return handleGenerateList(body);
    } else if (action === "skip") {
      return handleSkipLead(body);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[call-lists] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── Call logging ───
async function handleLogCall(body: any) {
  const { leadId, outcome, notes, nextFollowUpDays } = body;
  // outcome: "answered", "voicemail", "no_answer", "busy", "wrong_number", "interested", "not_interested", "appointment_set"

  const updateData: any = {
    callCount: { increment: 1 },
    lastContactedAt: new Date(),
    updatedAt: new Date(),
  };

  if (notes) {
    const lead = await prisma.crmLead.findUnique({ where: { id: leadId } });
    const existingNotes = lead?.notes || "";
    const timestamp = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    updateData.notes = `${existingNotes}\n[${timestamp}] Call: ${outcome} — ${notes}`.trim();
  }

  // Status transitions based on outcome
  if (outcome === "interested" || outcome === "appointment_set") {
    updateData.status = "qualified";
    updateData.priority = 1;
  } else if (outcome === "not_interested") {
    updateData.status = "lost";
  } else if (outcome === "wrong_number") {
    updateData.status = "lost";
    updateData.tags = { push: "bad_number" };
  } else if (["answered", "voicemail"].includes(outcome)) {
    updateData.status = "contacted";
  }

  // Set next follow-up
  if (nextFollowUpDays && outcome !== "not_interested" && outcome !== "wrong_number") {
    const followUp = new Date();
    followUp.setDate(followUp.getDate() + nextFollowUpDays);
    updateData.nextFollowUpAt = followUp;
  } else if (outcome === "voicemail") {
    const followUp = new Date();
    followUp.setDate(followUp.getDate() + 2); // Follow up in 2 days
    updateData.nextFollowUpAt = followUp;
  } else if (outcome === "no_answer") {
    const followUp = new Date();
    followUp.setDate(followUp.getDate() + 1); // Try again tomorrow
    updateData.nextFollowUpAt = followUp;
  }

  const updated = await prisma.crmLead.update({
    where: { id: leadId },
    data: updateData,
  });

  return NextResponse.json({ lead: updated, outcome });
}

// ─── AI list generation ───
async function handleGenerateList(body: any) {
  const { industries, city, radius } = body;

  // Generate commercial leads using AI search
  const targetIndustries = industries || [
    "condo_association", "hoa_community", "assisted_living", "senior_care",
    "restaurant", "qsr_fast_food", "medical_office", "dental_office",
    "law_firm", "real_estate_office", "gym", "yoga_studio", "salon",
    "hotel", "airbnb", "vacation_rental", "property_management",
    "retail_store", "daycare", "church", "veterinary",
    "auto_dealership", "coworking_space", "office_building",
  ];

  const targetCity = city || "Flatwoods";

  // Use AI to generate prospect list
  const prompt = `Generate a JSON array of 20 commercial businesses in ${targetCity}, KY area that would benefit from professional professional services services. Focus on these industries: ${targetIndustries.join(", ")}.

For each business, provide:
- businessName: string (realistic business name)
- industry: string (one of the target industries)
- estimatedSqft: number (realistic for the business type)
- address: string (realistic Flatwoods area address)
- city: string
- state: "FL"
- postalCode: string (Flatwoods area: 34231-34243)
- phone: string (941 area code)
- website: string (realistic URL)
- score: number (1-100, how good a fit for professional services)
- reasoning: string (why this type of business is a good prospect)

Return ONLY the JSON array, no other text.`;

  try {
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
              { role: "system", content: "You are a sales intelligence AI. Return only valid JSON arrays." },
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
          console.log(`[call-lists] Generated ${prospects.length} prospects via ${provider.name}`);
          break;
        }
      } catch {
        continue;
      }
    }

    if (prospects.length === 0) {
      return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
    }

    // Deduplicate against existing leads
    const existingPhones = new Set(
      (await prisma.crmLead.findMany({ select: { contactPhone: true } }))
        .map((l: any) => l.contactPhone?.replace(/\D/g, ""))
        .filter(Boolean)
    );

    const newLeads = [];
    for (const p of prospects) {
      const phone = p.phone?.replace(/\D/g, "");
      if (phone && existingPhones.has(phone)) continue;

      const lead = await prisma.crmLead.create({
        data: {
          tenantId: "default",
          businessName: p.businessName,
          contactPhone: p.phone,
          address: p.address,
          city: p.city || targetCity,
          state: p.state || "FL",
          postalCode: p.postalCode,
          website: p.website,
          industry: p.industry,
          sqft: p.estimatedSqft,
          source: "ai_discovery",
          score: p.score || 50,
          priority: p.score >= 80 ? 1 : p.score >= 60 ? 2 : 3,
          aiInsights: p.reasoning,
          tags: [p.industry, "ai_generated"],
        },
      });
      newLeads.push(lead);
    }

    return NextResponse.json({
      generated: prospects.length,
      added: newLeads.length,
      duplicatesSkipped: prospects.length - newLeads.length,
    });
  } catch (error: any) {
    console.error("[call-lists] Generate error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleSkipLead(body: any) {
  const { leadId, reason } = body;
  const followUp = new Date();
  followUp.setDate(followUp.getDate() + 7); // Skip for a week

  await prisma.crmLead.update({
    where: { id: leadId },
    data: {
      nextFollowUpAt: followUp,
      notes: { set: `Skipped: ${reason || "no reason"}` },
    },
  });

  return NextResponse.json({ success: true });
}

// ─── Helpers ───
function getCallAction(lead: any): string {
  if (lead.status === "new" && lead.callCount === 0) return "FIRST CALL";
  if (lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) <= new Date()) return "FOLLOW UP";
  if (lead.status === "qualified") return "CLOSE";
  if (lead.status === "proposal_sent") return "CHECK IN";
  return "CALL";
}

function getSuggestedScript(lead: any): string {
  const name = lead.contactName || lead.metadata?.ownerName || "the owner/manager";
  const title = lead.metadata?.ownerTitle || "manager";
  const biz = lead.businessName;
  const industry = lead.industry?.replace(/_/g, " ") || "business";

  if (lead.callCount === 0) {
    return `Hi, this is [Your Name] from Tri State Enterprise. I'm reaching out to ${industry} businesses in the ${lead.city || "Flatwoods"} area. We provide 100% organic, professional commercial cleaning services. Is ${name} available to chat for 2 minutes about how we could help ${biz} with a healthier, greener clean?`;
  }

  if (lead.status === "contacted") {
    return `Hi ${name}, this is [Your Name] from Tri State Enterprise following up on our conversation. I wanted to see if you had any questions about our organic commercial cleaning for ${biz}? We'd love to schedule a free walkthrough and estimate.`;
  }

  if (lead.status === "qualified" || lead.status === "proposal_sent") {
    return `Hi ${name}, checking in on the proposal we sent for ${biz}. Our schedule is filling up for the month — would you like to lock in your preferred day and time? We can start as soon as this week.`;
  }

  return `Hi, this is [Your Name] from Tri State Enterprise calling about commercial cleaning services for ${biz}. Do you have a moment?`;
}
