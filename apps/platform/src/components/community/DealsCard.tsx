"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import type { LocalDeal } from "@/src/lib/community";

type DealsCardProps = {
  deals: LocalDeal[];
};

export const DealsCard = ({ deals }: DealsCardProps) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(date));
  };

  const getDaysRemaining = (date: Date) => {
    const now = new Date();
    const diff = new Date(date).getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const CATEGORY_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
    cleaning: { bg: "bg-brand-50", border: "border-brand-200", icon: "🔧" },
    project: { bg: "bg-brand-50", border: "border-brand-200", icon: "🔧" },
    eco_product: { bg: "bg-green-50", border: "border-green-200", icon: "🌿" },
    home_service: { bg: "bg-blue-50", border: "border-blue-200", icon: "🏠" },
    local_business: { bg: "bg-purple-50", border: "border-purple-200", icon: "🏪" }
  };

  return (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-accent">🎁 Deals & Offers</h2>
          <span className="text-xs text-muted-foreground">{deals.length} active</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {deals.map((deal) => {
            const style = CATEGORY_STYLES[deal.category];
            const daysLeft = getDaysRemaining(deal.validUntil);
            
            return (
              <div 
                key={deal.id}
                className={`rounded-xl border p-4 ${style.bg} ${style.border}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{style.icon}</span>
                      <h3 className="font-semibold text-accent">{deal.title}</h3>
                      {deal.isExclusive && (
                        <span className="rounded-full bg-brand-500 px-2 py-0.5 text-xs font-medium text-white">
                          Exclusive
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {deal.description}
                    </p>
                    
                    {/* Discount Display */}
                    {(deal.discountPercent || deal.discountAmount) && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded-lg bg-white px-2 py-1 text-lg font-bold text-brand-600">
                          {deal.discountPercent ? `${deal.discountPercent}% OFF` : `$${deal.discountAmount} OFF`}
                        </span>
                        {deal.code && (
                          <span className="rounded border border-dashed border-brand-300 bg-white px-2 py-1 text-xs font-mono text-brand-600">
                            {deal.code}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Partner Info */}
                    {deal.partnerName && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Partner: {deal.partnerName}
                      </p>
                    )}
                  </div>

                  {/* Expiry Badge */}
                  <div className="text-right">
                    <span className={`text-xs font-medium ${daysLeft <= 3 ? "text-red-600" : "text-muted-foreground"}`}>
                      {daysLeft <= 0 ? "Expired" : daysLeft === 1 ? "1 day left" : `${daysLeft} days left`}
                    </span>
                    {deal.maxRedemptions && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {deal.redemptions}/{deal.maxRedemptions} claimed
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress bar for limited deals */}
                {deal.maxRedemptions && (
                  <div className="mt-3">
                    <div className="h-1.5 w-full rounded-full bg-white">
                      <div 
                        className="h-1.5 rounded-full bg-brand-500 transition-all"
                        style={{ width: `${(deal.redemptions / deal.maxRedemptions) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* CTA Button */}
                <Link
                  href="/get-a-quote"
                  className="mt-3 block w-full rounded-lg bg-white py-2 text-center text-sm font-semibold text-brand-600 transition hover:bg-brand-50"
                >
                  {deal.code ? "Book & Use Code →" : "Get a Quote →"}
                </Link>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
