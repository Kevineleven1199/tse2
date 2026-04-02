"use client";

import { useState } from "react";
import { RefreshCcw } from "lucide-react";
import { cn } from "@/src/lib/utils";

export const SyncJobberButton = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setResult(null);

    try {
      const [estRes, tsRes] = await Promise.all([
        fetch("/api/integrations/jobber/sync-estimates", { method: "POST" }),
        fetch("/api/integrations/jobber/sync-timesheets", { method: "POST" }),
      ]);

      const estData = (await estRes.json()) as { estimatesSynced?: number; error?: string };
      const tsData = (await tsRes.json()) as { timesheetsSynced?: number; error?: string };

      if (!estRes.ok && !tsRes.ok) {
        setResult({
          success: false,
          message: estData.error || tsData.error || "Sync failed",
        });
        return;
      }

      const parts: string[] = [];
      if (estData.estimatesSynced !== undefined) {
        parts.push(`${estData.estimatesSynced} estimate${estData.estimatesSynced !== 1 ? "s" : ""}`);
      }
      if (tsData.timesheetsSynced !== undefined) {
        parts.push(`${tsData.timesheetsSynced} timesheet${tsData.timesheetsSynced !== 1 ? "s" : ""}`);
      }

      setResult({
        success: true,
        message: parts.length > 0 ? `Synced ${parts.join(" and ")}` : "Sync complete — nothing new",
      });

      // Refresh the page to show new data
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setResult({ success: false, message: "Network error — try again" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={loading}
        className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-accent px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-brand-700 disabled:opacity-50"
      >
        <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
        {loading ? "Syncing Jobber…" : "Sync from Jobber"}
      </button>
      {result && (
        <p
          className={cn(
            "text-xs font-medium",
            result.success ? "text-green-600" : "text-red-600"
          )}
        >
          {result.message}
        </p>
      )}
    </div>
  );
};
