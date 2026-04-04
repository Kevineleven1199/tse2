"use client";

import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import type { LoyaltyData } from "@/src/lib/client-portal";

const TIER_COLORS = {
  BRONZE: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
  SILVER: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" },
  GOLD: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
  PLATINUM: { bg: "bg-violet-100", text: "text-violet-800", border: "border-violet-300" }
};

const TIER_ICONS = {
  BRONZE: "🥉",
  SILVER: "🥈",
  GOLD: "🥇",
  PLATINUM: "💎"
};

type LoyaltyCardProps = {
  loyalty: LoyaltyData;
};

export const LoyaltyCard = ({ loyalty }: LoyaltyCardProps) => {
  const colors = TIER_COLORS[loyalty.tier];
  const icon = TIER_ICONS[loyalty.tier];

  return (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-accent">Loyalty Status</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors.bg} ${colors.text}`}>
            {icon} {loyalty.tierName}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Benefits */}
        <div className={`rounded-2xl ${colors.bg} ${colors.border} border p-4`}>
          <p className="text-sm font-semibold text-accent">Your Benefits</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {loyalty.discountPercent > 0 ? (
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                {loyalty.discountPercent}% off every project
              </li>
            ) : (
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground">○</span>
                Unlock 5% off at Silver tier
              </li>
            )}
            <li className="flex items-center gap-2">
              <span className={loyalty.tier !== "BRONZE" ? "text-green-500" : "text-muted-foreground"}>
                {loyalty.tier !== "BRONZE" ? "✓" : "○"}
              </span>
              Priority scheduling
            </li>
            <li className="flex items-center gap-2">
              <span className={loyalty.tier === "GOLD" || loyalty.tier === "PLATINUM" ? "text-green-500" : "text-muted-foreground"}>
                {loyalty.tier === "GOLD" || loyalty.tier === "PLATINUM" ? "✓" : "○"}
              </span>
              Free add-on per visit
            </li>
            <li className="flex items-center gap-2">
              <span className={loyalty.tier === "PLATINUM" ? "text-green-500" : "text-muted-foreground"}>
                {loyalty.tier === "PLATINUM" ? "✓" : "○"}
              </span>
              Dedicated cleaner
            </li>
          </ul>
        </div>

        {/* Progress to next tier */}
        {loyalty.visitsToNextTier && loyalty.nextTierName && (
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{loyalty.totalVisits} jobs completed</span>
              <span>{loyalty.visitsToNextTier} to {loyalty.nextTierName}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-brand-100">
              <div 
                className="h-full rounded-full bg-brand-500 transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, (loyalty.totalVisits / (loyalty.totalVisits + loyalty.visitsToNextTier)) * 100)}%` 
                }}
              />
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {loyalty.nextTierName} unlocks {loyalty.nextTierName === "Silver" ? "5%" : loyalty.nextTierName === "Gold" ? "10%" : "15%"} savings
            </p>
          </div>
        )}

        {loyalty.tier === "PLATINUM" && (
          <div className="rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 p-4 text-center text-white">
            <p className="text-lg font-bold">🎉 You&apos;re at the top!</p>
            <p className="text-sm opacity-90">Enjoy maximum benefits as a Platinum member</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
