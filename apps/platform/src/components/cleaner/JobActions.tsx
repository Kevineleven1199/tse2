"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navigation, MapPin, CheckCircle2, Loader2, Clock3 } from "lucide-react";
import { PhotoGate } from "./PhotoGate";

type Props = {
  jobId: string;
  jobStatus: string;
  enRouteAt: string | null;
  clockInAt: string | null;
  clockOutAt: string | null;
  beforePhotoCount?: number;
  afterPhotoCount?: number;
};

const STEPS = [
  { key: "enRoute", label: "Start travel", icon: Navigation },
  { key: "onSite", label: "Clock in", icon: MapPin },
  { key: "done", label: "Clock out", icon: CheckCircle2 },
] as const;

function getCurrentStep(props: Props): number {
  if (props.clockOutAt || props.jobStatus === "COMPLETED") return 3;
  if (props.clockInAt) return 2;
  if (props.enRouteAt) return 1;
  return 0;
}

export const JobActions = ({
  jobId,
  jobStatus,
  enRouteAt,
  clockInAt,
  clockOutAt,
  beforePhotoCount = 0,
  afterPhotoCount = 0,
}: Props) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [photoGate, setPhotoGate] = useState<"BEFORE" | "AFTER" | null>(null);
  const [localBeforeCount, setLocalBeforeCount] = useState(beforePhotoCount);
  const [localAfterCount, setLocalAfterCount] = useState(afterPhotoCount);

  const currentStep = getCurrentStep({ jobId, jobStatus, enRouteAt, clockInAt, clockOutAt });
  const isCompleted = currentStep >= 3;

  const performAction = async (action: "start" | "arrive" | "complete", notes?: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/cleaner/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, action, ...(notes ? { notes } : {}) }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update job.");
        return;
      }

      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
      setShowCompleteForm(false);
    }
  };

  // Gate clock-in behind before photos
  const handleClockIn = () => {
    if (localBeforeCount === 0) {
      setPhotoGate("BEFORE");
    } else {
      performAction("arrive");
    }
  };

  // Gate clock-out behind after photos
  const handleClockOut = () => {
    if (localAfterCount === 0) {
      setPhotoGate("AFTER");
    } else {
      setShowCompleteForm(true);
    }
  };

  // Don't show actions for non-active statuses
  if (!["SCHEDULED", "CLAIMED"].includes(jobStatus) && !enRouteAt && !clockInAt && !isCompleted) {
    return null;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="rounded-[28px] border border-brand-100 bg-brand-50/40 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm">
              <Clock3 className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">Clock Workflow</p>
              <p className="text-sm text-muted-foreground">
                Start travel → take <strong>before photos</strong> & clock in → clean → take <strong>after photos</strong> & clock out.
              </p>
            </div>
          </div>
        </div>

        {/* Step Progress Indicator */}
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => {
            const StepIcon = step.icon;
            const isActive = i < currentStep;
            const isCurrent = i === currentStep;

            return (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                      isActive
                        ? "bg-green-500 text-white"
                        : isCurrent
                          ? "bg-brand-600 text-white ring-4 ring-brand-100"
                          : "bg-brand-50 text-muted-foreground"
                    }`}
                  >
                    <StepIcon className="h-5 w-5" />
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      isActive ? "text-green-600" : isCurrent ? "text-brand-700" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 rounded ${
                      i < currentStep ? "bg-green-400" : "bg-brand-100"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {/* Action Buttons */}
        {isCompleted ? (
          <div className="rounded-2xl bg-green-50 border border-green-200 p-5 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-500 mb-2" />
            <p className="text-lg font-bold text-green-700">Job Complete</p>
            {clockOutAt && (
              <p className="text-sm text-green-600 mt-1">
                Completed at {new Date(clockOutAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </p>
            )}
          </div>
        ) : currentStep === 0 ? (
          <button
            onClick={() => performAction("start")}
            disabled={loading}
            className="w-full rounded-2xl bg-brand-600 px-6 py-5 text-lg font-bold text-white transition active:scale-[0.98] hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Navigation className="h-6 w-6" />}
            {loading ? "Updating..." : "Start Travel to Job"}
          </button>
        ) : currentStep === 1 ? (
          <button
            onClick={handleClockIn}
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 px-6 py-5 text-lg font-bold text-white transition active:scale-[0.98] hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <MapPin className="h-6 w-6" />}
            {loading ? "Updating..." : "📸 Take Before Photos & Clock In"}
          </button>
        ) : currentStep === 2 && !showCompleteForm ? (
          <button
            onClick={handleClockOut}
            disabled={loading}
            className="w-full rounded-2xl bg-green-600 px-6 py-5 text-lg font-bold text-white transition active:scale-[0.98] hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            <CheckCircle2 className="h-6 w-6" />
            📸 Take After Photos & Clock Out
          </button>
        ) : currentStep === 2 && showCompleteForm ? (
          <div className="rounded-2xl border border-brand-100 bg-white p-5 space-y-4">
            <h3 className="text-lg font-bold text-accent">Finish and Clock Out</h3>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Completion Notes (optional)
              </label>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Any notes about the job (issues, extra work, etc.)..."
                rows={3}
                maxLength={1000}
                className="w-full rounded-xl border border-brand-100 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
              <p className="text-xs text-muted-foreground text-right">{completionNotes.length}/1000</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => performAction("complete", completionNotes || undefined)}
                disabled={loading}
                className="flex-1 rounded-2xl bg-green-600 px-6 py-4 font-bold text-white transition active:scale-[0.98] hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                {loading ? "Completing..." : "Clock Out + Complete"}
              </button>
              <button
                onClick={() => setShowCompleteForm(false)}
                className="rounded-2xl border border-brand-100 px-6 py-4 font-bold text-accent transition active:scale-[0.98] hover:bg-brand-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {/* Time Stamps */}
        {(enRouteAt || clockInAt) && !isCompleted && (
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            {enRouteAt && (
              <span>En route at {new Date(enRouteAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
            )}
            {clockInAt && (
              <span>Arrived at {new Date(clockInAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
            )}
          </div>
        )}
      </div>

      {/* PhotoGate Overlay */}
      {photoGate && (
        <PhotoGate
          jobId={jobId}
          type={photoGate}
          onComplete={() => {
            setPhotoGate(null);
            if (photoGate === "BEFORE") {
              setLocalBeforeCount((c) => c + 1);
              performAction("arrive");
            } else {
              setLocalAfterCount((c) => c + 1);
              setShowCompleteForm(true);
            }
          }}
          onCancel={() => setPhotoGate(null)}
        />
      )}
    </>
  );
};
