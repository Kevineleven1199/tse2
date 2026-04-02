"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

// Types for analytics data
interface AnalyticsData {
  period: string;
  metrics: {
    uniqueVisitors: number;
    pageViews: number;
    avgSessionDuration: number;
    bounceRate: number;
    previousMetrics?: {
      uniqueVisitors: number;
      pageViews: number;
    };
  };
  conversionFunnel: Array<{
    step: string;
    count: number;
    percentage: number;
  }>;
  topPages: Array<{
    path: string;
    views: number;
    uniqueVisitors: number;
    avgScrollDepth: number;
    topCTA: string;
  }>;
  deviceBreakdown: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  trafficSources: Array<{
    source: string;
    count: number;
  }>;
  hourlyActivity: number[];
}

interface CROTip {
  id: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  icon: string;
}

/**
 * Map API response to AnalyticsData shape used by components
 */
function mapApiToAnalyticsData(raw: Record<string, unknown>): AnalyticsData {
  const visitors = (raw.visitors || {}) as Record<string, number>;
  const funnel = (raw.funnel || {}) as Record<string, number>;
  const topPagesRaw = (raw.topPages || []) as Array<Record<string, unknown>>;
  const devicesRaw = (raw.devices || {}) as Record<string, number>;
  const trafficRaw = (raw.trafficSources || {}) as Record<string, number>;
  const hourlyRaw = (raw.hourlyTrend || []) as Array<{ hour: number; visitors: number }>;
  const scrollRaw = (raw.scrollDepth || {}) as Record<string, number>;
  const ctaRaw = (raw.ctaClicks || []) as Array<{ label: string; clicks: number; page: string }>;

  const totalVisitors = visitors.unique || 0;
  const totalPageviews = visitors.total || 0;

  // Build funnel
  const funnelSteps = [
    { step: "Homepage Visit", count: funnel.homepage || 0 },
    { step: "Services Viewed", count: funnel.services || 0 },
    { step: "Quote Started", count: funnel.quote || 0 },
    { step: "Quote Submitted", count: funnel.quoteSubmitted || 0 },
    { step: "Booking Confirmed", count: funnel.booking || 0 },
  ];
  const maxFunnel = funnelSteps[0].count || 1;

  // Build traffic sources array
  const trafficEntries = [
    { source: "Direct", count: Math.round((trafficRaw.direct || 0) * totalVisitors / 100) },
    { source: "Google", count: Math.round((trafficRaw.organic || 0) * totalVisitors / 100) },
    { source: "Social Media", count: Math.round((trafficRaw.social || 0) * totalVisitors / 100) },
    { source: "Referral", count: Math.round((trafficRaw.referral || 0) * totalVisitors / 100) },
    { source: "Paid", count: Math.round((trafficRaw.paid || 0) * totalVisitors / 100) },
  ].filter((t) => t.count > 0);

  return {
    period: (raw.period as string) || "7d",
    metrics: {
      uniqueVisitors: totalVisitors,
      pageViews: totalPageviews,
      avgSessionDuration: visitors.averageSessionDuration || 0,
      bounceRate: totalVisitors > 0
        ? parseFloat((((totalVisitors - (funnel.services || 0)) / totalVisitors) * 100).toFixed(1))
        : 0,
    },
    conversionFunnel: funnelSteps.map((s) => ({
      ...s,
      percentage: maxFunnel > 0 ? parseFloat(((s.count / maxFunnel) * 100).toFixed(1)) : 0,
    })),
    topPages: topPagesRaw.map((p) => ({
      path: (p.page as string) || "/",
      views: (p.views as number) || 0,
      uniqueVisitors: (p.uniqueVisitors as number) || 0,
      avgScrollDepth: scrollRaw["50%"] || 0,
      topCTA: ctaRaw.find((c) => c.page === p.page)?.label || "—",
    })),
    deviceBreakdown: {
      mobile: devicesRaw.mobile || 0,
      tablet: devicesRaw.tablet || 0,
      desktop: devicesRaw.desktop || 0,
    },
    trafficSources: trafficEntries.length > 0 ? trafficEntries : [{ source: "No data yet", count: 0 }],
    hourlyActivity: hourlyRaw.length === 24
      ? hourlyRaw.map((h) => h.visitors)
      : Array(24).fill(0),
  };
}

// Empty fallback when API fails entirely
const EMPTY_DATA: AnalyticsData = mapApiToAnalyticsData({});

// Utility functions
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

const getTrend = (current: number, previous: number): string => {
  const diff = ((current - previous) / previous) * 100;
  return diff.toFixed(1);
};

const generateCROTips = (data: AnalyticsData): CROTip[] => {
  const tips: CROTip[] = [];
  const { metrics, deviceBreakdown, topPages, conversionFunnel } = data;

  // Mobile conversion tip
  const mobilePercentage = deviceBreakdown.mobile;
  if (mobilePercentage > 60) {
    tips.push({
      id: "mobile-conversion",
      priority: "HIGH",
      title: "Optimize Mobile Experience",
      description: `${mobilePercentage}% of traffic is mobile, but mobile conversion is lower than desktop. Consider simplifying the mobile quote form and reducing required fields.`,
      icon: "📱",
    });
  }

  // Page scroll depth tips
  topPages.forEach((page) => {
    if (page.avgScrollDepth < 50 && page.views > 50) {
      tips.push({
        id: `scroll-${page.path}`,
        priority: "MEDIUM",
        title: `Improve Content on ${page.path}`,
        description: `Visitors on ${page.path} have low scroll depth (${page.avgScrollDepth}%). Consider moving key CTAs and value propositions higher on the page.`,
        icon: "⬆️",
      });
    }
  });

  // Funnel drop-off tips
  const largestDropoff = conversionFunnel.reduce((max, curr, i) => {
    if (i === 0) return max;
    const prevStep = conversionFunnel[i - 1];
    const dropoff = ((prevStep.count - curr.count) / prevStep.count) * 100;
    return dropoff > max.dropoff
      ? { dropoff, stepName: curr.step, dropoffPercent: dropoff }
      : max;
  }, { dropoff: 0, stepName: "", dropoffPercent: 0 });

  if (largestDropoff.stepName && largestDropoff.dropoffPercent > 30) {
    tips.push({
      id: "funnel-dropoff",
      priority: "HIGH",
      title: `High Funnel Drop-off at ${largestDropoff.stepName}`,
      description: `${largestDropoff.dropoffPercent.toFixed(0)}% of visitors abandon at the "${largestDropoff.stepName}" step. Consider reducing form complexity or adding helpful guidance.`,
      icon: "📉",
    });
  }

  // High bounce rate tip
  if (metrics.bounceRate > 50) {
    tips.push({
      id: "bounce-rate",
      priority: "HIGH",
      title: "High Bounce Rate Detected",
      description: `Your bounce rate is ${metrics.bounceRate.toFixed(1)}%. Add compelling above-the-fold value propositions and clear CTAs to improve engagement.`,
      icon: "🎯",
    });
  }

  // CTA performance tip
  const topCTAs = topPages
    .map((p) => p.topCTA)
    .filter((cta, idx, arr) => arr.indexOf(cta) === idx);
  tips.push({
    id: "cta-optimization",
    priority: "MEDIUM",
    title: "Test CTA Button Copy",
    description:
      'Your top CTAs are: "' +
      topCTAs.slice(0, 3).join('", "') +
      '". A/B test variations like "Get Free Quote Today" vs "Schedule Service" to increase conversions.',
    icon: "🔘",
  });

  // Traffic source optimization
  const directTraffic = data.trafficSources.find((s) => s.source === "Direct");
  if (directTraffic && directTraffic.count > 50) {
    tips.push({
      id: "seo-opportunity",
      priority: "MEDIUM",
      title: "Grow Organic & Referral Traffic",
      description:
        "You have strong direct traffic. Invest in SEO and ask satisfied customers for referrals to reduce dependency on paid channels.",
      icon: "📈",
    });
  }

  return tips.slice(0, 5);
};

// Skeleton Loader Component
const SkeletonLoader = ({
  className = "",
}: {
  className?: string;
}): React.ReactElement => (
  <div className={`animate-pulse bg-brand-100 ${className}`} />
);

// KPI Card Component
const KPICard = ({
  title,
  value,
  trend,
  icon,
  isLoading,
}: {
  title: string;
  value: string | number;
  trend?: { direction: "up" | "down"; percentage: string };
  icon: string;
  isLoading?: boolean;
}): React.ReactElement => (
  <Card className="bg-white">
    <CardContent className="pt-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          {isLoading ? (
            <SkeletonLoader className="mt-2 h-8 w-32 rounded" />
          ) : (
            <p className="mt-2 text-3xl font-bold text-accent">{value}</p>
          )}
          {trend && !isLoading && (
            <p
              className={`mt-1 text-xs font-medium ${
                trend.direction === "up"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {trend.direction === "up" ? "↑" : "↓"} {trend.percentage}% vs prev
            </p>
          )}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </CardContent>
  </Card>
);

// Conversion Funnel Component
const ConversionFunnel = ({
  steps,
  isLoading,
}: {
  steps: Array<{ step: string; count: number; percentage: number }>;
  isLoading?: boolean;
}): React.ReactElement => (
  <Card className="bg-white">
    <CardHeader className="pb-3">
      <h2 className="text-lg font-semibold text-accent">Conversion Funnel</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Customer journey from homepage to booking confirmation
      </p>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <SkeletonLoader key={i} className="h-12 rounded-lg" />
            ))
          : steps.map((item, idx) => {
              const width = Math.max((item.percentage / 100) * 100, 15);
              return (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-accent">
                      {item.step}
                    </span>
                    <span className="text-xs font-semibold text-brand-600">
                      {item.count} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-brand-50">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-300 to-brand-600 transition-all duration-500"
                      style={{
                        width: `${width}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
      </div>
    </CardContent>
  </Card>
);

// Top Pages Table Component
const TopPagesTable = ({
  pages,
  isLoading,
}: {
  pages: Array<{
    path: string;
    views: number;
    uniqueVisitors: number;
    avgScrollDepth: number;
    topCTA: string;
  }>;
  isLoading?: boolean;
}): React.ReactElement => (
  <Card className="bg-white">
    <CardHeader className="pb-3">
      <h2 className="text-lg font-semibold text-accent">Top Pages</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Most visited pages and engagement metrics
      </p>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="pb-3 font-medium">Page Path</th>
              <th className="pb-3 font-medium">Views</th>
              <th className="pb-3 font-medium">Unique Visitors</th>
              <th className="pb-3 font-medium">Avg Scroll</th>
              <th className="pb-3 font-medium">Top CTA</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-brand-50">
                    <td className="py-3">
                      <SkeletonLoader className="h-4 w-24 rounded" />
                    </td>
                    <td className="py-3">
                      <SkeletonLoader className="h-4 w-12 rounded" />
                    </td>
                    <td className="py-3">
                      <SkeletonLoader className="h-4 w-12 rounded" />
                    </td>
                    <td className="py-3">
                      <SkeletonLoader className="h-4 w-12 rounded" />
                    </td>
                    <td className="py-3">
                      <SkeletonLoader className="h-4 w-24 rounded" />
                    </td>
                  </tr>
                ))
              : pages.map((page, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-brand-50 ${
                      idx % 2 === 0 ? "bg-white" : "bg-brand-50/30"
                    }`}
                  >
                    <td className="py-3 font-medium text-accent">{page.path}</td>
                    <td className="py-3 text-muted-foreground">{page.views}</td>
                    <td className="py-3 text-muted-foreground">
                      {page.uniqueVisitors}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {page.avgScrollDepth}%
                    </td>
                    <td className="py-3">
                      <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-medium text-brand-700">
                        {page.topCTA}
                      </span>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);

// Device & Source Breakdown
const DeviceAndSourceBreakdown = ({
  deviceBreakdown,
  trafficSources,
  isLoading,
}: {
  deviceBreakdown: { mobile: number; tablet: number; desktop: number };
  trafficSources: Array<{ source: string; count: number }>;
  isLoading?: boolean;
}): React.ReactElement => {
  const total = Object.values(deviceBreakdown).reduce((a, b) => a + b, 0);
  const totalTraffic = trafficSources.reduce((a, b) => a + b.count, 0);

  const devices = [
    {
      name: "Mobile",
      value: deviceBreakdown.mobile,
      icon: "📱",
      color: "from-blue-400 to-blue-600",
    },
    {
      name: "Desktop",
      value: deviceBreakdown.desktop,
      icon: "🖥️",
      color: "from-purple-400 to-purple-600",
    },
    {
      name: "Tablet",
      value: deviceBreakdown.tablet,
      icon: "📱",
      color: "from-green-400 to-green-600",
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Device Breakdown */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold text-accent">Device Breakdown</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Visitor distribution by device type
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonLoader key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {devices.map((device) => {
                const percentage = ((device.value / total) * 100).toFixed(1);
                return (
                  <div key={device.name}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span>{device.icon}</span>
                        <span className="text-sm font-medium text-accent">
                          {device.name}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-brand-600">
                        {percentage}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-brand-50">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${device.color}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Traffic Sources */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold text-accent">Traffic Sources</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Where your visitors are coming from
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonLoader key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {trafficSources.map((source) => {
                const percentage = (
                  (source.count / totalTraffic) *
                  100
                ).toFixed(1);
                return (
                  <div key={source.source}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-accent">{source.source}</span>
                      <span className="text-xs font-semibold text-brand-600">
                        {source.count}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-brand-50">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// CRO Tips Component
const CROTips = ({
  tips,
  isLoading,
}: {
  tips: CROTip[];
  isLoading?: boolean;
}): React.ReactElement => (
  <Card className="bg-white">
    <CardHeader className="pb-3">
      <h2 className="text-lg font-semibold text-accent">
        💡 CRO Recommendations
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        AI-powered optimization tips based on your analytics
      </p>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <SkeletonLoader key={i} className="h-20 rounded-lg" />
            ))
          : tips.map((tip) => (
              <div
                key={tip.id}
                className="flex gap-4 rounded-lg border border-brand-100 bg-brand-50/50 p-3"
              >
                <span className="text-2xl flex-shrink-0">{tip.icon}</span>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-accent">{tip.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {tip.description}
                      </p>
                    </div>
                    <span
                      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${
                        tip.priority === "HIGH"
                          ? "bg-red-100 text-red-700"
                          : tip.priority === "MEDIUM"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                      }`}
                    >
                      {tip.priority}
                    </span>
                  </div>
                </div>
              </div>
            ))}
      </div>
    </CardContent>
  </Card>
);

// Hourly Heatmap Component
const HourlyHeatmap = ({
  data,
  isLoading,
}: {
  data: number[];
  isLoading?: boolean;
}): React.ReactElement => {
  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);

  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <h2 className="text-lg font-semibold text-accent">
          Activity Heatmap by Hour
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Visitor activity distribution throughout the day
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SkeletonLoader className="h-24 rounded-lg" />
        ) : (
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
            {data.map((value, hour) => {
              const intensity = (value - minValue) / (maxValue - minValue || 1);
              const opacity = Math.max(0.3, intensity);

              return (
                <div
                  key={hour}
                  className="group relative"
                  title={`${hour}:00 - ${value} visitors`}
                >
                  <div
                    className="aspect-square rounded-lg border border-brand-200 transition-all hover:border-brand-400 hover:shadow-md"
                    style={{
                      backgroundColor: `rgba(139, 92, 246, ${opacity * 0.8})`,
                    }}
                  />
                  <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 transform rounded bg-accent px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {hour}:00
                    <br />
                    {value} visits
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-6 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Visitor Activity</span>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-opacity-30" style={{ backgroundColor: "rgba(139, 92, 246, 0.3)" }} />
            <span className="text-muted-foreground">Low</span>
            <div className="h-3 w-3 rounded bg-opacity-80" style={{ backgroundColor: "rgba(139, 92, 246, 0.8)" }} />
            <span className="text-muted-foreground">High</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Analytics Page Component
export default function AnalyticsPage(): React.ReactElement {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("7d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [tips, setTips] = useState<CROTip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/analytics/dashboard?period=${period}`);
        if (response.ok) {
          const result = await response.json();
          const mapped = mapApiToAnalyticsData(result);
          setData(mapped);
          setTips(generateCROTips(mapped));
        } else {
          setData(EMPTY_DATA);
          setTips(generateCROTips(EMPTY_DATA));
        }
      } catch (error) {
        console.log("Analytics fetch error, showing empty state");
        setData(EMPTY_DATA);
        setTips(generateCROTips(EMPTY_DATA));
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [period]);

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
            Analytics
          </p>
          <h1 className="text-2xl font-semibold">Website Analytics</h1>
          <p className="mt-1 text-sm text-brand-100">
            Real-time visitor tracking, conversion funnel, and CRO insights
          </p>
        </div>
        <div className="animate-pulse space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-brand-100" />
          ))}
        </div>
      </div>
    );
  }

  const trendVisitors = data.metrics.previousMetrics
    ? getTrend(data.metrics.uniqueVisitors, data.metrics.previousMetrics.uniqueVisitors)
    : "0";
  const trendPageviews = data.metrics.previousMetrics
    ? getTrend(data.metrics.pageViews, data.metrics.previousMetrics.pageViews)
    : "0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
              Analytics
            </p>
            <h1 className="text-2xl font-semibold">Website Analytics</h1>
            <p className="mt-1 text-sm text-brand-100">
              Real-time visitor tracking, conversion funnel, and CRO insights
            </p>
          </div>

          {/* Period Selector */}
          <div className="flex gap-2">
            {(["7d", "30d", "90d", "all"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                  period === p
                    ? "bg-white text-brand-600"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {p === "7d"
                  ? "7d"
                  : p === "30d"
                    ? "30d"
                    : p === "90d"
                      ? "90d"
                      : "All"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Unique Visitors"
          value={data.metrics.uniqueVisitors}
          trend={{ direction: trendVisitors > "0" ? "up" : "down", percentage: trendVisitors }}
          icon="👥"
          isLoading={isLoading}
        />
        <KPICard
          title="Page Views"
          value={data.metrics.pageViews}
          trend={{ direction: trendPageviews > "0" ? "up" : "down", percentage: trendPageviews }}
          icon="👁️"
          isLoading={isLoading}
        />
        <KPICard
          title="Avg Session Duration"
          value={formatDuration(data.metrics.avgSessionDuration)}
          icon="⏱️"
          isLoading={isLoading}
        />
        <KPICard
          title="Bounce Rate"
          value={`${data.metrics.bounceRate.toFixed(1)}%`}
          icon="📊"
          isLoading={isLoading}
        />
      </div>

      {/* Conversion Funnel */}
      <ConversionFunnel
        steps={data.conversionFunnel}
        isLoading={isLoading}
      />

      {/* Top Pages Table */}
      <TopPagesTable pages={data.topPages} isLoading={isLoading} />

      {/* Device & Source Breakdown */}
      <DeviceAndSourceBreakdown
        deviceBreakdown={data.deviceBreakdown}
        trafficSources={data.trafficSources}
        isLoading={isLoading}
      />

      {/* CRO Tips */}
      <CROTips tips={tips} isLoading={isLoading} />

      {/* Hourly Heatmap */}
      <HourlyHeatmap data={data.hourlyActivity} isLoading={isLoading} />
    </div>
  );
}
