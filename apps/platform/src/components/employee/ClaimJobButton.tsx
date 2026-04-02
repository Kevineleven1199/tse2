"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";

export default function ClaimJobButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleClaim = async () => {
    if (!confirm("Grab this job? It will be added to your schedule immediately.")) return;

    setClaiming(true);
    setError("");

    try {
      const res = await fetch(`/api/cleaner/claim/${jobId}`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to claim job");
      }

      setSuccess(true);
      setTimeout(() => router.refresh(), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim job");
    } finally {
      setClaiming(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-2xl bg-green-50 border border-green-200 px-6 py-4 text-center">
        <p className="text-lg font-bold text-green-700">Job Grabbed!</p>
        <p className="text-sm text-green-600 mt-1">Loading your job details...</p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleClaim}
        disabled={claiming}
        className="flex min-h-[56px] w-full items-center justify-center gap-3 rounded-2xl bg-accent px-6 py-4 text-base font-bold uppercase tracking-wider text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 active:scale-[0.97] disabled:opacity-50"
      >
        {claiming ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Grabbing...
          </>
        ) : (
          <>
            <Zap className="h-5 w-5" />
            Grab This Job
          </>
        )}
      </button>
      {error && (
        <p className="mt-2 text-center text-sm font-medium text-red-600">{error}</p>
      )}
    </div>
  );
}
