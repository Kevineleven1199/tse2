/**
 * Commercial Prospect Discovery & Ranking Engine
 * 
 * Finds and ranks commercial cleaning opportunities in the Flatwoods area.
 * Focuses on high-value targets: condos, HOAs, daycares, medical offices.
 */

export const COMMERCIAL_INDUSTRIES = [
  { value: "condo_association", label: "Condo Association / HOA", baseScore: 95, avgSqft: 15000, contractLikely: true },
  { value: "medical_office", label: "Medical Office", baseScore: 90, avgSqft: 3500, contractLikely: true },
  { value: "dental_office", label: "Dental Office", baseScore: 88, avgSqft: 2500, contractLikely: true },
  { value: "daycare", label: "Daycare / Childcare Center", baseScore: 92, avgSqft: 4000, contractLikely: true },
  { value: "veterinary", label: "Veterinary Clinic", baseScore: 85, avgSqft: 3000, contractLikely: true },
  { value: "office_building", label: "Office Building", baseScore: 82, avgSqft: 10000, contractLikely: true },
  { value: "coworking_space", label: "Coworking Space", baseScore: 80, avgSqft: 5000, contractLikely: true },
  { value: "church", label: "Church / Place of Worship", baseScore: 78, avgSqft: 8000, contractLikely: false },
  { value: "school", label: "School / Training Center", baseScore: 77, avgSqft: 12000, contractLikely: true },
  { value: "gym", label: "Gym / Fitness Center", baseScore: 75, avgSqft: 5000, contractLikely: true },
  { value: "yoga_studio", label: "Yoga / Pilates Studio", baseScore: 72, avgSqft: 2000, contractLikely: true },
  { value: "salon", label: "Salon / Spa", baseScore: 70, avgSqft: 1500, contractLikely: true },
  { value: "restaurant", label: "Restaurant", baseScore: 68, avgSqft: 2500, contractLikely: false },
  { value: "hotel", label: "Hotel / Motel", baseScore: 65, avgSqft: 20000, contractLikely: true },
  { value: "law_firm", label: "Law Firm", baseScore: 73, avgSqft: 2000, contractLikely: true },
  { value: "real_estate", label: "Real Estate Office", baseScore: 70, avgSqft: 1500, contractLikely: true },
  { value: "retail", label: "Retail Store", baseScore: 60, avgSqft: 2500, contractLikely: false },
  { value: "auto_dealership", label: "Auto Dealership", baseScore: 62, avgSqft: 5000, contractLikely: false },
  { value: "airbnb", label: "Airbnb / Vacation Rental", baseScore: 55, avgSqft: 1500, contractLikely: false },
] as const;

export type CommercialIndustry = typeof COMMERCIAL_INDUSTRIES[number]["value"];

/**
 * Calculate prospect score based on multiple factors
 */
export function calculateProspectScore(prospect: {
  industry: string;
  sqft?: number | null;
  employeeCount?: number | null;
  hasExistingService?: boolean;
  distanceFromBase?: number; // miles
}): number {
  const industryData = COMMERCIAL_INDUSTRIES.find(i => i.value === prospect.industry);
  let score = industryData?.baseScore || 50;

  // Sqft bonus (bigger = more revenue)
  if (prospect.sqft) {
    if (prospect.sqft >= 10000) score += 10;
    else if (prospect.sqft >= 5000) score += 7;
    else if (prospect.sqft >= 2000) score += 4;
  }

  // Contract potential bonus
  if (industryData?.contractLikely) score += 5;

  // Proximity bonus (closer to base in Flatwoods)
  if (prospect.distanceFromBase !== undefined) {
    if (prospect.distanceFromBase <= 5) score += 8;
    else if (prospect.distanceFromBase <= 10) score += 4;
    else if (prospect.distanceFromBase > 20) score -= 5;
  }

  // Currently has a cleaning service (opportunity to win them over)
  if (prospect.hasExistingService) score -= 3;

  return Math.min(100, Math.max(0, score));
}

/**
 * Estimate monthly revenue from a prospect
 */
export function estimateMonthlyRevenue(industry: string, sqft?: number | null): { low: number; high: number; frequency: string } {
  const sqftNum = sqft || COMMERCIAL_INDUSTRIES.find(i => i.value === industry)?.avgSqft || 2000;
  
  // Base rate per sqft per cleaning
  const ratePerSqft = industry.includes("medical") || industry.includes("dental") || industry === "daycare" 
    ? 0.12  // Higher for health-sensitive
    : industry.includes("condo") || industry.includes("office_building")
    ? 0.08  // Volume discount for large
    : 0.10; // Standard commercial

  const perClean = sqftNum * ratePerSqft;
  
  // Frequency assumptions
  let frequency = "weekly";
  let multiplier = 4;
  if (["restaurant", "daycare", "gym", "medical_office", "dental_office"].includes(industry)) {
    frequency = "3x/week";
    multiplier = 12;
  } else if (["church", "airbnb"].includes(industry)) {
    frequency = "biweekly";
    multiplier = 2;
  }

  return {
    low: Math.round(perClean * multiplier * 0.8),
    high: Math.round(perClean * multiplier * 1.2),
    frequency,
  };
}

/**
 * Build AI prompt for generating commercial prospects with owner contacts
 */
export function buildProspectGenerationPrompt(options: {
  industries: string[];
  city?: string;
  count?: number;
}): string {
  const { industries, city = "Flatwoods", count = 25 } = options;
  
  const industryLabels = industries.map(i => {
    const data = COMMERCIAL_INDUSTRIES.find(ci => ci.value === i);
    return data?.label || i.replace(/_/g, " ");
  }).join(", ");

  return `Generate a JSON array of ${count} REAL commercial businesses in the ${city}, KY area (Flatwoods County including Ashland, Venice, South Shore, Russell, Catlettsburg) that would benefit from professional professional services services.

Focus on these industries: ${industryLabels}

For EACH business, provide ALL of these fields:
- businessName: string (use realistic, actual-sounding business names for ${city} area)
- ownerName: string (generate a realistic full name for the owner/property manager/decision maker)
- ownerTitle: string (e.g., "Property Manager", "Office Manager", "Owner", "Facilities Director", "HOA President")
- contactEmail: string (realistic business email like firstname@businessdomain.com)
- contactPhone: string (941 area code, format: (941) XXX-XXXX)
- industry: string (one of: ${industries.join(", ")})
- estimatedSqft: number (realistic for the business type)
- address: string (realistic ${city} area address with street number)
- city: string
- state: "FL"
- postalCode: string (Flatwoods area: 34231-34243, Ashland: 34201-34212, Venice: 34285-34293)
- website: string (realistic URL)
- score: number (1-100, how good a fit for professional services)
- reasoning: string (2-3 sentences on why this is a good prospect and selling angle)
- estimatedEmployees: number
- hasMultipleLocations: boolean
- bestTimeToCall: string (e.g., "Tuesday-Thursday 10am-2pm")
- decisionMakerRole: string (who makes the cleaning vendor decision)

Prioritize:
1. Condo associations and HOAs (largest contracts, recurring monthly)
2. Medical/dental offices (need organic/professional, health regulations)
3. Daycares (parents demand expert, regulatory requirements)
4. Large office buildings (volume contracts)

Return ONLY the JSON array, no other text.`;
}

/**
 * Priority tiers for the call list
 */
export function getProspectTier(score: number): { tier: string; label: string; color: string; action: string } {
  if (score >= 85) return { tier: "A", label: "Top Priority", color: "bg-red-100 text-red-700", action: "Call TODAY — high-value target" };
  if (score >= 70) return { tier: "B", label: "High Priority", color: "bg-amber-100 text-amber-700", action: "Call this week" };
  if (score >= 50) return { tier: "C", label: "Medium Priority", color: "bg-blue-100 text-blue-700", action: "Add to outreach sequence" };
  return { tier: "D", label: "Low Priority", color: "bg-gray-100 text-gray-500", action: "Email campaign only" };
}
