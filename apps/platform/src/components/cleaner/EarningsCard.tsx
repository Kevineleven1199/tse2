"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { formatCurrency } from "@/src/lib/utils";
import type { EarningsData } from "@/src/lib/cleaner-portal";

type EarningsCardProps = {
  earnings: EarningsData;
};

export const EarningsCard = ({ earnings }: EarningsCardProps) => {
  const nextPayoutFormatted = earnings.nextPayoutDate
    ? new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" })
        .format(new Date(earnings.nextPayoutDate))
    : "Friday";

  // Calculate trend (compare this week to last week equivalent)
  const weeklyTrend = earnings.lastMonth > 0 
    ? Math.round(((earnings.thisMonth - earnings.lastMonth) / earnings.lastMonth) * 100)
    : 0;

  return (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-accent">Earnings</h2>
          <Link 
            href="/cleaner/payouts"
            className="text-xs font-semibold uppercase tracking-wider text-brand-600 hover:text-brand-700"
          >
            View All
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today's Earnings - Prominent */}
        <div className="rounded-2xl bg-gradient-to-br from-green-500 to-green-600 p-4 text-white">
          <p className="text-xs uppercase tracking-wider text-green-100">Today</p>
          <p className="text-3xl font-bold">{formatCurrency(earnings.today)}</p>
        </div>

        {/* Period Breakdown */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-brand-50 p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">This Week</p>
            <p className="text-xl font-bold text-accent">{formatCurrency(earnings.thisWeek)}</p>
          </div>
          <div className="rounded-xl bg-brand-50 p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">This Month</p>
            <p className="text-xl font-bold text-accent">{formatCurrency(earnings.thisMonth)}</p>
            {weeklyTrend !== 0 && (
              <p className={`text-xs ${weeklyTrend > 0 ? "text-green-600" : "text-red-500"}`}>
                {weeklyTrend > 0 ? "↑" : "↓"} {Math.abs(weeklyTrend)}% vs last month
              </p>
            )}
          </div>
        </div>

        {/* Pending Payout */}
        {earnings.pendingPayout > 0 && (
          <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-amber-700">Pending Payout</p>
                <p className="text-xl font-bold text-amber-900">{formatCurrency(earnings.pendingPayout)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-amber-700">Next payout</p>
                <p className="text-sm font-semibold text-amber-900">{nextPayoutFormatted}</p>
              </div>
            </div>
          </div>
        )}

        {/* Lifetime */}
        <div className="flex items-center justify-between rounded-xl bg-brand-100 p-3">
          <span className="text-sm font-medium text-accent">Lifetime Earnings</span>
          <span className="text-lg font-bold text-accent">{formatCurrency(earnings.lifetimeEarnings)}</span>
        </div>
      </CardContent>
    </Card>
  );
};
