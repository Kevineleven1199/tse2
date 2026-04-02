"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";

interface OnMyWayButtonProps {
  jobId: string;
  alreadySent?: boolean;
  onSuccess?: () => void;
}

export function OnMyWayButton({
  jobId,
  alreadySent = false,
  onSuccess
}: OnMyWayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(alreadySent);
  const [error, setError] = useState<string | null>(null);

  const handleSendOnMyWay = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/cleaner/on-my-way", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send on-my-way SMS");
      }

      setSent(true);
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Button variant="outline" disabled className="w-full">
        Sent ✓
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="primary"
        onClick={handleSendOnMyWay}
        disabled={loading}
        className="w-full"
      >
        {loading ? "Sending..." : "I'm On My Way"}
      </Button>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
