"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { cn } from "@/src/lib/utils";
import { useToast } from "@/src/lib/toast";
import { CelebrationOverlay } from "@/src/components/CelebrationOverlay";

type VisitSummary = {
  jobId: string;
  service: string;
  dateLabel: string;
  window: string;
  address: string;
  status: string;
};

type SlotDraft = {
  date: string;
  start: string;
  end: string;
};

const defaultSlots: SlotDraft[] = [
  { date: "", start: "", end: "" },
  { date: "", start: "", end: "" },
  { date: "", start: "", end: "" }
];

export const RescheduleForm = ({ visits }: { visits: VisitSummary[] }) => {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [jobId, setJobId] = useState(visits[0]?.jobId ?? "");
  const [reason, setReason] = useState("");
  const [slots, setSlots] = useState<SlotDraft[]>(defaultSlots);
  const [showCelebration, setShowCelebration] = useState(false);

  const selected = useMemo(() => visits.find((visit) => visit.jobId === jobId) ?? visits[0], [jobId, visits]);

  const updateSlot = (index: number, field: keyof SlotDraft, value: string) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!jobId) {
      toast({ variant: "error", title: "Select a visit", description: "Choose which visit you need to move." });
      return;
    }

    if (reason.trim().length < 5) {
      toast({ variant: "error", title: "Add a reason", description: "Please tell HQ why you need to reschedule." });
      return;
    }

    const preparedSlots = slots
      .filter((slot) => slot.date && slot.start && slot.end)
      .map((slot, index) => {
        const start = new Date(`${slot.date}T${slot.start}`);
        const end = new Date(`${slot.date}T${slot.end}`);
        return {
          start: start.toISOString(),
          end: end.toISOString(),
          priority: index + 1
        };
      });

    if (preparedSlots.length === 0) {
      toast({ variant: "error", title: "Add time windows", description: "Please provide at least one preferred time window." });
      return;
    }

    const invalidSlot = preparedSlots.find((slot) => {
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      return Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start;
    });

    if (invalidSlot) {
      toast({ variant: "error", title: "Fix a window", description: "Each window needs a start time before the end time." });
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/client/reschedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId, reason, slots: preparedSlots })
        });

        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? "Unable to submit reschedule request.");
        }

        setReason("");
        setSlots(defaultSlots);
        setShowCelebration(true);
        toast({ variant: "success", title: "Sent", description: "HQ received your reschedule request." });
      } catch (error) {
        toast({
          variant: "error",
          title: "Could not send",
          description: error instanceof Error ? error.message : "Network error"
        });
      }
    });
  };

  return (
    <>
    <CelebrationOverlay type="reschedule" show={showCelebration} onComplete={() => setShowCelebration(false)} />
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
          Visit
          <select
            value={jobId}
            onChange={(event) => setJobId(event.target.value)}
            className="rounded-2xl border border-brand-100/70 bg-white px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            {visits.map((visit) => (
              <option key={visit.jobId} value={visit.jobId}>
                {visit.service} • {visit.dateLabel} ({visit.window})
              </option>
            ))}
          </select>
        </label>

        {selected ? (
          <div className="rounded-3xl border border-brand-100 bg-brand-50/30 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent/70">Current schedule</p>
            <p className="mt-2 text-lg font-semibold text-accent">
              {selected.dateLabel} • {selected.window}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{selected.address}</p>
          </div>
        ) : null}
      </div>

      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
        Reason
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          className="w-full resize-none rounded-2xl border border-brand-100/70 bg-white px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
          placeholder="Example: flight delay, childcare, access needs…"
          required
        />
      </label>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Preferred windows</p>
        <div className="space-y-3">
          {slots.map((slot, index) => (
            <div
              key={`slot-${index}`}
              className={cn(
                "grid gap-3 rounded-2xl border border-brand-100/80 bg-brand-50/40 p-3",
                "sm:grid-cols-3"
              )}
            >
              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Date
                <Input
                  type="date"
                  value={slot.date}
                  onChange={(event) => updateSlot(index, "date", event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Start
                <Input
                  type="time"
                  value={slot.start}
                  onChange={(event) => updateSlot(index, "start", event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                End
                <Input
                  type="time"
                  value={slot.end}
                  onChange={(event) => updateSlot(index, "end", event.target.value)}
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          HQ will confirm a new time window and update your portal + calendar invite.
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send request"}
        </Button>
      </div>
    </form>
    </>
  );
};
