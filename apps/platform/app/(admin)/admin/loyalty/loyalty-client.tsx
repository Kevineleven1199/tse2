"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

interface Tier {
  name: string;
  minXp: number;
  discount: number;
  perks: string;
  count?: number;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  xp: number;
  tier: Tier;
  nextTier: Tier | null;
  xpToNext: number;
}

interface LoyaltyData {
  tiers: Tier[];
  customers: Customer[];
  distribution: (Tier & { count: number })[];
  totalCustomers: number;
  avgXp: number;
}

export default function LoyaltyClient() {
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/loyalty")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const tierColors: Record<string, string> = {
    Seedling: "bg-gray-100 text-gray-700",
    Sprout: "bg-green-100 text-green-700",
    Bloom: "bg-emerald-100 text-emerald-700",
    Evergreen: "bg-teal-100 text-teal-700",
    Canopy: "bg-brand-100 text-brand-700",
  };

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">RETENTION</p>
          <h1 className="text-2xl font-semibold">Loyalty Program</h1>
        </div>
        <Card className="bg-white"><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">RETENTION</p>
        <h1 className="text-2xl font-semibold">Loyalty Program</h1>
        <p className="mt-1 text-sm text-brand-100">XP-based tier system rewarding your best customers</p>
      </div>

      {/* Tier Distribution */}
      <div className="grid gap-4 sm:grid-cols-5">
        {data.distribution.map((t) => (
          <Card key={t.name} className="bg-white">
            <CardContent className="pt-6 text-center">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tierColors[t.name] || ""}`}>
                {t.name}
              </span>
              <p className="mt-2 text-2xl font-bold text-accent">{t.count}</p>
              <p className="text-xs text-muted-foreground">{t.discount}% discount</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.minXp}+ XP</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-white">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Customers</p>
            <p className="mt-2 text-3xl font-bold text-accent">{data.totalCustomers}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Average XP</p>
            <p className="mt-2 text-3xl font-bold text-accent">{data.avgXp}</p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Table */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold text-accent">Customer Loyalty Leaderboard</h2>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="pb-3 pr-4">Rank</th>
                  <th className="pb-3 pr-4">Customer</th>
                  <th className="pb-3 pr-4">Tier</th>
                  <th className="pb-3 pr-4">XP</th>
                  <th className="pb-3 pr-4">Discount</th>
                  <th className="pb-3">Next Tier</th>
                </tr>
              </thead>
              <tbody>
                {data.customers.slice(0, 50).map((c, i) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">#{i + 1}</td>
                    <td className="py-3 pr-4">
                      <p className="font-medium">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tierColors[c.tier.name] || ""}`}>
                        {c.tier.name}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-medium">{c.xp}</td>
                    <td className="py-3 pr-4">{c.tier.discount}%</td>
                    <td className="py-3">
                      {c.nextTier ? (
                        <span className="text-xs text-muted-foreground">
                          {c.xpToNext} XP to {c.nextTier.name}
                        </span>
                      ) : (
                        <span className="text-xs text-brand-600 font-medium">Max tier!</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tier Details */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold text-accent">Tier Benefits</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.tiers.map((t) => (
              <div key={t.name} className="flex items-center gap-4 rounded-lg border p-3">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tierColors[t.name] || ""}`}>
                  {t.name}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{t.minXp}+ XP required</p>
                  <p className="text-xs text-muted-foreground">{t.perks}</p>
                </div>
                <span className="text-sm font-bold text-brand-600">{t.discount}% off</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
