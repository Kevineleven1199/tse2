"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, FunnelChart, Funnel, LabelList, Cell,
} from "recharts";

interface InsightsData {
  revenue: {
    thisMonth: number;
    lastMonth: number;
    total: number;
    monthlyTrend: { month: string; revenue: number }[];
    monthOverMonthGrowth: number;
  };
  conversion: {
    totalRequests: number;
    acceptedRequests: number;
    conversionRate: number;
    recentConversionRate: number;
  };
  jobs: {
    completed: number;
    scheduled: number;
    cancelled: number;
    avgValue: number;
    busiestDays: { day: string; jobs: number }[];
  };
  customers: {
    total: number;
    new30d: number;
    repeatCount: number;
    retentionRate: number;
  };
  team: {
    activeCleaners: number;
    topCleaners: { name: string; rating: number; completedJobs: number }[];
  };
  leads: {
    total: number;
    hot: number;
    converted: number;
  };
  recurring: {
    activeSchedules: number;
    monthlyRecurringRevenue: number;
  };
  recentAcceptances: { customer: string; service: string; date: string }[];
}

export default function InsightsClient() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/insights")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">ANALYTICS</p>
          <h1 className="text-2xl font-semibold">Business Insights</h1>
        </div>
        <Card className="bg-white"><CardContent className="py-12 text-center"><p className="text-muted-foreground">Loading insights...</p></CardContent></Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">ANALYTICS</p>
          <h1 className="text-2xl font-semibold">Business Insights</h1>
        </div>
        <Card className="bg-white"><CardContent className="py-12 text-center"><p className="text-red-600">{error || "Failed to load insights"}</p></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">ANALYTICS</p>
            <h1 className="text-2xl font-semibold">Business Insights</h1>
            <p className="mt-1 text-sm text-brand-100">Key metrics and performance indicators at a glance</p>
          </div>
        </div>
      </div>

      {/* Revenue Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">This Month</p>
            <p className="mt-2 text-3xl font-bold text-accent">{fmt(data.revenue.thisMonth)}</p>
            <p className={`text-xs mt-1 ${data.revenue.monthOverMonthGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
              {data.revenue.monthOverMonthGrowth >= 0 ? "+" : ""}{data.revenue.monthOverMonthGrowth.toFixed(1)}% vs last month
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Month</p>
            <p className="mt-2 text-3xl font-bold text-accent">{fmt(data.revenue.lastMonth)}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recurring Revenue</p>
            <p className="mt-2 text-3xl font-bold text-accent">{fmt(data.recurring.monthlyRecurringRevenue)}/mo</p>
            <p className="text-xs text-muted-foreground mt-1">{data.recurring.activeSchedules} active schedules</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Revenue</p>
            <p className="mt-2 text-3xl font-bold text-accent">{fmt(data.revenue.total)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Conversion + Jobs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conversion Rate</p>
            <p className="mt-2 text-3xl font-bold text-accent">{data.conversion.conversionRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">{data.conversion.acceptedRequests} of {data.conversion.totalRequests} requests</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last 30 Days</p>
            <p className="mt-2 text-3xl font-bold text-accent">{data.conversion.recentConversionRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">conversion rate</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avg Job Value</p>
            <p className="mt-2 text-3xl font-bold text-accent">{fmt(data.jobs.avgValue)}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jobs Completed</p>
            <p className="mt-2 text-3xl font-bold text-accent">{data.jobs.completed}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.jobs.scheduled} upcoming • {data.jobs.cancelled} cancelled</p>
          </CardContent>
        </Card>
      </div>

      {/* Customer + Team Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Customers</p>
            <p className="mt-2 text-3xl font-bold text-accent">{data.customers.total}</p>
            <p className="text-xs text-muted-foreground mt-1">+{data.customers.new30d} in last 30 days</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Retention Rate</p>
            <p className="mt-2 text-3xl font-bold text-accent">{data.customers.retentionRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">{data.customers.repeatCount} repeat customers</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Cleaners</p>
            <p className="mt-2 text-3xl font-bold text-accent">{data.team.activeCleaners}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lead Pipeline</p>
            <p className="mt-2 text-3xl font-bold text-accent">{data.leads.total}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.leads.hot} hot • {data.leads.converted} converted</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend — Recharts Area Chart */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold text-accent">Revenue Trend (6 Months)</h2>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.revenue.monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2D6A4F" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2D6A4F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#888" }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: "#888" }} />
              <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]} />
              <Area type="monotone" dataKey="revenue" stroke="#2D6A4F" strokeWidth={2.5} fill="url(#revGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Conversion Funnel + Busiest Days */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <h2 className="text-lg font-semibold text-accent">Conversion Funnel</h2>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={[
                  { name: "Leads", value: data.leads.total || data.conversion.totalRequests, fill: "#B7E4C7" },
                  { name: "Quotes", value: data.conversion.totalRequests, fill: "#74C69D" },
                  { name: "Accepted", value: data.conversion.acceptedRequests, fill: "#40916C" },
                  { name: "Completed", value: data.jobs.completed, fill: "#2D6A4F" },
                ]}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: "#888" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: "#333", fontWeight: 600 }} width={80} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {[
                    { name: "Leads", fill: "#B7E4C7" },
                    { name: "Quotes", fill: "#74C69D" },
                    { name: "Accepted", fill: "#40916C" },
                    { name: "Completed", fill: "#2D6A4F" },
                  ].map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground px-2">
              <span>Overall conversion: <strong className="text-accent">{data.conversion.conversionRate}%</strong></span>
              <span>30-day: <strong className="text-accent">{data.conversion.recentConversionRate}%</strong></span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-3">
            <h2 className="text-lg font-semibold text-accent">Jobs by Day</h2>
          </CardHeader>
          <CardContent>
            {data.jobs.busiestDays.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.jobs.busiestDays} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#888" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#888" }} />
                  <Tooltip />
                  <Bar dataKey="jobs" fill="#74C69D" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">No job data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Top Cleaners + Recent Bookings */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <h2 className="text-lg font-semibold text-accent">Top Cleaners</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.team.topCleaners.map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-brand-50/30 px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-accent">{c.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-brand-600 font-bold">{c.rating.toFixed(1)} ★</span>
                    <span className="text-xs text-muted-foreground ml-2">{c.completedJobs} jobs</span>
                  </div>
                </div>
              ))}
              {data.team.topCleaners.length === 0 && (
                <p className="text-sm text-muted-foreground">No cleaner data yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-3">
            <h2 className="text-lg font-semibold text-accent">Recent Bookings</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentAcceptances.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-brand-50/30 px-4 py-2.5">
                  <div>
                    <span className="text-sm font-semibold text-accent">{r.customer}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{r.service}</span>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
              {data.recentAcceptances.length === 0 && (
                <p className="text-sm text-muted-foreground">No recent bookings</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
