"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Filter, RefreshCcw, Search, Users } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import type { PipelineBoardData, PipelineHouse, PipelineStageId } from "@/src/lib/pipeline";
import { cn, formatCurrency } from "@/src/lib/utils";

const toneStyles: Record<
  PipelineBoardData["columns"][number]["tone"],
  { border: string; badge: string; heading: string; chip: string }
> = {
  emerald: {
    border: "border-emerald-100",
    badge: "bg-emerald-50 text-emerald-700",
    heading: "text-emerald-900",
    chip: "bg-emerald-500/10 text-emerald-700"
  },
  amber: {
    border: "border-amber-100",
    badge: "bg-amber-50 text-amber-800",
    heading: "text-amber-900",
    chip: "bg-amber-500/10 text-amber-800"
  },
  sky: {
    border: "border-sky-100",
    badge: "bg-sky-50 text-sky-800",
    heading: "text-sky-900",
    chip: "bg-sky-500/10 text-sky-700"
  },
  purple: {
    border: "border-violet-100",
    badge: "bg-violet-50 text-violet-800",
    heading: "text-violet-900",
    chip: "bg-violet-500/10 text-violet-700"
  },
  slate: {
    border: "border-slate-200",
    badge: "bg-slate-100 text-slate-700",
    heading: "text-slate-900",
    chip: "bg-slate-200 text-slate-700"
  }
};

const statusToneStyles = {
  neutral: "bg-slate-100 text-slate-600 border border-slate-200",
  info: "bg-sky-50 text-sky-700 border border-sky-100",
  warning: "bg-amber-50 text-amber-900 border border-amber-100",
  positive: "bg-emerald-50 text-emerald-700 border border-emerald-100"
};

const timelineTone = {
  done: { dot: "bg-emerald-500", text: "text-slate-500" },
  current: { dot: "bg-brand-500", text: "text-accent" },
  pending: { dot: "bg-slate-200", text: "text-slate-400" }
};

type CleanerStatusStep = "EN_ROUTE" | "ON_SITE" | "DONE";

type StatusFeedback = {
  type: "success" | "error";
  message: string;
};

const cleanerStepConfig: Record<
  CleanerStatusStep,
  { label: string; helper: string; button: string }
> = {
  EN_ROUTE: {
    label: "On my way",
    helper: "Texts the customer and alerts HQ",
    button: "Send ETA"
  },
  ON_SITE: {
    label: "Clock in",
    helper: "Starts payroll clock",
    button: "Clock in"
  },
  DONE: {
    label: "Job done",
    helper: "Marks payroll + texts stakeholders",
    button: "Complete"
  }
};

type PipelineBoardProps = PipelineBoardData;

const formatRelative = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (abs < minute) return "Just now";
  if (abs < hour) {
    const minutes = Math.round(diff / minute);
    return minutes >= 0 ? `in ${minutes}m` : `${Math.abs(minutes)}m ago`;
  }
  if (abs < day) {
    const hours = Math.round(diff / hour);
    return hours >= 0 ? `in ${hours}h` : `${Math.abs(hours)}h ago`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
};

const matchesQuery = (house: PipelineHouse, query: string) => {
  if (!query) return true;
  const target = query.toLowerCase();
  return (
    house.customer.toLowerCase().includes(target) ||
    house.city.toLowerCase().includes(target) ||
    house.addressLine1.toLowerCase().includes(target) ||
    house.service.toLowerCase().includes(target)
  );
};

type ColumnView = PipelineBoardData["columns"][number] & { total: number; isActive: boolean };

const PipelineBoard = ({ metrics, columns, viewerRole, lastUpdated }: PipelineBoardProps) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeStages, setActiveStages] = useState<PipelineStageId[]>(columns.map((column) => column.id));
  const [showReschedulesOnly, setShowReschedulesOnly] = useState(false);
  const [pendingStatusKey, setPendingStatusKey] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<Record<string, StatusFeedback>>({});
  const isCleanerView = viewerRole === "CLEANER";

  const filteredColumns = useMemo<ColumnView[]>(
    () =>
      columns.map((column) => {
        const isActive = activeStages.includes(column.id);
        const houses = isActive
          ? column.houses.filter(
              (house) =>
                matchesQuery(house, query) && (!showReschedulesOnly || house.rescheduleCount > 0)
            )
          : [];
        return { ...column, houses, total: column.houses.length, isActive };
      }),
    [columns, activeStages, query, showReschedulesOnly]
  );

  const visibleCount = filteredColumns.reduce((sum, column) => sum + column.houses.length, 0);

  const toggleStage = (stage: PipelineStageId) => {
    setActiveStages((prev) =>
      prev.includes(stage) ? prev.filter((item) => item !== stage) : [...prev, stage]
    );
  };

  const resetFilters = () => {
    setQuery("");
    setActiveStages(columns.map((column) => column.id));
    setShowReschedulesOnly(false);
  };

  const updateCleanerStatus = async (
    jobId: string | null | undefined,
    status: CleanerStatusStep,
    assignmentId?: string | null
  ) => {
    if (!jobId) return;
    const key = `${jobId}-${status}`;
    setPendingStatusKey(key);
    setStatusFeedback((prev) => {
      const next = { ...prev };
      delete next[jobId];
      return next;
    });
    try {
      const response = await fetch(`/api/jobs/${jobId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, assignmentId })
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Unable to update status.");
      }
      const successMessage =
        status === "DONE"
          ? "Job marked complete. Great work!"
          : status === "ON_SITE"
            ? "Clocked in."
            : "Customers notified.";
      setStatusFeedback((prev) => ({
        ...prev,
        [jobId]: { type: "success", message: successMessage }
      }));
      router.refresh();
    } catch (error) {
      console.error(error);
      setStatusFeedback((prev) => ({
        ...prev,
        [jobId]: {
          type: "error",
          message: error instanceof Error ? error.message : "Unable to update status."
        }
      }));
    } finally {
      setPendingStatusKey(null);
    }
  };

  const viewerBadge =
    viewerRole === "HQ" ? "HQ visibility" : viewerRole === "CLEANER" ? "Crew view" : "Client";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center rounded-full bg-brand-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">
            {viewerBadge}
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-accent">Pipeline tracker</h2>
          <p className="text-sm text-muted-foreground">
            Follow every house from first request through payout. Reschedules automatically jump back to the scheduling lane.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Last updated <span className="font-semibold text-accent">{formatRelative(lastUpdated)}</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.id} className="border border-brand-50/70 bg-white">
            <CardHeader className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-500">{metric.label}</p>
              <p className="text-3xl font-semibold text-accent">{metric.value}</p>
              <p className="text-sm text-muted-foreground">{metric.helper}</p>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by customer, city, or address"
            className="pl-11"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowReschedulesOnly((value) => !value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold",
              showReschedulesOnly
                ? "border-amber-400 bg-amber-50 text-amber-900"
                : "border-brand-100 text-muted-foreground hover:border-brand-300 hover:text-accent"
            )}
          >
            <AlertTriangle className="h-4 w-4" />
            Reschedules
          </button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="border border-transparent text-sm text-muted-foreground hover:border-brand-200 hover:text-accent"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {columns.map((column) => (
          <button
            key={column.id}
            type="button"
            onClick={() => toggleStage(column.id)}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition",
              activeStages.includes(column.id)
                ? "bg-brand-600 text-white shadow-sm shadow-brand-200"
                : "bg-slate-200/70 text-slate-600 hover:bg-slate-200"
            )}
          >
            {column.title}
          </button>
        ))}
      </div>

      <div className="text-sm text-muted-foreground">
        Showing <span className="font-semibold text-accent">{visibleCount}</span> homes across{" "}
        <span className="font-semibold text-accent">{activeStages.length}</span> lanes.
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-[1024px] gap-5">
          {filteredColumns.map((column) => {
            const tone = toneStyles[column.tone];
            return (
              <section key={column.id} className="min-w-[260px] flex-1">
                <div className={cn("rounded-3xl border bg-white p-5 shadow-sm", tone.border)}>
                  <header className="mb-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={cn("text-xs font-semibold uppercase tracking-[0.35em]", tone.heading)}>
                          {column.title}
                        </p>
                        <p className="text-sm text-muted-foreground">{column.subtitle}</p>
                      </div>
                      <span className={cn("rounded-full px-3 py-1 text-sm font-semibold", tone.badge)}>
                        {column.total}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs",
                        tone.chip,
                        !column.isActive && "opacity-60"
                      )}
                    >
                      <Filter className="h-3.5 w-3.5" />
                      {column.isActive ? "Lane active" : "Lane hidden"}
                    </div>
                  </header>

                  <div className="space-y-4">
                    {column.houses.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-muted-foreground">
                        {column.emptyLabel}
                      </div>
                    ) : (
                      column.houses.map((house) => (
                        <HouseCard
                          key={house.id}
                          house={house}
                          isCleanerView={isCleanerView}
                          pendingStatusKey={pendingStatusKey}
                          feedback={house.jobId ? statusFeedback[house.jobId] : undefined}
                          onStatusUpdate={updateCleanerStatus}
                        />
                      ))
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};

type HouseCardProps = {
  house: PipelineHouse;
  isCleanerView: boolean;
  pendingStatusKey?: string | null;
  feedback?: StatusFeedback;
  onStatusUpdate?: (jobId: string | null | undefined, status: CleanerStatusStep, assignmentId?: string | null) => void;
};

const HouseCard = ({ house, isCleanerView, pendingStatusKey, feedback, onStatusUpdate }: HouseCardProps) => (
  <Card className="border border-slate-100 bg-white shadow-none">
    <CardHeader className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-500">{house.city}</p>
          <h3 className="text-lg font-semibold text-accent">{house.customer}</h3>
          <p className="text-sm text-muted-foreground">{house.addressLine1}</p>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", statusToneStyles[house.statusBadge.tone])}>
          {house.statusBadge.label}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {house.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {tag}
          </span>
        ))}
      </div>
    </CardHeader>
    <CardContent className="space-y-5">
      <div className="rounded-2xl border border-dashed border-brand-100/70 bg-brand-50/40 px-4 py-3">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-brand-500">Next step</p>
        <p className="text-sm font-semibold text-accent">{house.nextAction}</p>
        {house.scheduledWindow ? (
          <p className="text-xs text-muted-foreground">Scheduled: {house.scheduledWindow}</p>
        ) : house.preferredWindow ? (
          <p className="text-xs text-muted-foreground">Preferred: {house.preferredWindow}</p>
        ) : null}
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-100 px-4 py-3 text-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">Quote</p>
            <p className="text-lg font-semibold text-accent">
              {house.quoteTotal ? formatCurrency(house.quoteTotal) : "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">Balance</p>
            <p className={cn("text-lg font-semibold", house.balance > 0 ? "text-amber-600" : "text-emerald-600")}>
              {formatCurrency(house.balance)}
            </p>
          </div>
        </div>
        {house.payoutAmount !== null && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Cleaner payout target</span>
            <span className="font-semibold text-accent">{formatCurrency(house.payoutAmount)}</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-400">Crew</p>
        {house.cleaners.length ? (
          <div className="flex flex-wrap gap-2">
            {house.cleaners.map((cleaner) => (
              <span
                key={cleaner.id}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white">
                  {cleaner.initials}
                </span>
                {cleaner.name}
              </span>
            ))}
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            <Users className="h-3.5 w-3.5" />
            Unassigned
          </div>
        )}
      </div>

      {house.rescheduleCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <p className="font-semibold">Rescheduled x{house.rescheduleCount}</p>
            {house.rescheduledLabel && (
              <p className="text-[0.65rem] uppercase tracking-[0.3em]">Last update {house.rescheduledLabel}</p>
            )}
          </div>
        </div>
      )}

      {isCleanerView && house.jobId && (
        <CleanerStatusControls
          house={house}
          pendingStatusKey={pendingStatusKey}
          feedback={feedback}
          onStatusUpdate={(status) => onStatusUpdate?.(house.jobId, status, house.assignmentId)}
        />
      )}

      {house.timeline.length > 0 && (
        <div className="space-y-2">
          {house.timeline.map((event) => {
            const tone = timelineTone[event.status];
            return (
              <div key={event.id} className="flex items-center gap-3 text-xs">
                <span className={cn("h-2.5 w-2.5 rounded-full", tone.dot)} />
                <div>
                  <p className={cn("font-semibold", tone.text)}>{event.label}</p>
                  <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">
                    {formatRelative(event.date)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CardContent>
  </Card>
);

type CleanerStatusControlsProps = {
  house: PipelineHouse;
  pendingStatusKey?: string | null;
  feedback?: StatusFeedback;
  onStatusUpdate?: (status: CleanerStatusStep) => void;
};

const CleanerStatusControls = ({ house, pendingStatusKey, feedback, onStatusUpdate }: CleanerStatusControlsProps) => {
  if (!house.jobId) return null;

  if (!house.assignmentId) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-200 px-4 py-3 text-xs text-muted-foreground">
        HQ is finalizing crew assignments. Status buttons unlock once you are the active lead.
      </div>
    );
  }

  const steps: Array<{ id: CleanerStatusStep; value?: string | null }> = [
    { id: "EN_ROUTE", value: house.enRouteAt },
    { id: "ON_SITE", value: house.clockInAt },
    { id: "DONE", value: house.clockOutAt }
  ];

  return (
    <div className="space-y-3 rounded-2xl border border-brand-100 px-4 py-3">
      <div>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-brand-500">Crew status</p>
        <p className="text-xs text-muted-foreground">These updates sync payroll and text your customer instantly.</p>
      </div>
      {steps.map((step, index) => {
        const config = cleanerStepConfig[step.id];
        const isComplete = Boolean(step.value);
        const previousComplete = steps.slice(0, index).every((entry) => Boolean(entry.value));
        const key = `${house.jobId}-${step.id}`;
        const isPending = pendingStatusKey === key;
        const disabled = isComplete || !previousComplete || !onStatusUpdate;
        return (
          <div key={step.id} className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3">
            <div>
              <p className="text-sm font-semibold text-accent">{config.label}</p>
              <p className="text-xs text-muted-foreground">
                {step.value ? `Recorded ${formatRelative(step.value)}` : config.helper}
              </p>
            </div>
            <Button
              type="button"
              variant={isComplete ? "ghost" : "outline"}
              size="sm"
              disabled={disabled || isPending}
              onClick={() => onStatusUpdate?.(step.id)}
            >
              {isComplete ? "Logged" : isPending ? "Saving..." : config.button}
            </Button>
          </div>
        );
      })}
      {feedback && (
        <p className={cn("text-xs font-semibold", feedback.type === "error" ? "text-red-600" : "text-emerald-600")}>
          {feedback.message}
        </p>
      )}
    </div>
  );
};

export default PipelineBoard;
