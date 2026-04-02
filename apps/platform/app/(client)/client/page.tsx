import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { formatCurrency } from "@/src/lib/utils";
import { getSession } from "@/src/lib/auth/session";
import { getClientPortalData } from "@/src/lib/client-portal";
import { LoyaltyCard } from "@/src/components/client/LoyaltyCard";
import { CleanerCard } from "@/src/components/client/CleanerCard";
import { ReferralCard } from "@/src/components/client/ReferralCard";
import { DailyTipCard } from "@/src/components/client/DailyTipCard";
import { generateNewsletter } from "@/src/lib/newsletter/generator";
import { AchievementsCard } from "@/src/components/shared/AchievementsCard";
import { BookAgainCard } from "@/src/components/client/BookAgainCard";
import { prisma } from "@/lib/prisma";
import { CalendarDays, Sparkles, KeyRound, Receipt, Star, Gift } from "lucide-react";

const quickActions = [
  { label: "Book a clean", href: "/request", icon: CalendarDays, color: "bg-brand-500" },
  { label: "Request add-ons", href: "/request", icon: Sparkles, color: "bg-purple-500" },
  { label: "Share entry notes", href: "/client/visits", icon: KeyRound, color: "bg-amber-500" },
  { label: "Review invoices", href: "/client/billing", icon: Receipt, color: "bg-blue-500" },
  { label: "Rate your cleaner", href: "/client/feedback", icon: Star, color: "bg-teal-500" },
  { label: "Refer a friend", href: "/client/referrals", icon: Gift, color: "bg-pink-500" },
];

const ClientHome = async () => {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const portalData = await getClientPortalData(session.userId);
  const nextVisit = portalData.upcomingVisits[0];
  const nextInvoice = portalData.outstandingInvoices[0];
  const { loyalty, assignedCleaner, memberSince } = portalData;

  // Get today's cleaning tip for the dashboard widget
  let dailyTip: { subject: string; preview: string } | null = null;
  try {
    const newsletter = generateNewsletter(new Date());
    dailyTip = { subject: newsletter.subject, preview: newsletter.preview };
  } catch {
    // Silently skip if tip generation fails
  }

  // Fetch last completed service for book-again
  let lastService: {
    requestId: string;
    service: string;
    address: string;
    date: string;
    addressLine1: string;
    city: string;
    state: string;
    zip: string;
    sqft: number | null;
  } | null = null;
  if (portalData.completedVisits > 0) {
    try {
      const lastCompleted = await prisma.serviceRequest.findFirst({
        where: {
          customerEmail: session.email,
          job: { status: "COMPLETED" },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          serviceType: true,
          addressLine1: true,
          city: true,
          state: true,
          postalCode: true,
          squareFootage: true,
          createdAt: true,
        },
      });
      if (lastCompleted) {
        lastService = {
          requestId: lastCompleted.id,
          service: lastCompleted.serviceType,
          address: `${lastCompleted.addressLine1}, ${lastCompleted.city}`,
          date: new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }).format(lastCompleted.createdAt),
          addressLine1: lastCompleted.addressLine1,
          city: lastCompleted.city,
          state: lastCompleted.state,
          zip: lastCompleted.postalCode,
          sqft: lastCompleted.squareFootage,
        };
      }
    } catch {
      // skip book-again if query fails
    }
  }

  // Format member since date
  const memberSinceFormatted = memberSince
    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(memberSince))
    : null;

  return (
    <div className="space-y-6">
      {/* Welcome Header with Loyalty Status */}
      <div className="rounded-3xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
              {loyalty.tierName} Member {memberSinceFormatted && `• Since ${memberSinceFormatted}`}
            </p>
            <h1 className="mt-1 text-2xl font-semibold">
              Welcome back, {portalData.customerName || session.name}! 👋
            </h1>
            {loyalty.discountPercent > 0 && (
              <p className="mt-1 text-sm text-brand-100">
                You&apos;re saving {loyalty.discountPercent}% on every clean as a {loyalty.tierName} member
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 px-4 py-2 backdrop-blur">
              <p className="text-xs uppercase tracking-wider text-brand-200">Total Saved</p>
              <p className="text-xl font-bold">{formatCurrency(loyalty.totalSaved)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-2 backdrop-blur">
              <p className="text-xs uppercase tracking-wider text-brand-200">Completed</p>
              <p className="text-xl font-bold">{portalData.completedVisits} cleans</p>
            </div>
          </div>
        </div>
        
        {/* Progress to next tier */}
        {loyalty.visitsToNextTier && loyalty.nextTierName && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-brand-200">
              <span>{loyalty.tierName}</span>
              <span>{loyalty.visitsToNextTier} more cleans to {loyalty.nextTierName}</span>
              <span>{loyalty.nextTierName}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/20">
              <div 
                className="h-full rounded-full bg-sunshine transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, ((portalData.completedVisits % 12) / (loyalty.visitsToNextTier + (portalData.completedVisits % 12))) * 100)}%` 
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Next Visit Card */}
        <Card className="bg-white lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-accent">Next Visit</h2>
              {nextVisit && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                  Confirmed
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {nextVisit ? (
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <p className="text-2xl font-semibold text-accent">
                    {nextVisit.dateLabel}
                  </p>
                  <p className="text-lg text-muted-foreground">{nextVisit.window}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{nextVisit.service}</p>
                  <p className="text-xs text-muted-foreground">{nextVisit.address}</p>
                </div>
                
                {/* Assigned Cleaner Preview */}
                {assignedCleaner && (
                  <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50/40 p-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-full bg-brand-200">
                      {assignedCleaner.photoUrl ? (
                        <Image 
                          src={assignedCleaner.photoUrl} 
                          alt={assignedCleaner.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-brand-600">
                          {assignedCleaner.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-accent">{assignedCleaner.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ⭐ {assignedCleaner.rating.toFixed(1)} • {assignedCleaner.totalCleans} cleans
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col gap-2">
                  <Link 
                    href="/client/visits" 
                    className="rounded-full bg-accent px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-brand-700"
                  >
                    View Details
                  </Link>
                  <Link 
                    href="/client/reschedule" 
                    className="rounded-full border border-brand-200 px-4 py-2 text-center text-sm font-semibold text-accent transition hover:bg-brand-50"
                  >
                    Reschedule
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">No upcoming visits scheduled</p>
                <Link 
                  href="/request" 
                  className="mt-4 inline-flex rounded-full bg-accent px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  Book a Clean
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing Snapshot */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-semibold text-accent">Billing</h2>
          </CardHeader>
          <CardContent>
            {nextInvoice ? (
              <div className="space-y-3">
                <div className="rounded-2xl bg-amber-50 p-4">
                  <p className="text-xs uppercase tracking-wider text-amber-700">Balance Due</p>
                  <p className="text-2xl font-bold text-amber-900">{formatCurrency(nextInvoice.balance)}</p>
                  <p className="mt-1 text-xs text-amber-700">
                    {nextInvoice.service} • Quote #{nextInvoice.quoteId.slice(0, 6)}
                  </p>
                </div>
                <Link 
                  href="/client/billing" 
                  className="block rounded-full bg-accent px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  Pay Now
                </Link>
              </div>
            ) : (
              <div className="rounded-2xl bg-green-50 p-4 text-center">
                <p className="text-2xl">✓</p>
                <p className="mt-1 font-semibold text-green-700">All caught up!</p>
                <p className="text-xs text-green-600">No outstanding invoices</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loyalty Card Component */}
        <LoyaltyCard loyalty={loyalty} />

        {/* Assigned Cleaner Card */}
        <CleanerCard cleaner={assignedCleaner} />

        {/* Referral Card */}
        <ReferralCard
          referralCode={loyalty.referralCode}
          referralCount={loyalty.referralCount}
          referralCredits={loyalty.referralCredits}
        />
      </div>

      {/* Book Again */}
      {lastService && <BookAgainCard lastService={lastService} />}

      {/* Achievements Card */}
      <AchievementsCard />

      {/* Daily Cleaning Tip */}
      {dailyTip && (
        <DailyTipCard subject={dailyTip.subject} preview={dailyTip.preview} />
      )}

      {/* Quick Actions Grid */}
      <Card className="bg-white">
        <CardHeader>
          <h2 className="text-lg font-semibold text-accent">Quick Actions</h2>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="group flex flex-col items-center gap-2.5 rounded-2xl border border-brand-100 bg-white p-4 text-center transition-all hover:border-brand-200 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.color} text-white shadow-sm transition-transform group-hover:scale-110`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-accent group-hover:text-brand-600">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-brand-100 bg-white p-4 text-center">
          <p className="text-3xl font-bold text-accent">{portalData.totalRequests}</p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Requests</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4 text-center">
          <p className="text-3xl font-bold text-accent">{portalData.completedVisits}</p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Completed Cleans</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4 text-center">
          <p className="text-3xl font-bold text-accent">{portalData.upcomingVisits.length}</p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Upcoming Visits</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4 text-center">
          <p className="text-3xl font-bold text-accent">{loyalty.referralCount}</p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Friends Referred</p>
        </div>
      </div>
    </div>
  );
};

export default ClientHome;
