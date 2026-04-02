import { prisma } from "@/lib/prisma";
import type { CrmLead } from "@prisma/client";

export interface ScoringFactors {
  engagement?: number; // Email opens, call answers, response time
  propertySize?: number; // Larger properties = higher score
  serviceFrequency?: number; // How often they book
  referralSource?: number; // Referred leads get boost
  responseTime?: number; // How quickly they respond
  locationSignal?: number; // In service area = higher
  activityRecency?: number; // Recent activity = higher
  communicationHistory?: number; // Number of interactions
}

export interface LeadScoreBreakdown {
  totalScore: number;
  factors: ScoringFactors;
  temperature: "cold" | "warm" | "hot";
  recommendations: string[];
}

const SERVICE_AREA_CITIES = [
  "austin", "west lake hills", "lakeway", "cedar park", "round rock", "bee cave", "dripping springs",
  "manchaca", "volente", "lago vista", "leander", "jonestown", "liberty hill", "florence"
];

/**
 * Calculate lead score 1-100 based on multiple factors
 */
export function calculateLeadScore(lead: CrmLead, additionalData?: any): LeadScoreBreakdown {
  const factors: ScoringFactors = {};
  let totalScore = 0;

  // 1. ENGAGEMENT SCORING (0-25 points)
  // Based on call count, email opens, last contact
  const callWeight = Math.min(lead.callCount * 2, 15);
  const contactedBonus = lead.lastContactedAt ? 10 : 0;
  factors.engagement = callWeight + contactedBonus;
  totalScore += factors.engagement;

  // 2. PROPERTY SIZE SCORING (0-20 points)
  // Larger commercial properties score higher
  if (lead.sqft) {
    if (lead.sqft >= 50000) factors.propertySize = 20;
    else if (lead.sqft >= 20000) factors.propertySize = 18;
    else if (lead.sqft >= 10000) factors.propertySize = 16;
    else if (lead.sqft >= 5000) factors.propertySize = 14;
    else if (lead.sqft >= 2000) factors.propertySize = 12;
    else if (lead.sqft >= 1000) factors.propertySize = 8;
    else factors.propertySize = 4;
  } else {
    factors.propertySize = 0;
  }
  totalScore += factors.propertySize;

  // 3. SERVICE FREQUENCY SCORING (0-15 points)
  // Based on totalBookings
  if (lead.totalBookings) {
    if (lead.totalBookings >= 20) factors.serviceFrequency = 15;
    else if (lead.totalBookings >= 10) factors.serviceFrequency = 12;
    else if (lead.totalBookings >= 5) factors.serviceFrequency = 10;
    else if (lead.totalBookings >= 2) factors.serviceFrequency = 7;
    else factors.serviceFrequency = 3;
  } else {
    factors.serviceFrequency = 0;
  }
  totalScore += factors.serviceFrequency;

  // 4. REFERRAL SOURCE SCORING (0-15 points)
  // Referred leads are higher quality
  if (lead.referralSource) {
    if (lead.referralSource.toLowerCase().includes("referral")) factors.referralSource = 15;
    else if (lead.referralSource.toLowerCase().includes("review")) factors.referralSource = 12;
    else if (lead.referralSource.toLowerCase().includes("website")) factors.referralSource = 8;
    else if (lead.referralSource.toLowerCase().includes("social")) factors.referralSource = 6;
    else factors.referralSource = 4;
  } else {
    factors.referralSource = 0;
  }
  totalScore += factors.referralSource;

  // 5. RESPONSE TIME SCORING (0-10 points)
  // Based on how long since last contact
  let daysSinceContact = 999;
  if (lead.lastContactedAt) {
    daysSinceContact = Math.floor(
      (new Date().getTime() - new Date(lead.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceContact <= 1) factors.responseTime = 10;
    else if (daysSinceContact <= 7) factors.responseTime = 8;
    else if (daysSinceContact <= 30) factors.responseTime = 5;
    else factors.responseTime = 2;
  } else {
    factors.responseTime = 0;
  }
  totalScore += factors.responseTime;

  // 6. LOCATION SIGNAL SCORING (0-10 points)
  // In service area = higher
  if (lead.city) {
    const cityLower = lead.city.toLowerCase();
    const inServiceArea = SERVICE_AREA_CITIES.some((city) => cityLower.includes(city));
    factors.locationSignal = inServiceArea ? 10 : 5;
  } else {
    factors.locationSignal = 0;
  }
  totalScore += factors.locationSignal;

  // 7. ACTIVITY RECENCY SCORING (0-5 points)
  // Recent updates = still active prospect
  const daysSinceUpdate = Math.floor(
    (new Date().getTime() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceUpdate <= 7) factors.activityRecency = 5;
  else if (daysSinceUpdate <= 30) factors.activityRecency = 3;
  else factors.activityRecency = 0;
  totalScore += factors.activityRecency;

  // Cap score at 100
  totalScore = Math.min(totalScore, 100);

  // Determine temperature
  let temperature: "cold" | "warm" | "hot" = "cold";
  if (totalScore >= 70) temperature = "hot";
  else if (totalScore >= 45) temperature = "warm";

  // Generate recommendations
  const recommendations: string[] = [];
  if (factors.engagement === 0) recommendations.push("No contact history - schedule outreach");
  if (factors.propertySize === 0 && !lead.sqft) recommendations.push("Capture property size for better scoring");
  if (factors.referralSource === 0) recommendations.push("Ask about referral source");
  if (daysSinceContact > 30 && lead.lastContactedAt) recommendations.push("Re-engage - hasn't been contacted in 30+ days");
  if (lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < new Date()) recommendations.push("Follow-up date overdue");

  return {
    totalScore,
    factors,
    temperature,
    recommendations,
  };
}

/**
 * Update lead score and temperature based on recent interactions
 */
export async function updateLeadScoring(leadId: string, tenantId: string): Promise<boolean> {
  try {
    const lead = await prisma.crmLead.findFirst({
      where: { id: leadId, tenantId },
    });

    if (!lead) return false;

    const scoreBreakdown = calculateLeadScore(lead);

    await prisma.crmLead.update({
      where: { id: leadId },
      data: {
        score: scoreBreakdown.totalScore,
        leadTemperature: scoreBreakdown.temperature,
        updatedAt: new Date(),
      },
    });

    return true;
  } catch (error) {
    console.error("[lead-scoring] Failed to update score:", error);
    return false;
  }
}

/**
 * Bulk score update for all leads in tenant
 */
export async function bulkUpdateLeadScores(tenantId: string): Promise<number> {
  try {
    const leads = await prisma.crmLead.findMany({
      where: { tenantId },
      select: {
        id: true,
        score: true,
        leadTemperature: true,
        callCount: true,
        sqft: true,
        totalBookings: true,
        referralSource: true,
        lastContactedAt: true,
        createdAt: true,
        updatedAt: true,
        businessName: true,
        lifecycleStage: true,
      },
    });

    let updated = 0;

    for (const lead of leads) {
      const scoreBreakdown = calculateLeadScore(lead as any);

      // Only update if score changed by more than 5 points
      if (Math.abs(scoreBreakdown.totalScore - lead.score) > 5) {
        await prisma.crmLead.update({
          where: { id: lead.id },
          data: {
            score: scoreBreakdown.totalScore,
            leadTemperature: scoreBreakdown.temperature,
            updatedAt: new Date(),
          },
        });
        updated++;
      }
    }

    return updated;
  } catch (error) {
    console.error("[lead-scoring-bulk] Failed:", error);
    return 0;
  }
}

/**
 * Get score breakdown for display
 */
export function getScoreBreakdownDisplay(breakdown: LeadScoreBreakdown): {
  score: number;
  percentage: number;
  temperature: string;
  temperatureEmoji: string;
  temperatureColor: string;
} {
  const temperatureEmojis: Record<string, string> = {
    cold: "🔵",
    warm: "🟡",
    hot: "🔥",
  };

  const temperatureColors: Record<string, string> = {
    cold: "bg-blue-100 text-blue-700",
    warm: "bg-amber-100 text-amber-700",
    hot: "bg-red-100 text-red-700",
  };

  return {
    score: breakdown.totalScore,
    percentage: Math.round((breakdown.totalScore / 100) * 100),
    temperature: breakdown.temperature.toUpperCase(),
    temperatureEmoji: temperatureEmojis[breakdown.temperature],
    temperatureColor: temperatureColors[breakdown.temperature],
  };
}
