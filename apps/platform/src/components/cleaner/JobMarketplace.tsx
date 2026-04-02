"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { formatCurrency } from "@/src/lib/utils";
import { Loader2 } from "lucide-react";
import type { AvailableJob } from "@/src/lib/cleaner-portal";

type JobMarketplaceProps = {
  jobs: AvailableJob[];
};

export const JobMarketplace = ({ jobs }: JobMarketplaceProps) => {
  const [filter, setFilter] = useState<"all" | "urgent" | "bonus">("all");

  const filteredJobs = jobs.filter(job => {
    if (filter === "urgent") return job.isUrgent;
    if (filter === "bonus") return job.bonusAmount > 0;
    return true;
  });

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date(date));

  return (
    <Card className="bg-white lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-accent">Available Jobs</h2>
            <p className="text-sm text-muted-foreground">
              {jobs.length} job{jobs.length !== 1 ? "s" : ""} — first come, first serve
            </p>
          </div>
          <div className="flex gap-2">
            {(["all", "urgent", "bonus"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                  filter === f
                    ? f === "urgent"
                      ? "bg-red-500 text-white"
                      : f === "bonus"
                        ? "bg-green-500 text-white"
                        : "bg-accent text-white"
                    : f === "urgent"
                      ? "bg-red-100 text-red-700"
                      : f === "bonus"
                        ? "bg-green-100 text-green-700"
                        : "bg-brand-100 text-accent"
                }`}
              >
                {f === "all" ? "All" : f === "urgent" ? "Urgent" : "Bonus"}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredJobs.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-3xl">📭</p>
            <p className="mt-2 font-semibold text-accent">No jobs match your filter</p>
            <p className="text-sm text-muted-foreground">Try a different filter or check back later</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.slice(0, 5).map((job) => (
              <JobCard key={job.id} job={job} formatDate={formatDate} />
            ))}

            {filteredJobs.length > 5 && (
              <Link
                href="/cleaner/jobs"
                className="block rounded-xl border border-brand-200 p-3 text-center text-sm font-bold text-brand-600 transition hover:bg-brand-50 active:scale-[0.98]"
              >
                View all {filteredJobs.length} available jobs →
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

function JobCard({ job, formatDate }: { job: AvailableJob; formatDate: (d: Date) => string }) {
  const router = useRouter();
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");

  const handleClaim = async () => {
    if (!confirm(`Grab this ${job.service} job in ${job.city}? It will be added to your schedule.`)) return;
    setClaiming(true);
    setError("");
    try {
      const res = await fetch(`/api/cleaner/claim/${job.id}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to claim");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Already claimed");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className={`relative rounded-2xl border p-4 transition active:scale-[0.99] ${
      job.isUrgent ? "border-red-200 bg-red-50" : "border-brand-100 bg-white"
    }`}>
      {job.isUrgent && (
        <span className="absolute -top-2 -right-2 rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
          URGENT
        </span>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-accent">{job.service}</h3>
            {job.bonusAmount > 0 && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                +{formatCurrency(job.bonusAmount)} bonus
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {job.city}{job.neighborhood && ` · ${job.neighborhood}`}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{formatDate(job.scheduledDate)}</span>
            <span>{job.timeWindow}</span>
            <span>~{job.estimatedDuration}h</span>
            {job.distanceFromYou && <span>{job.distanceFromYou} mi</span>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(job.estimatedPay + job.bonusAmount)}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Your pay</p>
          </div>
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="min-h-[48px] rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 active:scale-95 disabled:opacity-50"
          >
            {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Grab"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-center text-xs text-red-600">{error}</p>
      )}

      {job.specialInstructions && (
        <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
          <span className="font-bold">Note:</span> {job.specialInstructions}
        </div>
      )}
    </div>
  );
}
