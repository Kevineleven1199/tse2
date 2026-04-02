import { prisma } from "@/lib/prisma";
import type { CustomerLifecycleStage } from "@prisma/client";
import type { SessionPayload } from "@/src/lib/auth/token";

export type PipelineCard = {
  id: string;
  businessName: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  score: number;
  leadTemperature: string;
  lifecycleStage: CustomerLifecycleStage;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  daysInStage: number;
};

export type PipelineColumn = {
  stage: CustomerLifecycleStage;
  title: string;
  subtitle: string;
  count: number;
  cards: PipelineCard[];
  color: string;
  bgColor: string;
};

const STAGE_DEFINITIONS: Record<CustomerLifecycleStage, { title: string; subtitle: string }> = {
  COLD_LEAD: {
    title: "Cold Leads",
    subtitle: "New prospects, cold calls, scraped leads",
  },
  WARM_LEAD: {
    title: "Warm Leads",
    subtitle: "Showed interest, requested info",
  },
  PROSPECT: {
    title: "Quoted",
    subtitle: "Got a quote, waiting for decision",
  },
  FIRST_TIME_CUSTOMER: {
    title: "First Booking",
    subtitle: "Booked their first clean",
  },
  REPEAT_CUSTOMER: {
    title: "Active Customer",
    subtitle: "Recurring customer",
  },
  LOYAL_CUSTOMER: {
    title: "Loyal/VIP",
    subtitle: "10+ bookings or 6+ months",
  },
  REFERRER: {
    title: "Referrer",
    subtitle: "Has referred others",
  },
  CHAMPION: {
    title: "Champion",
    subtitle: "Referred 3+ people, left reviews, top tier",
  },
};

const STAGES: CustomerLifecycleStage[] = [
  "COLD_LEAD",
  "WARM_LEAD",
  "PROSPECT",
  "FIRST_TIME_CUSTOMER",
  "REPEAT_CUSTOMER",
  "LOYAL_CUSTOMER",
  "REFERRER",
  "CHAMPION",
];

function calculateDaysInStage(createdAt: Date, updatedAt: Date): number {
  const now = new Date();
  const lastChange = updatedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) ? updatedAt : createdAt;
  const days = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

export async function getPipelineBoardData(session: SessionPayload): Promise<{ columns: PipelineColumn[] }> {
  // Fetch all leads grouped by lifecycle stage
  const leads = await prisma.crmLead.findMany({
    where: { tenantId: session.tenantId },
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
    orderBy: [{ score: "desc" }, { nextFollowUpAt: "asc" }],
  });

  // Group leads by stage
  const leadsByStage = new Map<CustomerLifecycleStage, PipelineCard[]>();
  STAGES.forEach((stage) => {
    leadsByStage.set(stage, []);
  });

  leads.forEach((lead) => {
    const card: PipelineCard = {
      id: lead.id,
      businessName: lead.businessName,
      contactName: lead.contactName,
      contactPhone: lead.contactPhone,
      contactEmail: lead.contactEmail,
      score: lead.score,
      leadTemperature: lead.leadTemperature,
      lifecycleStage: lead.lifecycleStage,
      lastContactedAt: lead.lastContactedAt?.toISOString() ?? null,
      nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? null,
      daysInStage: calculateDaysInStage(lead.createdAt, lead.updatedAt),
    };

    const stage = leadsByStage.get(lead.lifecycleStage);
    if (stage) {
      stage.push(card);
    }
  });

  // Create columns
  const columns: PipelineColumn[] = STAGES.map((stage) => {
    const cards = leadsByStage.get(stage) || [];
    const definition = STAGE_DEFINITIONS[stage];

    return {
      stage,
      title: definition.title,
      subtitle: definition.subtitle,
      count: cards.length,
      cards,
      color: "", // Set by frontend
      bgColor: "", // Set by frontend
    };
  });

  return { columns };
}

export async function moveLeadToStage(
  leadId: string,
  stage: CustomerLifecycleStage,
  tenantId: string
): Promise<boolean> {
  try {
    await prisma.crmLead.update({
      where: { id: leadId },
      data: {
        lifecycleStage: stage,
        updatedAt: new Date(),
      },
    });
    return true;
  } catch (error) {
    console.error("Failed to move lead:", error);
    return false;
  }
}

export async function createLeadWithScoring(
  data: {
    businessName: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    website?: string;
    industry?: string;
    sqft?: number;
    source?: string;
    referralSource?: string;
  },
  tenantId: string
): Promise<any> {
  // Calculate initial lead score
  const score = calculateLeadScore(data);

  const lead = await prisma.crmLead.create({
    data: {
      tenantId,
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
      source: data.source || "manual",
      referralSource: data.referralSource,
      score,
      lifecycleStage: "COLD_LEAD",
      leadTemperature: "cold",
    },
  });

  return lead;
}

function calculateLeadScore(data: any): number {
  let score = 0;

  // Base score
  score += 20;

  // Property size
  if (data.sqft) {
    if (data.sqft >= 5000) score += 20;
    else if (data.sqft >= 2000) score += 15;
    else if (data.sqft >= 1000) score += 10;
    else score += 5;
  }

  // Location signal
  if (data.city) score += 10;
  if (data.state) score += 5;

  // Contact information
  if (data.contactEmail) score += 10;
  if (data.contactPhone) score += 10;

  // Referral source
  if (data.referralSource) score += 15;

  // Industry
  if (data.industry && data.industry.toLowerCase().includes("commercial")) {
    score += 15;
  } else if (data.industry && data.industry.toLowerCase().includes("residential")) {
    score += 10;
  }

  return Math.min(100, score);
}
