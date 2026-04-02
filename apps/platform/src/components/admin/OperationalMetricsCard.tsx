"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import type { OperationalMetrics } from "@/src/lib/admin-portal";

/**
 * OperationalMetricsCard - Available to ADMIN and MANAGER
 * Shows operational KPIs without sensitive financial data
 */

type OperationalMetricsCardProps = {
  data: OperationalMetrics;
};

export const OperationalMetricsCard = ({ data }: OperationalMetricsCardProps) => {
  const formatMetric = (value: number | null, suffix = "") =>
    value === null ? "—" : `${value}${suffix}`;

  return (
    <Card className="rounded-2xl bg-white shadow-sm card-hover">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-accent">Operations</h2>
          <Link 
            href="/admin"
            className="text-xs font-semibold uppercase tracking-wider text-brand-600 hover:text-brand-700"
          >
            Details
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today's Jobs Progress */}
        <div className="rounded-2xl bg-brand-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-accent">Today&apos;s Progress</p>
            <span className="text-lg font-bold text-brand-600">
              {data.completedJobsToday}/{data.totalJobsToday}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-100">
            <div 
              className="h-full rounded-full bg-brand-500 transition-all duration-500"
              style={{ width: `${data.totalJobsToday > 0 ? (data.completedJobsToday / data.totalJobsToday) * 100 : 0}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.pendingJobs} jobs pending assignment
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-green-50 p-4 text-center shadow-xs">
            <p className="text-2xl font-bold text-green-600">{formatMetric(data.npsScore)}</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-green-700 mt-1">NPS Score</p>
          </div>
          <div className="rounded-2xl bg-brand-50 p-4 text-center shadow-xs">
            <p className="text-2xl font-bold text-brand-600">{formatMetric(data.cleanerUtilization, "%")}</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 mt-1">Utilization</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4 text-center shadow-xs">
            <p className="text-2xl font-bold text-amber-600">{formatMetric(data.rescheduleRate, "%")}</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mt-1">Reschedule</p>
          </div>
          <div className="rounded-2xl bg-red-50 p-4 text-center shadow-xs">
            <p className="text-2xl font-bold text-red-600">{formatMetric(data.churnRate, "%")}</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-red-700 mt-1">Churn Rate</p>
          </div>
        </div>

        {/* Customer Stats */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customers</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Customers</span>
            <span className="font-semibold text-accent">{data.totalCustomers}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">New This Month</span>
            <span className="font-semibold text-green-600">+{data.newCustomersThisMonth}</span>
          </div>
        </div>

        {/* Team Stats */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Active Cleaners</span>
            <span className="font-semibold text-accent">{data.activeCleaners}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Avg Rating</span>
            <span className="font-semibold text-accent">⭐ {data.avgCleanerRating.toFixed(1)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Jobs/Cleaner</span>
            <span className="font-semibold text-accent">{data.avgJobsPerCleaner.toFixed(1)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
