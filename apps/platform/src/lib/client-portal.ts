import { prisma } from "@/lib/prisma";
import type { PaymentStatus, RequestStatus, ServiceType, Job, ServiceRequest, Quote } from "@prisma/client";
import { safeAvatarUrl } from "@/src/lib/auth/password";

const SERVICE_LABEL: Record<ServiceType, string> = {
  HOME_CLEAN: "Healthy Home Clean",
  PRESSURE_WASH: "Pressure Washing",
  AUTO_DETAIL: "Eco Auto Detail",
  CUSTOM: "Custom Service"
};

// Loyalty tier thresholds
const LOYALTY_TIERS = {
  BRONZE: { min: 0, max: 4, discount: 0, name: "Bronze", nextTier: "Silver" },
  SILVER: { min: 5, max: 11, discount: 5, name: "Silver", nextTier: "Gold" },
  GOLD: { min: 12, max: 23, discount: 10, name: "Gold", nextTier: "Platinum" },
  PLATINUM: { min: 24, max: Infinity, discount: 15, name: "Platinum", nextTier: null }
} as const;

export type LoyaltyTier = keyof typeof LOYALTY_TIERS;

export type LoyaltyData = {
  tier: LoyaltyTier;
  tierName: string;
  totalVisits: number;
  discountPercent: number;
  visitsToNextTier: number | null;
  nextTierName: string | null;
  totalSaved: number;
  referralCode: string;
  referralCount: number;
  referralCredits: number;
};

export type CleanerInfo = {
  id: string;
  name: string;
  photoUrl: string | null;
  rating: number;
  totalCleans: number;
  bio: string | null;
};

type InvoiceSummary = {
  requestId: string;
  quoteId: string;
  service: string;
  total: number;
  paid: number;
  balance: number;
  status: "paid" | "due" | "deposit";
  depositDue: number;
  city: string;
};

type VisitSummary = {
  jobId: string;
  service: string;
  dateLabel: string;
  window: string;
  address: string;
  status: string;
};

type QuoteSummary = {
  requestId: string;
  quoteId: string;
  service: string;
  total: number;
  status: RequestStatus;
  createdAt: string;
};

export type ClientPortalData = {
  customerName: string;
  outstandingInvoices: InvoiceSummary[];
  paidInvoices: InvoiceSummary[];
  upcomingVisits: VisitSummary[];
  quotes: QuoteSummary[];
  totalRequests: number;
  loyalty: LoyaltyData;
  assignedCleaner: CleanerInfo | null;
  completedVisits: number;
  memberSince: string | null;
};

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(date);

const formatTime = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);

const sumPayments = (payments: { amount: number; status: PaymentStatus }[]) =>
  payments.filter((payment) => payment.status === "CAPTURED").reduce((sum, payment) => sum + payment.amount, 0);

type RequestWithRelations = ServiceRequest & {
  quote: Quote | null;
  job: (Job & { assignments: { cleaner: { id: string; userId: string; rating: number; completedJobs: number; user: { firstName: string; lastName: string; avatarUrl: string | null } } }[] }) | null;
  payments: { amount: number; status: PaymentStatus }[];
};

export const getClientPortalData = async (email: string): Promise<ClientPortalData> => {
  const requests = await prisma.serviceRequest.findMany({
    where: { customerEmail: email },
    include: {
      quote: true,
      job: {
        include: {
          assignments: {
            include: {
              cleaner: {
                include: {
                  user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } }
                }
              }
            }
          }
        }
      },
      payments: true
    },
    orderBy: { createdAt: "desc" }
  }) as RequestWithRelations[];

  const outstandingInvoices: InvoiceSummary[] = [];
  const paidInvoices: InvoiceSummary[] = [];
  const upcomingVisits: VisitSummary[] = [];
  const quotes: QuoteSummary[] = [];

  requests.forEach((request) => {
    if (request.job?.scheduledStart) {
      const start = request.job.scheduledStart;
      const end = request.job.scheduledEnd ?? start;
      upcomingVisits.push({
        jobId: request.job.id,
        service: SERVICE_LABEL[request.serviceType],
        dateLabel: formatDate(start),
        window: `${formatTime(start)} – ${formatTime(end)}`,
        address: `${request.addressLine1}, ${request.city}`,
        status: request.job.status
      });
    }

    if (request.quote) {
      const paid = sumPayments(request.payments);
      const balance = Math.max(request.quote.total - paid, 0);
      const deposit = Math.max(request.quote.total * 0.2, 50);
      const invoice: InvoiceSummary = {
        requestId: request.id,
        quoteId: request.quote.id,
        service: SERVICE_LABEL[request.serviceType],
        total: request.quote.total,
        paid,
        balance,
        depositDue: Math.max(deposit - paid, 0),
        status: balance <= 0 ? "paid" : paid > 0 ? "deposit" : "due",
        city: request.city
      };

      if (balance <= 0) {
        paidInvoices.push(invoice);
      } else {
        outstandingInvoices.push(invoice);
      }

      quotes.push({
        requestId: request.id,
        quoteId: request.quote.id,
        service: SERVICE_LABEL[request.serviceType],
        total: request.quote.total,
        status: request.status,
        createdAt: request.createdAt.toISOString()
      });
    }
  });

  const requestName = requests[0]?.customerName ?? "";

  // Calculate completed visits for loyalty
  const completedVisits = requests.filter(r => r.job?.status === "COMPLETED").length;

  // Determine loyalty tier
  const loyalty = await calculateLoyalty(email, completedVisits, paidInvoices);

  // Get assigned cleaner info (from most recent job with assignment)
  const assignedCleaner = getAssignedCleanerFromRequests(requests);

  // Member since date
  const oldestRequest = requests[requests.length - 1];
  const memberSince = oldestRequest ? oldestRequest.createdAt.toISOString() : null;

  return {
    customerName: requestName,
    outstandingInvoices,
    paidInvoices,
    upcomingVisits,
    quotes,
    totalRequests: requests.length,
    loyalty,
    assignedCleaner,
    completedVisits,
    memberSince
  };
};

// Calculate loyalty tier and benefits
async function calculateLoyalty(
  email: string,
  completedVisits: number,
  paidInvoices: InvoiceSummary[]
): Promise<LoyaltyData> {
  // Determine tier based on completed visits
  let tier: LoyaltyTier = "BRONZE";
  if (completedVisits >= LOYALTY_TIERS.PLATINUM.min) tier = "PLATINUM";
  else if (completedVisits >= LOYALTY_TIERS.GOLD.min) tier = "GOLD";
  else if (completedVisits >= LOYALTY_TIERS.SILVER.min) tier = "SILVER";

  const tierData = LOYALTY_TIERS[tier];

  // Calculate visits to next tier
  let visitsToNextTier: number | null = null;
  if (tierData.nextTier) {
    const nextTierKey = tierData.nextTier.toUpperCase() as LoyaltyTier;
    visitsToNextTier = LOYALTY_TIERS[nextTierKey].min - completedVisits;
  }

  // Calculate total saved from loyalty discounts
  const totalSaved = paidInvoices.reduce((sum, inv) => {
    return sum + (inv.total * (tierData.discount / 100));
  }, 0);

  // Generate referral code from email
  const referralCode = generateReferralCode(email);

  // Query actual referral data from the database
  let referralCount = 0;
  let referralCredits = 0;
  try {
    const [rewardedReferrals, qualifiedReferrals] = await Promise.all([
      prisma.referral.findMany({
        where: { referrerEmail: email, status: "REWARDED" },
        select: { rewardAmount: true }
      }),
      prisma.referral.count({
        where: { referrerEmail: email, status: "QUALIFIED" }
      })
    ]);

    referralCount = rewardedReferrals.length + qualifiedReferrals;
    referralCredits = rewardedReferrals.reduce((sum, r) => sum + (r.rewardAmount ?? 0), 0);
  } catch (err) {
    // Fallback to 0 if Referral table not yet migrated
    console.warn("[client-portal] Could not query referrals:", err);
  }

  return {
    tier,
    tierName: tierData.name,
    totalVisits: completedVisits,
    discountPercent: tierData.discount,
    visitsToNextTier,
    nextTierName: tierData.nextTier,
    totalSaved: Math.round(totalSaved * 100) / 100,
    referralCode,
    referralCount,
    referralCredits
  };
}

// Generate a unique referral code from email
function generateReferralCode(email: string): string {
  const hash = email.split("").reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  return `TRISTATE${Math.abs(hash).toString(36).toUpperCase().slice(0, 6)}`;
}

// Get assigned cleaner info from requests
function getAssignedCleanerFromRequests(requests: RequestWithRelations[]): CleanerInfo | null {
  // Find the most recent job with an assigned cleaner
  for (const request of requests) {
    const assignment = request.job?.assignments?.[0];
    if (assignment?.cleaner) {
      const cleaner = assignment.cleaner;
      return {
        id: cleaner.id,
        name: `${cleaner.user.firstName} ${cleaner.user.lastName}`.trim() || "Your Cleaner",
        photoUrl: safeAvatarUrl(cleaner.user.avatarUrl),
        rating: cleaner.rating,
        totalCleans: cleaner.completedJobs,
        bio: null
      };
    }
  }
  return null;
}
