"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  FileText,
  Calendar,
  X,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { cn, formatCurrency } from "@/src/lib/utils";
import { parseCsv } from "@/src/lib/csv";

type PeriodType = "month" | "lastMonth" | "quarter" | "year" | "custom";

type PnLData = {
  period: { start: string; end: string; label: string };
  revenue: { jobRevenue: number; totalRevenue: number };
  costOfServices: {
    labor: number;
    supplies: number;
    fuel: number;
    equipment: number;
    totalCOS: number;
  };
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: {
    marketing: number;
    software: number;
    insurance: number;
    other: number;
    totalOpEx: number;
  };
  operatingIncome: number;
  operatingMargin: number;
  netIncome: number;
  netMargin: number;
  comparison: {
    prevRevenue: number;
    prevNetIncome: number;
    revenueChange: number;
    netIncomeChange: number;
  };
  monthlyTrend: {
    month: string;
    revenue: number;
    expenses: number;
    netIncome: number;
  }[];
  topExpenseCategories: {
    category: string;
    amount: number;
    percentage: number;
  }[];
};

type Expense = {
  id: string;
  category: string;
  vendor: string;
  description: string;
  amount: number;
  date: string;
};

export const PnLDashboard = () => {
  const [period, setPeriod] = useState<PeriodType>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [pnlData, setPnlData] = useState<PnLData | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvImportMessage, setCsvImportMessage] = useState<string | null>(null);
  const [csvImportError, setCsvImportError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: "other",
    vendor: "",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });

  // Fetch P&L data
  useEffect(() => {
    const fetchPnLData = async () => {
      setLoading(true);
      try {
        const periodParam =
          period === "month"
            ? "month"
            : period === "lastMonth"
              ? "lastMonth"
              : period === "quarter"
                ? "quarter"
                : period === "year"
                  ? "year"
                  : "custom";

        let url = `/api/admin/pnl?period=${periodParam}`;
        if (period === "custom" && customStart && customEnd) {
          url += `&startDate=${customStart}&endDate=${customEnd}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch P&L data");
        const data = await response.json();
        setPnlData(data);
      } catch (error) {
        console.error("Error fetching P&L data:", error);
        setFetchError("Failed to load P&L data. Please try refreshing.");
      } finally {
        setLoading(false);
      }
    };

    if (period !== "custom" || (customStart && customEnd)) {
      fetchPnLData();
    }
  }, [period, customStart, customEnd, refreshToken]);

  // Fetch expenses
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        if (!pnlData) return;
        const response = await fetch(
          `/api/admin/expenses?startDate=${pnlData.period.start}&endDate=${pnlData.period.end}`
        );
        if (!response.ok) throw new Error("Failed to fetch expenses");
        const data = await response.json();
        const expenseRows = Array.isArray(data) ? data : data.expenses ?? [];
        setExpenses(expenseRows);
      } catch (error) {
        console.error("Error fetching expenses:", error);
      }
    };

    fetchExpenses();
  }, [pnlData?.period, refreshToken]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.vendor || !formData.category) return;

    try {
      const endpoint = editingExpense
        ? `/api/admin/expenses/${editingExpense.id}`
        : `/api/admin/expenses`;
      const method = editingExpense ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      if (!response.ok) throw new Error("Failed to save expense");
      const savedExpense = await response.json();

      if (editingExpense) {
        setExpenses(
          expenses.map((e) => (e.id === editingExpense.id ? savedExpense : e))
        );
      } else {
        setExpenses([...expenses, savedExpense]);
      }
      setRefreshToken((value) => value + 1);

      setFormData({
        category: "other",
        vendor: "",
        description: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
      });
      setShowAddExpense(false);
      setEditingExpense(null);
    } catch (error) {
      console.error("Error saving expense:", error);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/expenses/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete expense");
      setExpenses(expenses.filter((e) => e.id !== id));
      setRefreshToken((value) => value + 1);
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      vendor: expense.vendor,
      description: expense.description,
      amount: expense.amount.toString(),
      date: expense.date,
    });
    setShowAddExpense(true);
  };

  const resetForm = () => {
    setFormData({
      category: "other",
      vendor: "",
      description: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
    });
    setShowAddExpense(false);
    setEditingExpense(null);
  };

  const handleImportCsv = async (file: File) => {
    setCsvImportMessage(null);
    setCsvImportError(null);
    setCsvImporting(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);

      if (rows.length === 0) {
        throw new Error("The CSV file is empty or missing data rows.");
      }

      const response = await fetch("/api/admin/expenses/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to import CSV");
      }

      setCsvImportMessage(
        `Imported ${result.created} new expenses, updated ${result.updated}, skipped ${result.skipped}.`
      );
      setRefreshToken((value) => value + 1);
    } catch (error) {
      setCsvImportError(
        error instanceof Error ? error.message : "Failed to import expenses CSV."
      );
    } finally {
      setCsvImporting(false);
    }
  };

  if (loading || !pnlData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const maxExpense = Math.max(
    ...(pnlData.topExpenseCategories.map((e) => e.amount) || [1])
  );

  return (
    <div className="space-y-6">
      {fetchError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {fetchError}
          <button onClick={() => { setFetchError(null); setRefreshToken((t) => t + 1); }} className="ml-3 font-semibold underline">
            Retry
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profit & Loss</h1>
          <p className="text-sm text-gray-600">{pnlData.period.label}</p>
        </div>
        <FileText className="h-8 w-8 text-accent" />
      </div>

      {/* Period Selector */}
      <Card className="bg-white">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {[
                { value: "month" as PeriodType, label: "This Month" },
                { value: "lastMonth" as PeriodType, label: "Last Month" },
                { value: "quarter" as PeriodType, label: "This Quarter" },
                { value: "year" as PeriodType, label: "This Year" },
                { value: "custom" as PeriodType, label: "Custom" },
              ].map((btn) => (
                <button
                  key={btn.value}
                  onClick={() => setPeriod(btn.value)}
                  className={cn(
                    "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-all",
                    period === btn.value
                      ? "bg-accent text-white"
                      : "border border-gray-300 bg-white text-gray-700 hover:border-accent hover:text-accent"
                  )}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {period === "custom" && (
              <div className="flex flex-col gap-3 rounded-2xl bg-gray-50 p-4 sm:flex-row">
                <div className="flex-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* P&L Statement - Accounting Format */}
      <Card className="bg-white">
        <CardHeader className="pb-4">
          <h2 className="text-xl font-semibold text-gray-900">P&L Statement</h2>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Revenue Section */}
          <div className="space-y-3 border-b border-gray-200 pb-6">
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">Job Revenue</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(pnlData.revenue.jobRevenue)}
              </span>
            </div>
            <div className="flex justify-between border-b-2 border-gray-400 pb-2">
              <span className="text-sm font-semibold text-gray-900">
                Total Revenue
              </span>
              <span className="text-sm font-bold text-gray-900">
                {formatCurrency(pnlData.revenue.totalRevenue)}
              </span>
            </div>
          </div>

          {/* Cost of Services Section */}
          <div className="space-y-3 border-b border-gray-200 pb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-700">
              Cost of Services
            </p>
            <div className="space-y-2 pl-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-700">Labor</span>
                <span className="text-sm text-gray-900">
                  {formatCurrency(pnlData.costOfServices.labor)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-700">Supplies</span>
                <span className="text-sm text-gray-900">
                  {formatCurrency(pnlData.costOfServices.supplies)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-700">Fuel</span>
                <span className="text-sm text-gray-900">
                  {formatCurrency(pnlData.costOfServices.fuel)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-700">Equipment</span>
                <span className="text-sm text-gray-900">
                  {formatCurrency(pnlData.costOfServices.equipment)}
                </span>
              </div>
            </div>
            <div className="flex justify-between border-b-2 border-gray-400 pb-2">
              <span className="text-sm font-semibold text-gray-900">
                Total Cost of Services
              </span>
              <span className="text-sm font-bold text-gray-900">
                {formatCurrency(pnlData.costOfServices.totalCOS)}
              </span>
            </div>
          </div>

          {/* Gross Profit */}
          <div className="flex justify-between rounded-2xl bg-gradient-to-r from-green-50 to-green-100 px-4 py-3">
            <span className="text-sm font-bold text-gray-900">Gross Profit</span>
            <div className="text-right">
              <p className="text-sm font-bold text-green-700">
                {formatCurrency(pnlData.grossProfit)}
              </p>
              <p className="text-xs text-green-600">
                {pnlData.grossMargin.toFixed(1)}% margin
              </p>
            </div>
          </div>

          {/* Operating Expenses Section */}
          <div className="space-y-3 border-b border-gray-200 pb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-700">
              Operating Expenses
            </p>
            <div className="space-y-2 pl-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-700">Marketing</span>
                <span className="text-sm text-gray-900">
                  {formatCurrency(pnlData.operatingExpenses.marketing)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-700">Software</span>
                <span className="text-sm text-gray-900">
                  {formatCurrency(pnlData.operatingExpenses.software)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-700">Insurance</span>
                <span className="text-sm text-gray-900">
                  {formatCurrency(pnlData.operatingExpenses.insurance)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-700">Other</span>
                <span className="text-sm text-gray-900">
                  {formatCurrency(pnlData.operatingExpenses.other)}
                </span>
              </div>
            </div>
            <div className="flex justify-between border-b-2 border-gray-400 pb-2">
              <span className="text-sm font-semibold text-gray-900">
                Total Operating Expenses
              </span>
              <span className="text-sm font-bold text-gray-900">
                {formatCurrency(pnlData.operatingExpenses.totalOpEx)}
              </span>
            </div>
          </div>

          {/* Operating Income */}
          <div className="flex justify-between rounded-2xl bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3">
            <span className="text-sm font-bold text-gray-900">
              Operating Income
            </span>
            <div className="text-right">
              <p className="text-sm font-bold text-blue-700">
                {formatCurrency(pnlData.operatingIncome)}
              </p>
              <p className="text-xs text-blue-600">
                {pnlData.operatingMargin.toFixed(1)}% margin
              </p>
            </div>
          </div>

          {/* Net Income - Highlighted */}
          <div
            className={cn(
              "flex justify-between rounded-3xl px-4 py-4 font-bold",
              pnlData.netIncome >= 0
                ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                : "bg-gradient-to-r from-red-500 to-red-600 text-white"
            )}
          >
            <span className="text-base">Net Income</span>
            <div className="text-right">
              <p className="text-lg">{formatCurrency(pnlData.netIncome)}</p>
              <p className="text-sm opacity-90">
                {pnlData.netMargin.toFixed(1)}% margin
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison vs Previous Period */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-600">
                  Revenue
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(pnlData.revenue.totalRevenue)}
                </p>
              </div>
              <div
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-2",
                  pnlData.comparison.revenueChange >= 0
                    ? "bg-green-100"
                    : "bg-red-100"
                )}
              >
                {pnlData.comparison.revenueChange >= 0 ? (
                  <ArrowUpRight className="h-5 w-5 text-green-600" />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-red-600" />
                )}
                <span
                  className={cn(
                    "text-sm font-semibold",
                    pnlData.comparison.revenueChange >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  )}
                >
                  {Math.abs(pnlData.comparison.revenueChange).toFixed(1)}%
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              vs previous period: {formatCurrency(pnlData.comparison.prevRevenue)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-600">
                  Net Income
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(pnlData.netIncome)}
                </p>
              </div>
              <div
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-2",
                  pnlData.comparison.netIncomeChange >= 0
                    ? "bg-green-100"
                    : "bg-red-100"
                )}
              >
                {pnlData.comparison.netIncomeChange >= 0 ? (
                  <ArrowUpRight className="h-5 w-5 text-green-600" />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-red-600" />
                )}
                <span
                  className={cn(
                    "text-sm font-semibold",
                    pnlData.comparison.netIncomeChange >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  )}
                >
                  {Math.abs(pnlData.comparison.netIncomeChange).toFixed(1)}%
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              vs previous period: {formatCurrency(pnlData.comparison.prevNetIncome)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Chart */}
      <Card className="bg-white">
        <CardHeader className="pb-4">
          <h3 className="text-lg font-semibold text-gray-900">6-Month Trend</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pnlData.monthlyTrend.map((month, idx) => {
              const maxValue = Math.max(
                ...pnlData.monthlyTrend.map((m) =>
                  Math.max(m.revenue, m.expenses)
                )
              );
              const revenuePercent = (month.revenue / maxValue) * 100;
              const expensesPercent = (month.expenses / maxValue) * 100;

              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">
                      {month.month}
                    </p>
                    <div className="flex gap-4 text-xs font-semibold">
                      <span className="text-green-600">
                        {formatCurrency(month.revenue)}
                      </span>
                      <span className="text-red-600">
                        {formatCurrency(month.expenses)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <div
                      className="h-8 rounded-full bg-gradient-to-r from-green-400 to-green-600"
                      style={{ width: `${revenuePercent}%` }}
                    />
                    <div
                      className="h-8 rounded-full bg-gradient-to-r from-red-400 to-red-600"
                      style={{ width: `${expensesPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex gap-6 border-t border-gray-200 pt-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gradient-to-r from-green-400 to-green-600" />
              <span className="text-xs font-medium text-gray-700">Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gradient-to-r from-red-400 to-red-600" />
              <span className="text-xs font-medium text-gray-700">Expenses</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense Breakdown */}
      <Card className="bg-white">
        <CardHeader className="pb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Expense Breakdown
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          {pnlData.topExpenseCategories.map((category, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  {category.category}
                </p>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(category.amount)}
                  </p>
                  <p className="text-xs text-gray-600">
                    {category.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-green-600"
                  style={{ width: `${category.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Add Expense */}
      <Card className="bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Expense Management
            </h3>
            {!showAddExpense && (
              <button
                onClick={() => setShowAddExpense(true)}
                className="rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-green-700 transition-all"
              >
                <Plus className="inline-block h-4 w-4 mr-1" />
                Add Expense
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-2xl border border-dashed border-accent/40 bg-brand-50/40 p-4">
            <p className="text-sm font-semibold text-accent">Upload Expense CSV</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Columns supported: `category`, `vendor`, `description`, `amount`, `date`, optional `id`.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent hover:bg-brand-50">
                <Upload className="h-4 w-4" />
                {csvImporting ? "Importing..." : "Upload CSV"}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  disabled={csvImporting}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.currentTarget.value = "";
                    if (file) {
                      void handleImportCsv(file);
                    }
                  }}
                />
              </label>
              {csvImportMessage && (
                <span className="text-xs font-medium text-green-700">{csvImportMessage}</span>
              )}
              {csvImportError && (
                <span className="text-xs font-medium text-red-600">{csvImportError}</span>
              )}
            </div>
          </div>

          {/* Add/Edit Expense Form */}
          {showAddExpense && (
            <div className="rounded-2xl border-2 border-accent bg-brand-50 p-6">
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none"
                    >
                      <option value="labor">Labor</option>
                      <option value="supplies">Supplies</option>
                      <option value="fuel">Fuel</option>
                      <option value="equipment">Equipment</option>
                      <option value="marketing">Marketing</option>
                      <option value="software">Software</option>
                      <option value="insurance">Insurance</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Vendor
                    </label>
                    <input
                      type="text"
                      value={formData.vendor}
                      onChange={(e) =>
                        setFormData({ ...formData, vendor: e.target.value })
                      }
                      placeholder="Vendor name"
                      className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="e.g., Weekly supplies purchase"
                    className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      placeholder="0.00"
                      className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Date
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-green-700 transition-all"
                  >
                    {editingExpense ? "Update Expense" : "Add Expense"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-700 hover:border-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Expenses Table */}
          {expenses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Vendor
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-900">
                        {new Date(expense.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {expense.vendor}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold capitalize text-brand-700">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {expense.description}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditExpense(expense)}
                            className="rounded-full p-2 text-gray-600 hover:bg-gray-200 transition-colors"
                            title="Edit"
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="rounded-full p-2 text-red-600 hover:bg-red-100 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl bg-gray-50 px-6 py-8 text-center">
              <DollarSign className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2 text-sm text-gray-600">
                No expenses recorded for this period
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
