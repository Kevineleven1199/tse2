"use client";

import { useState, useTransition } from "react";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import { useToast } from "@/src/lib/toast";

type CleanerInfo = {
  id: string;
  name: string;
  photoUrl: string | null;
  rating: number;
  totalCleans: number;
  bio: string | null;
};

type FeedbackFormProps = {
  cleaner: CleanerInfo | null;
};

export const FeedbackForm = ({ cleaner }: FeedbackFormProps) => {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (message.trim().length < 5) {
      toast({ variant: "error", title: "Add a quick note", description: "Please share a short message so we know what happened." });
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/client/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rating: rating ?? undefined,
            message,
            cleanerId: cleaner?.id,
            cleanerName: cleaner?.name
          })
        });

        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? "Unable to submit feedback.");
        }

        setMessage("");
        setRating(null);
        toast({ variant: "success", title: "Thanks for sharing", description: "HQ received your feedback." });
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
    <form className="space-y-5" onSubmit={handleSubmit}>
      {cleaner ? (
        <div className="rounded-3xl border border-brand-100 bg-brand-50/30 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent/70">Assigned cleaner</p>
          <p className="mt-2 text-lg font-semibold text-accent">{cleaner.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            ⭐ {cleaner.rating.toFixed(1)} • {cleaner.totalCleans} cleans
          </p>
        </div>
      ) : null}

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Rating</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((value) => {
            const isSelected = rating === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                aria-pressed={isSelected}
                className={cn(
                  "inline-flex min-h-[44px] items-center justify-center rounded-full border px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200",
                  isSelected
                    ? "border-sunshine bg-sunshine/20 text-accent"
                    : "border-brand-100 bg-white text-muted-foreground hover:bg-brand-50"
                )}
              >
                {"★".repeat(value)}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setRating(null)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-brand-100 bg-white px-4 text-sm font-semibold text-muted-foreground transition hover:bg-brand-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
          >
            Clear
          </button>
        </div>
      </div>

      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
        Message
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={5}
          className="w-full resize-none rounded-2xl border border-brand-100/70 bg-white px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
          placeholder="Tell us what we should keep doing (or fix) for your next visit…"
          required
        />
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">We’ll route this to HQ and follow up if we need more details.</p>
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send feedback"}
        </Button>
      </div>
    </form>
  );
};
