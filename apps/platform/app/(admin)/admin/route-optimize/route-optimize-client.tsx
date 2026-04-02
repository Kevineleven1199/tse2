"use client";

import { useState } from "react";
import { Card, CardContent } from "@/src/components/ui/card";

interface Job {
  id: string;
  address: string;
  customerName: string;
  scheduledStart: string | null;
  status: string;
  assignedTo: string;
}

export default function RouteOptimizeClient({
  initialJobs,
}: {
  initialJobs: Job[];
}) {
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<Job[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectJob = (jobId: string) => {
    setSelectedJobs((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  const handleOptimize = async () => {
    if (selectedJobs.length === 0) {
      setError("Please select at least one job");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/route-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobIds: selectedJobs,
        }),
      });

      if (!response.ok) throw new Error("Failed to optimize route");

      const result = await response.json();
      setOptimizedRoute(result.optimizedRoute);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const displayJobs = optimizedRoute || initialJobs;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!optimizedRoute && (
        <div className="flex justify-between items-center">
          <p className="text-sm font-medium">
            Selected: {selectedJobs.length}
          </p>
          <button
            onClick={handleOptimize}
            disabled={loading || selectedJobs.length === 0}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "Optimizing..." : "Optimize Route"}
          </button>
        </div>
      )}

      {optimizedRoute && (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setOptimizedRoute(null);
              setSelectedJobs([]);
            }}
            className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Reset
          </button>
          <p className="text-sm text-green-600 font-medium flex items-center">
            Route optimized!
          </p>
        </div>
      )}

      {displayJobs.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No jobs to optimize.
        </p>
      ) : (
        <div className="space-y-2">
          {displayJobs.map((job, index) => (
            <Card key={job.id}>
              <CardContent className="pt-6">
                <div className="flex gap-4 items-start">
                  {!optimizedRoute && (
                    <input
                      type="checkbox"
                      checked={selectedJobs.includes(job.id)}
                      onChange={() => handleSelectJob(job.id)}
                      className="mt-1"
                    />
                  )}
                  {optimizedRoute && (
                    <div className="flex items-center justify-center w-6 h-6 bg-brand-600 text-white rounded-full text-sm font-bold">
                      {index + 1}
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold">{job.customerName}</h4>
                    <p className="text-sm text-muted-foreground">
                      {job.address}
                    </p>
                    <div className="flex gap-4 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {job.scheduledStart
                          ? new Date(job.scheduledStart).toLocaleTimeString()
                          : "No time set"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {job.assignedTo || "Unassigned"}
                      </p>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {job.status}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
