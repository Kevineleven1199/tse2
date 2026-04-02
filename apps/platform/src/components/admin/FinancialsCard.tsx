"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { formatCurrency } from "@/src/lib/utils";
import type { ProfitLossData } from "@/src/lib/admin-portal";

/**
 * FinancialsCard - ADMIN ONLY
 * Shows full P&L including profit margins
 * This component should NEVER be rendered for MANAGER, CLEANER, or CLIENT roles
 */

type FinancialsCardProps = {
  data: ProfitLossData;
};

export const FinancialsCard = ({ data }: FinancialsCardProps) => {
  const { revenue, expenses, grossProfit, grossMargin, netProfit, netMargin } = data;
  const formatCurrencyOrDash = (value: number | null) =>
    value === null ? "—" : formatCurrency(value);
  const formatPercentOrDash = (value: number | null) =>
    value === null ? "—" : `${value.toFixed(1)}%`;

  return (
    <Card className="rounded-2xl bg-white lg:col-span-2 shadow-sm card-hover">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-accent">Profit & Loss</h2>
            <p className="text-xs text-muted-foreground">Month to Date</p>
          </div>
          <Link 
            href="/admin"
            className="text-xs font-semibold uppercase tracking-wider text-brand-600 hover:text-brand-700"
          >
            Full Report
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Revenue Section */}
        <div className="rounded-2xl bg-gradient-to-br from-green-500 to-green-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-green-100">Total Revenue</p>
              <p className="text-3xl font-bold">{formatCurrency(revenue.thisMonth)}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${
                revenue.mtdGrowth === null || revenue.mtdGrowth >= 0 ? "text-green-100" : "text-red-200"
              }`}>
                {revenue.mtdGrowth === null
                  ? "—"
                  : `${revenue.mtdGrowth >= 0 ? "↑" : "↓"} ${Math.abs(revenue.mtdGrowth).toFixed(1)}%`}
              </p>
              <p className="text-xs text-green-200">vs last month</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-green-400/30 pt-3">
            <div>
              <p className="text-xs text-green-200">Today</p>
              <p className="font-semibold">{formatCurrency(revenue.today)}</p>
            </div>
            <div>
              <p className="text-xs text-green-200">This Week</p>
              <p className="font-semibold">{formatCurrency(revenue.thisWeek)}</p>
            </div>
            <div>
              <p className="text-xs text-green-200">YTD</p>
              <p className="font-semibold">{formatCurrency(revenue.thisYear)}</p>
            </div>
          </div>
        </div>

        {/* Expenses Breakdown */}
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-red-800">Total Expenses</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(expenses.total)}</p>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-red-700">Labor</span>
              <span className="font-medium text-red-800">{formatCurrency(expenses.laborCosts)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-red-700">Marketing</span>
              <span className="font-medium text-red-800">{formatCurrency(expenses.marketing)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-red-700">Supplies</span>
              <span className="font-medium text-red-800">{formatCurrency(expenses.supplies)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-red-700">Software</span>
              <span className="font-medium text-red-800">{formatCurrency(expenses.software)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-red-700">Insurance</span>
              <span className="font-medium text-red-800">{formatCurrency(expenses.insurance)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-red-700">Other</span>
              <span className="font-medium text-red-800">{formatCurrency(expenses.other)}</span>
            </div>
          </div>
        </div>

        {/* Profit Metrics - ADMIN ONLY */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-brand-50 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Gross Profit</p>
            <p className="text-2xl font-bold text-accent">{formatCurrency(grossProfit)}</p>
            <p className="text-sm text-green-600">{formatPercentOrDash(grossMargin)} margin</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 p-4 text-white">
            <p className="text-xs uppercase tracking-wider text-brand-100">Net Profit</p>
            <p className="text-2xl font-bold">{formatCurrency(netProfit)}</p>
            <p className="text-sm text-brand-100">{formatPercentOrDash(netMargin)} margin</p>
          </div>
        </div>

        {/* Projections */}
        <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Projections</p>
          <div className="mt-2 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Month End Forecast</p>
              <p className="text-lg font-bold text-accent">{formatCurrencyOrDash(data.projectedMonthEnd)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Year End Forecast</p>
              <p className="text-lg font-bold text-accent">{formatCurrencyOrDash(data.projectedYearEnd)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
