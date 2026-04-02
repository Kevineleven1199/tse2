"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DollarSign,
  Clock,
  Users,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Check,
  Plus,
  Edit3,
  Trash2,
  FileText,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { cn, formatCurrency } from "@/src/lib/utils";
import { TimesheetTable } from "./TimesheetTable";
import { AdjustmentForm } from "./AdjustmentForm";

type CleanerInfo = {
  id: string;
  name: string;
  hourlyRate: number;
};

type PayrollSummary = {
  cleanerId: string;
  cleanerName: string;
  hourlyRate: number;
  totalHours: number;
  grossPay: number;
  deductions: number;
  reimbursements: number;
  bonuses: number;
  netPay: number;
  timesheets: TimesheetEntry[];
  adjustments: AdjustmentEntry[];
  period: { start: string; end: string; label: string };
};

type TimesheetEntry = {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  hoursWorked: number | null;
  source: string;
  notes: string | null;
  approved: boolean;
};

type AdjustmentEntry = {
  id: string;
  type: string;
  amount: number;
  description: string;
};

type Props = {
  isAdmin: boolean;
  cleaners: CleanerInfo[];
  currentUserId: string;
};

// Stats Card Component
const StatsCard = ({
  icon: Icon,
  title,
  value,
  subtitle,
  highlight = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  subtitle?: string;
  highlight?: boolean;
}) => (
  <Card
    className={cn(
      "flex flex-col justify-between rounded-2xl border",
      highlight
        ? "border-green-200 bg-gradient-to-br from-green-50 to-emerald-50"
        : "border-brand-100 bg-white"
    )}
  >
    <CardContent className="pt-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p
            className={cn(
              "mt-2 text-2xl font-bold",
              highlight ? "text-green-700" : "text-accent"
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div
          className={cn(
            "rounded-lg p-3",
            highlight ? "bg-green-100" : "bg-brand-50"
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              highlight ? "text-green-600" : "text-brand-600"
            )}
          />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Status Badge Component
const StatusBadge = ({
  status,
}: {
  status: "pending" | "approved" | "finalized";
}) => {
  const styles = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-green-50 text-green-700 border-green-200",
    finalized: "bg-blue-50 text-blue-700 border-blue-200",
  };

  const labels = {
    pending: "Pending",
    approved: "Approved",
    finalized: "Finalized",
  };

  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-semibold",
        styles[status]
      )}
    >
      {labels[status]}
    </span>
  );
};

// Team Table Row Component
const TeamTableRow = ({
  data,
  isEditing,
  onEditRate,
  onSaveRate,
  onCancelEdit,
  isAdmin,
}: {
  data: PayrollSummary;
  isEditing: boolean;
  onEditRate: () => void;
  onSaveRate: (rate: number) => void;
  onCancelEdit: () => void;
  isAdmin: boolean;
}) => {
  const [rateValue, setRateValue] = useState(data.hourlyRate.toString());

  const handleSave = () => {
    const rate = parseFloat(rateValue);
    if (!isNaN(rate) && rate > 0) {
      onSaveRate(rate);
    }
  };

  return (
    <tr className="border-t border-brand-100 hover:bg-brand-50/50 transition-colors">
      <td className="px-6 py-4">
        <span className="font-medium text-accent">{data.cleanerName}</span>
      </td>
      <td className="px-6 py-4 text-right">
        {isEditing ? (
          <div className="flex items-center justify-end gap-2">
            <span className="text-muted-foreground">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={rateValue}
              onChange={(e) => setRateValue(e.target.value)}
              className="w-20 rounded-lg border border-brand-200 px-2 py-1 text-right text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              autoFocus
            />
            <span className="text-muted-foreground">/hr</span>
            <button
              onClick={handleSave}
              className="rounded-lg p-1.5 text-green-600 hover:bg-green-50"
              title="Save"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={onCancelEdit}
              className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
              title="Cancel"
            >
              <AlertCircle className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onEditRate}
            className="group inline-flex items-center gap-2 text-accent hover:text-brand-600 transition"
          >
            ${data.hourlyRate.toFixed(2)}/hr
            <Edit3 className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </td>
      <td className="px-6 py-4 text-right text-sm text-muted-foreground">
        {data.totalHours.toFixed(1)} h
      </td>
      <td className="px-6 py-4 text-right font-semibold text-accent">
        {formatCurrency(data.grossPay)}
      </td>
      <td className="px-6 py-4 text-right">
        <span className="inline-flex items-center gap-1">
          {data.deductions > 0 && (
            <span className="text-xs text-red-600">
              -{formatCurrency(data.deductions)}
            </span>
          )}
          {data.reimbursements > 0 && (
            <span className="text-xs text-green-600">
              +{formatCurrency(data.reimbursements)}
            </span>
          )}
          {data.bonuses > 0 && (
            <span className="text-xs text-blue-600">
              +{formatCurrency(data.bonuses)}
            </span>
          )}
          {data.deductions === 0 &&
            data.reimbursements === 0 &&
            data.bonuses === 0 && (
              <span className="text-xs text-muted-foreground">—</span>
            )}
        </span>
      </td>
      <td className="px-6 py-4 text-right font-bold text-green-600">
        {formatCurrency(data.netPay)}
      </td>
      <td className="px-6 py-4 text-center">
        <StatusBadge status={data.timesheets.some((t) => !t.approved) ? "pending" : "approved"} />
      </td>
    </tr>
  );
};

export const PayrollDashboard = ({ isAdmin, cleaners, currentUserId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [payrollData, setPayrollData] = useState<PayrollSummary | null>(null);
  const [teamData, setTeamData] = useState<PayrollSummary[]>([]);
  const [selectedCleaner, setSelectedCleaner] = useState<string>(
    cleaners[0]?.id ?? ""
  );
  const [viewMode, setViewMode] = useState<"team" | "individual">(
    isAdmin ? "team" : "individual"
  );
  const [periodOffset, setPeriodOffset] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [generatingPaystubs, setGeneratingPaystubs] = useState(false);
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [editingAdjustment, setEditingAdjustment] = useState<AdjustmentEntry | null>(null);
  const [editingRate, setEditingRate] = useState<string | null>(null);

  const getPeriodDates = (offset: number) => {
    const now = new Date();
    let month = now.getMonth();
    let year = now.getFullYear();
    const isFirstHalf = now.getDate() <= 15;
    let half = isFirstHalf ? 0 : 1;
    let totalHalves = half + offset;
    month += Math.floor(totalHalves / 2);
    half = ((totalHalves % 2) + 2) % 2;
    while (month < 0) {
      month += 12;
      year--;
    }
    while (month > 11) {
      month -= 12;
      year++;
    }
    if (half === 0) {
      return {
        start: new Date(year, month, 1).toISOString(),
        end: new Date(year, month, 15, 23, 59, 59).toISOString(),
      };
    } else {
      const lastDay = new Date(year, month + 1, 0).getDate();
      return {
        start: new Date(year, month, 16).toISOString(),
        end: new Date(year, month, lastDay, 23, 59, 59).toISOString(),
      };
    }
  };

  const loadPayroll = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getPeriodDates(periodOffset);
      const periodParams = `&periodStart=${encodeURIComponent(start)}&periodEnd=${encodeURIComponent(end)}`;

      if (isAdmin && viewMode === "team") {
        const res = await fetch(`/api/employee/payroll?all=true${periodParams}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as { team: PayrollSummary[] };
          setTeamData(data.team);
        }
      } else {
        const cid = isAdmin ? selectedCleaner : "";
        const base = cid
          ? `/api/employee/payroll?cleanerId=${cid}`
          : "/api/employee/payroll?_=1";
        const res = await fetch(`${base}${periodParams}`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as PayrollSummary;
          setPayrollData(data);
        }
      }
    } catch (err) {
      console.error("Failed to load payroll:", err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, viewMode, selectedCleaner, periodOffset]);

  useEffect(() => {
    void loadPayroll();
  }, [loadPayroll]);

  const handleSyncTimesheets = async () => {
    setSyncing(true);
    try {
      await fetch("/api/integrations/jobber/sync-timesheets", {
        method: "POST",
      });
      await loadPayroll();
    } finally {
      setSyncing(false);
    }
  };

  const handleApproveTimesheet = async (id: string) => {
    await fetch(`/api/employee/timesheets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: true }),
    });
    await loadPayroll();
  };

  const handleApproveAll = async () => {
    const unapproved =
      viewMode === "team"
        ? teamData.flatMap((p) => p.timesheets.filter((t) => !t.approved))
        : payrollData?.timesheets.filter((t) => !t.approved) ?? [];

    await Promise.all(
      unapproved.map((t) =>
        fetch(`/api/employee/timesheets/${t.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approved: true }),
        })
      )
    );
    await loadPayroll();
  };

  const handleDeleteTimesheet = async (id: string) => {
    if (!confirm("Delete this timesheet entry?")) return;
    await fetch(`/api/employee/timesheets/${id}`, { method: "DELETE" });
    await loadPayroll();
  };

  const handleDeleteAdjustment = async (id: string) => {
    if (!confirm("Delete this adjustment?")) return;
    await fetch(`/api/employee/payroll-adjustments/${id}`, {
      method: "DELETE",
    });
    if (editingAdjustment?.id === id) {
      setEditingAdjustment(null);
      setShowAdjustmentForm(false);
    }
    await loadPayroll();
  };

  const handleUpdateRate = async (cleanerId: string, rate: number) => {
    await fetch(`/api/employee/${cleanerId}/pay-rate`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hourlyRate: rate }),
    });
    setEditingRate(null);
    await loadPayroll();
  };

  const handleGeneratePaystubs = async () => {
    setGeneratingPaystubs(true);
    try {
      const { start, end } = getPeriodDates(periodOffset);
      const targets =
        viewMode === "team"
          ? cleaners
          : [{ id: selectedCleaner, name: "", hourlyRate: 0 }];
      await Promise.all(
        targets.map((c) =>
          fetch("/api/employee/paystubs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cleanerId: c.id,
              periodStart: start,
              periodEnd: end,
            }),
          })
        )
      );
      alert("Paystubs generated successfully!");
    } catch (err) {
      console.error("Failed to generate paystubs:", err);
      alert("Failed to generate paystubs");
    } finally {
      setGeneratingPaystubs(false);
    }
  };

  const handleEditAdjustment = (entry: AdjustmentEntry) => {
    setEditingAdjustment(entry);
    setShowAdjustmentForm(true);
  };

  const handleAdjustmentCreated = () => {
    setShowAdjustmentForm(false);
    setEditingAdjustment(null);
    void loadPayroll();
  };

  const handleExportCSV = async () => {
    const { start, end } = getPeriodDates(periodOffset);
    window.location.href = `/api/admin/payroll/export?from=${encodeURIComponent(start)}&to=${encodeURIComponent(end)}`;
  };

  if (loading && !payrollData && teamData.length === 0) {
    return (
      <div className="flex items-center justify-center gap-3 py-24 text-accent">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-lg">Loading payroll…</span>
      </div>
    );
  }

  const currentPeriod = payrollData?.period || teamData[0]?.period;
  const totalPayroll = teamData.reduce((sum, p) => sum + p.netPay, 0);
  const totalHours = teamData.reduce((sum, p) => sum + p.totalHours, 0);
  const pendingCount = teamData.reduce(
    (sum, p) => sum + p.timesheets.filter((t) => !t.approved).length,
    0
  );

  return (
    <div className="space-y-6 px-0 py-0">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 px-6 py-12 sm:px-10 sm:py-16 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-white" />
          <div className="absolute -left-20 bottom-0 h-60 w-60 rounded-full bg-white" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Payroll Management
          </h1>
          <p className="mt-2 text-lg opacity-95">
            Manage team compensation, timesheets, and pay runs
          </p>

          {/* Control Bar */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Period Navigation */}
            <div className="flex items-center gap-3 rounded-full bg-white/15 p-1 backdrop-blur-sm">
              <button
                onClick={() => setPeriodOffset((p) => p - 1)}
                className="rounded-full p-2 hover:bg-white/20 transition"
                title="Previous period"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="min-w-[140px] text-center text-sm font-semibold">
                {currentPeriod?.label || "Current Period"}
                {periodOffset === 0 && (
                  <span className="ml-2 inline-block rounded-full bg-green-400/80 px-2 py-0.5 text-xs font-bold text-green-900">
                    Current
                  </span>
                )}
              </span>
              <button
                onClick={() => setPeriodOffset((p) => Math.min(p + 1, 0))}
                disabled={periodOffset >= 0}
                className="rounded-full p-2 hover:bg-white/20 disabled:opacity-30 transition"
                title="Next period"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Action Buttons */}
            {isAdmin && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleSyncTimesheets}
                  disabled={syncing}
                  className="inline-flex items-center gap-2 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-50 px-4 py-2 text-sm font-semibold transition"
                >
                  <RefreshCw
                    className={cn("h-4 w-4", syncing && "animate-spin")}
                  />
                  Sync Payroll
                </button>
                <button
                  onClick={handleApproveAll}
                  className="inline-flex items-center gap-2 rounded-full bg-white/20 hover:bg-white/30 px-4 py-2 text-sm font-semibold transition"
                >
                  <Check className="h-4 w-4" />
                  Approve All
                </button>
                <button
                  onClick={handleGeneratePaystubs}
                  disabled={generatingPaystubs}
                  className="inline-flex items-center gap-2 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-50 px-4 py-2 text-sm font-semibold transition"
                >
                  <FileText className="h-4 w-4" />
                  {generatingPaystubs ? "Generating…" : "Generate Paystubs"}
                </button>
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-2 rounded-full bg-white/20 hover:bg-white/30 px-4 py-2 text-sm font-semibold transition"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Overview */}
      {isAdmin && viewMode === "team" && (
        <>
          {/* Stats Dashboard */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              icon={DollarSign}
              title="Total Payroll"
              value={formatCurrency(totalPayroll)}
              subtitle={currentPeriod?.label || "This period"}
              highlight
            />
            <StatsCard
              icon={Clock}
              title="Total Hours"
              value={`${totalHours.toFixed(1)}h`}
              subtitle="Team hours"
            />
            <StatsCard
              icon={Users}
              title="Active Employees"
              value={cleaners.length.toString()}
              subtitle="On payroll"
            />
            <StatsCard
              icon={AlertCircle}
              title="Pending Approvals"
              value={pendingCount.toString()}
              subtitle="Timesheets to approve"
            />
          </div>

          {/* Team Table */}
          <Card className="rounded-2xl border border-brand-100 bg-white shadow-sm">
            <CardHeader className="border-b border-brand-100 px-6 py-4">
              <h2 className="text-xl font-bold text-accent">Team Overview</h2>
            </CardHeader>
            <CardContent className="p-0">
              {teamData.length === 0 ? (
                <div className="flex items-center justify-center rounded-2xl px-6 py-12 text-center text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium">No payroll data</p>
                    <p className="mt-1 text-xs">
                      Sync timesheets from Jobber to get started
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-brand-100 bg-brand-50/50">
                        <th className="px-6 py-3 text-left font-semibold text-accent">
                          Employee
                        </th>
                        <th className="px-6 py-3 text-right font-semibold text-accent">
                          Hourly Rate
                        </th>
                        <th className="px-6 py-3 text-right font-semibold text-accent">
                          Hours
                        </th>
                        <th className="px-6 py-3 text-right font-semibold text-accent">
                          Gross Pay
                        </th>
                        <th className="px-6 py-3 text-right font-semibold text-accent">
                          Adjustments
                        </th>
                        <th className="px-6 py-3 text-right font-semibold text-accent">
                          Net Pay
                        </th>
                        <th className="px-6 py-3 text-center font-semibold text-accent">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamData.map((item) => (
                        <TeamTableRow
                          key={item.cleanerId}
                          data={item}
                          isEditing={editingRate === item.cleanerId}
                          onEditRate={() => setEditingRate(item.cleanerId)}
                          onSaveRate={(rate) =>
                            handleUpdateRate(item.cleanerId, rate)
                          }
                          onCancelEdit={() => setEditingRate(null)}
                          isAdmin={isAdmin}
                        />
                      ))}
                    </tbody>
                  </table>

                  {/* Totals Row */}
                  <div className="border-t-2 border-brand-200 bg-brand-50/80 px-6 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-bold text-accent">Totals</span>
                      <div className="flex gap-8 text-right">
                        <span className="min-w-[80px] text-sm text-muted-foreground">
                          {totalHours.toFixed(1)}h
                        </span>
                        <span className="min-w-[100px] text-sm font-semibold text-accent">
                          {formatCurrency(
                            teamData.reduce((sum, p) => sum + p.grossPay, 0)
                          )}
                        </span>
                        <span className="min-w-[100px] text-sm text-muted-foreground">
                          —
                        </span>
                        <span className="min-w-[100px] text-sm font-bold text-green-600">
                          {formatCurrency(totalPayroll)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Individual View */}
      {(viewMode === "individual" || !isAdmin) && payrollData && (
        <>
          {/* Cleaner Selector (Admin Only) */}
          {isAdmin && viewMode === "individual" && (
            <Card className="rounded-2xl border border-brand-100 bg-white">
              <CardContent className="pt-6">
                <label className="block text-sm font-semibold text-accent mb-2">
                  Select Employee
                </label>
                <select
                  value={selectedCleaner}
                  onChange={(e) => setSelectedCleaner(e.target.value)}
                  className="w-full sm:w-64 rounded-lg border border-brand-200 bg-white px-4 py-2 text-accent focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                >
                  {cleaners.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (${c.hourlyRate.toFixed(2)}/hr)
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>
          )}

          {/* Summary Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              icon={Clock}
              title="Hours Worked"
              value={`${payrollData.totalHours.toFixed(1)}h`}
              subtitle={payrollData.period.label}
            />
            <StatsCard
              icon={DollarSign}
              title="Hourly Rate"
              value={`$${payrollData.hourlyRate.toFixed(2)}/hr`}
              subtitle="Current rate"
            />
            <StatsCard
              icon={DollarSign}
              title="Gross Pay"
              value={formatCurrency(payrollData.grossPay)}
              subtitle={`${payrollData.totalHours.toFixed(1)}h × $${payrollData.hourlyRate.toFixed(2)}`}
            />
            <StatsCard
              icon={DollarSign}
              title="Net Pay"
              value={formatCurrency(payrollData.netPay)}
              subtitle="After adjustments"
              highlight
            />
          </div>

          {/* Timesheets */}
          <Card className="rounded-2xl border border-brand-100 bg-white">
            <CardHeader className="border-b border-brand-100 px-6 py-4">
              <h2 className="text-xl font-bold text-accent">Timesheets</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {payrollData.period.label}
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <TimesheetTable
                timesheets={payrollData.timesheets}
                isAdmin={isAdmin}
                onApprove={handleApproveTimesheet}
                onDelete={handleDeleteTimesheet}
              />
            </CardContent>
          </Card>

          {/* Adjustments */}
          <Card className="rounded-2xl border border-brand-100 bg-white">
            <CardHeader className="border-b border-brand-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-accent">Adjustments</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Bonuses, deductions, and reimbursements
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowAdjustmentForm(!showAdjustmentForm)}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-50 hover:bg-brand-100 border border-brand-200 px-4 py-2 text-sm font-semibold text-accent transition"
                >
                  <Plus className="h-4 w-4" />
                  Add Adjustment
                </button>
              )}
            </CardHeader>
            <CardContent className="pt-6">
              {showAdjustmentForm && isAdmin && (
                <div className="mb-6 rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
                  <AdjustmentForm
                    cleanerId={payrollData.cleanerId}
                    periodStart={payrollData.period.start}
                    periodEnd={payrollData.period.end}
                    adjustment={
                      editingAdjustment
                        ? {
                            id: editingAdjustment.id,
                            type: editingAdjustment.type as
                              | "deduction"
                              | "reimbursement"
                              | "bonus",
                            amount: editingAdjustment.amount,
                            description: editingAdjustment.description,
                          }
                        : null
                    }
                    onSaved={handleAdjustmentCreated}
                    onCancel={() => {
                      setShowAdjustmentForm(false);
                      setEditingAdjustment(null);
                    }}
                  />
                </div>
              )}

              {payrollData.adjustments.length === 0 ? (
                <div className="rounded-2xl border border-brand-100 px-6 py-8 text-center text-sm text-muted-foreground">
                  No adjustments for this period
                </div>
              ) : (
                <div className="space-y-3">
                  {payrollData.adjustments.map((adj) => {
                    const typeColors = {
                      deduction: { bg: "bg-red-50", text: "text-red-700", badge: "bg-red-100" },
                      reimbursement: {
                        bg: "bg-green-50",
                        text: "text-green-700",
                        badge: "bg-green-100",
                      },
                      bonus: {
                        bg: "bg-blue-50",
                        text: "text-blue-700",
                        badge: "bg-blue-100",
                      },
                    };
                    const colors =
                      typeColors[adj.type as keyof typeof typeColors] ||
                      typeColors.deduction;

                    return (
                      <div
                        key={adj.id}
                        className={cn(
                          "flex items-center justify-between rounded-xl border border-brand-100 px-4 py-3 hover:bg-brand-50/50 transition",
                          colors.bg
                        )}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span
                            className={cn(
                              "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider",
                              colors.badge,
                              colors.text
                            )}
                          >
                            {adj.type}
                          </span>
                          <span className="text-sm font-medium text-accent">
                            {adj.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "text-sm font-bold whitespace-nowrap",
                              adj.type === "deduction"
                                ? "text-red-600"
                                : "text-green-600"
                            )}
                          >
                            {adj.type === "deduction" ? "−" : "+"}
                            {formatCurrency(adj.amount)}
                          </span>
                          {isAdmin && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditAdjustment(adj)}
                                className="rounded-lg p-1.5 text-accent hover:bg-brand-200/30 transition"
                                title="Edit"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteAdjustment(adj.id)}
                                className="rounded-lg p-1.5 text-red-400 hover:bg-red-100/30 transition"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Net Pay Breakdown */}
              <div className="mt-6 space-y-3 rounded-2xl bg-gradient-to-br from-accent/5 to-brand-50 px-6 py-4 border border-brand-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-accent">
                    Gross Pay
                  </span>
                  <span className="text-sm font-bold text-accent">
                    {formatCurrency(payrollData.grossPay)}
                  </span>
                </div>
                {payrollData.deductions > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Deductions
                    </span>
                    <span className="text-sm font-semibold text-red-600">
                      −{formatCurrency(payrollData.deductions)}
                    </span>
                  </div>
                )}
                {payrollData.reimbursements > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Reimbursements
                    </span>
                    <span className="text-sm font-semibold text-green-600">
                      +{formatCurrency(payrollData.reimbursements)}
                    </span>
                  </div>
                )}
                {payrollData.bonuses > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Bonuses
                    </span>
                    <span className="text-sm font-semibold text-blue-600">
                      +{formatCurrency(payrollData.bonuses)}
                    </span>
                  </div>
                )}
                <div className="border-t border-brand-200 pt-3 flex items-center justify-between">
                  <span className="text-base font-bold text-accent">
                    Net Pay
                  </span>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(payrollData.netPay)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
