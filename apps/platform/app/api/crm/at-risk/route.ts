import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/crm/at-risk
 * Detect at-risk customers, generate re-engagement call lists, and territory analysis.
 *
 * Returns:
 * - atRiskCustomers: customers with no booking in 60+ days
 * - reEngagementList: prioritized call list for win-back
 * - zipCodeAnalysis: customer density by zip code
 * - territoryInsights: which areas have high/low saturation
 */
export async function GET(request: Request) {
  const session = await requireSession({ roles: ["HQ", "MANAGER"] });
  const tenantId = session.tenantId;

  const url = new URL(request.url);
  const riskDays = parseInt(url.searchParams.get("days") || "60");

  const cutoffDate = new Date(Date.now() - riskDays * 86400000);

  // Fetch all customers with their last service date
  const customers = await prisma.user.findMany({
    where: { tenantId, role: "CUSTOMER" },
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true,
      createdAt: true, status: true,
    },
  });

  // Fetch last service date for each customer via ServiceRequest
  const customerEmails = customers.map(c => c.email);
  const recentRequests = await prisma.serviceRequest.findMany({
    where: {
      tenantId,
      customerEmail: { in: customerEmails },
      status: { in: ["COMPLETED", "SCHEDULED"] },
    },
    select: { customerEmail: true, createdAt: true, city: true, postalCode: true, serviceType: true },
    orderBy: { createdAt: "desc" },
  });

  // Build customer map with last activity
  const lastServiceMap = new Map<string, { date: Date; city: string; zip: string; service: string }>();
  const allZipCodes = new Map<string, { count: number; city: string }>();

  for (const req of recentRequests) {
    if (!lastServiceMap.has(req.customerEmail)) {
      lastServiceMap.set(req.customerEmail, {
        date: req.createdAt,
        city: req.city,
        zip: req.postalCode,
        service: req.serviceType,
      });
    }
    // Zip code analysis
    const zip = req.postalCode;
    if (zip) {
      const existing = allZipCodes.get(zip) || { count: 0, city: req.city };
      allZipCodes.set(zip, { count: existing.count + 1, city: req.city });
    }
  }

  // Categorize customers
  type CustomerRecord = typeof customers[0];
  type AtRiskRecord = CustomerRecord & { daysSinceService: number; lastService: string; lastCity: string; riskLevel: string };
  const atRisk: AtRiskRecord[] = [];
  const healthy: CustomerRecord[] = [];
  const neverBooked: CustomerRecord[] = [];

  for (const customer of customers) {
    const lastService = lastServiceMap.get(customer.email);
    if (!lastService) {
      neverBooked.push(customer);
      continue;
    }

    const daysSince = Math.floor((Date.now() - lastService.date.getTime()) / 86400000);
    if (daysSince >= riskDays) {
      atRisk.push({
        ...customer,
        daysSinceService: daysSince,
        lastService: lastService.service.replace(/_/g, " "),
        lastCity: lastService.city,
        riskLevel: daysSince >= 180 ? "critical" : daysSince >= 120 ? "high" : "medium",
      });
    } else {
      healthy.push(customer);
    }
  }

  // Sort at-risk by days since (most at-risk first)
  atRisk.sort((a, b) => b.daysSinceService - a.daysSinceService);

  // Build re-engagement call list with suggested scripts
  const reEngagementList = atRisk.slice(0, 25).map((customer, i) => ({
    position: i + 1,
    id: customer.id,
    name: `${customer.firstName} ${customer.lastName}`.trim(),
    email: customer.email,
    phone: customer.phone,
    daysSinceService: customer.daysSinceService,
    lastService: customer.lastService,
    lastCity: customer.lastCity,
    riskLevel: customer.riskLevel,
    suggestedScript: `Hi ${customer.firstName}, this is [Name] from Tri State Enterprise. We noticed it's been a while since your last ${customer.lastService.toLowerCase()} service. We'd love to get you back on the schedule — and as a returning client, we can offer you 15% off your next visit. Would you like to book a time this week?`,
    suggestedAction: customer.daysSinceService >= 180
      ? "Send win-back offer + personal call"
      : customer.daysSinceService >= 120
      ? "Call with special pricing"
      : "Friendly check-in call",
  }));

  // Zip code territory analysis
  const zipAnalysis = Array.from(allZipCodes.entries())
    .map(([zip, data]) => ({
      zipCode: zip,
      city: data.city,
      customerCount: data.count,
      saturation: data.count >= 10 ? "high" : data.count >= 5 ? "medium" : "low",
      opportunity: data.count >= 5
        ? "High density — good for door-to-door or mailer campaigns"
        : data.count >= 2
        ? "Growing area — consider targeted social ads"
        : "New territory — seed with first-customer promos",
    }))
    .sort((a, b) => b.customerCount - a.customerCount);

  // Mailing list recommendations
  const topZips = zipAnalysis.filter(z => z.saturation === "high" || z.saturation === "medium");
  const mailingListAdvice = topZips.length > 0
    ? `Focus direct mail on these zip codes: ${topZips.slice(0, 5).map(z => `${z.zipCode} (${z.city}, ${z.customerCount} customers)`).join("; ")}. These areas have proven demand and word-of-mouth potential.`
    : "Build initial customer base before investing in direct mail. Focus on digital ads and referral programs first.";

  return NextResponse.json({
    summary: {
      totalCustomers: customers.length,
      healthyCustomers: healthy.length,
      atRiskCustomers: atRisk.length,
      neverBookedCustomers: neverBooked.length,
      riskRate: customers.length > 0 ? Math.round(atRisk.length / customers.length * 100) : 0,
    },
    atRiskCustomers: atRisk.slice(0, 50),
    reEngagementList,
    neverBooked: neverBooked.slice(0, 20).map(c => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`.trim(),
      email: c.email,
      phone: c.phone,
      registeredAt: c.createdAt.toISOString(),
      suggestedAction: "Welcome call — convert to first booking",
    })),
    zipCodeAnalysis: zipAnalysis,
    mailingListAdvice,
    territoryInsights: {
      topZips: zipAnalysis.slice(0, 10),
      untappedZips: zipAnalysis.filter(z => z.saturation === "low").slice(0, 10),
      recommendation: mailingListAdvice,
    },
  });
}
