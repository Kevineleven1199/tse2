"use client";

import { useState, useEffect } from "react";
import { X, Loader2, UserCheck } from "lucide-react";

type AvailableCleaner = {
  id: string;
  name: string;
  rating: number;
  completedJobs: number;
  available: boolean;
  conflictCount: number;
};

type Props = {
  jobId?: string;
  jobCustomer?: string;
  jobService?: string;
  initialDate?: string;    // YYYY-MM-DD
  initialHour?: number;
  onClose: () => void;
  onScheduled: () => void;
};

export const ScheduleJobModal = ({
  jobId,
  jobCustomer,
  jobService,
  initialDate,
  initialHour,
  onClose,
  onScheduled,
}: Props) => {
  const [date, setDate] = useState(initialDate || new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState(
    initialHour ? `${String(initialHour).padStart(2, "0")}:00` : "09:00"
  );
  const [endTime, setEndTime] = useState(
    initialHour ? `${String(initialHour + 2).padStart(2, "0")}:00` : "11:00"
  );
  const [selectedCleaner, setSelectedCleaner] = useState("");
  const [cleaners, setCleaners] = useState<AvailableCleaner[]>([]);
  const [loadingCleaners, setLoadingCleaners] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch available cleaners when date/time changes
  useEffect(() => {
    if (!date || !startTime || !endTime) return;

    setLoadingCleaners(true);
    const params = new URLSearchParams({ date, start: startTime, end: endTime });
    if (jobId) params.set("jobId", jobId);

    fetch(`/api/admin/cleaners/available?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCleaners(data);
      })
      .catch(() => setCleaners([]))
      .finally(() => setLoadingCleaners(false));
  }, [date, startTime, endTime, jobId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId) return;

    setSubmitting(true);
    try {
      // Schedule the job
      const scheduleRes = await fetch(`/api/jobs/${jobId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: `${date}T${startTime}:00`,
          end: `${date}T${endTime}:00`,
        }),
      });

      if (!scheduleRes.ok) {
        const err = await scheduleRes.json();
        alert(err.error || "Failed to schedule job");
        return;
      }

      // Assign cleaner if selected
      if (selectedCleaner) {
        await fetch(`/api/jobs/${jobId}/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cleanerId: selectedCleaner }),
        });
      }

      onScheduled();
      onClose();
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-accent">Schedule Job</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Job info (if provided) */}
          {jobCustomer && (
            <div className="rounded-xl bg-brand-50/60 px-4 py-3">
              <p className="text-sm font-semibold text-accent">{jobCustomer}</p>
              {jobService && (
                <p className="text-xs text-muted-foreground">{jobService.replace(/_/g, " ")}</p>
              )}
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-accent mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-sm"
            />
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-accent mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-accent mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          {/* Cleaner selection */}
          <div>
            <label className="block text-sm font-medium text-accent mb-1">
              Assign Cleaner
            </label>
            {loadingCleaners ? (
              <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading available cleaners...
              </div>
            ) : cleaners.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No cleaners found</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cleaners.map((c) => (
                  <label
                    key={c.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                      selectedCleaner === c.id
                        ? "border-brand-600 bg-brand-50 ring-1 ring-brand-200"
                        : "border-brand-100 hover:bg-brand-50/50"
                    } ${!c.available ? "opacity-50" : ""}`}
                  >
                    <input
                      type="radio"
                      name="cleaner"
                      value={c.id}
                      checked={selectedCleaner === c.id}
                      onChange={() => setSelectedCleaner(c.id)}
                      className="accent-brand-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-accent">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Rating: {c.rating.toFixed(1)} | {c.completedJobs} jobs
                        {c.conflictCount > 0 && (
                          <span className="text-amber-600 ml-1">
                            ({c.conflictCount} conflict{c.conflictCount > 1 ? "s" : ""})
                          </span>
                        )}
                      </p>
                    </div>
                    {c.available && <UserCheck className="h-4 w-4 text-green-500 flex-shrink-0" />}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || !jobId}
              className="flex-1 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Scheduling..." : "Assign & Schedule"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-brand-100 px-6 py-3 text-sm font-semibold text-accent transition-colors hover:bg-brand-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
