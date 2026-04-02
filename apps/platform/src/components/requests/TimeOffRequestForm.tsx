"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardContent } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";

type TimeOffRequest = {
  id: string;
  type: "PTO" | "UPTO";
  startDate: string;
  endDate: string;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  createdAt: string;
};

export function TimeOffRequestForm() {
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [type, setType] = useState<"PTO" | "UPTO">("PTO");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/time-off");
      const data = await res.json();
      if (data.requests) setRequests(data.requests);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, startDate, endDate, reason: reason || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit request");
      }

      setSuccess("Time-off request submitted successfully!");
      setShowForm(false);
      setType("PTO");
      setStartDate("");
      setEndDate("");
      setReason("");
      fetchRequests();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
      new Date(dateStr)
    );

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: "bg-amber-100 text-amber-700",
      APPROVED: "bg-green-100 text-green-700",
      REJECTED: "bg-red-100 text-red-700",
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-700"}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-accent">Time Off Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Request PTO (Paid Time Off) or UPTO (Unpaid Time Off)
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "New Request"}
        </Button>
      </div>

      {/* Feedback messages */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* New Request Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-accent">New Time Off Request</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-accent">Type</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setType("PTO")}
                    className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                      type === "PTO"
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-brand-100 bg-white text-muted-foreground hover:border-brand-200"
                    }`}
                  >
                    PTO (Paid)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("UPTO")}
                    className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                      type === "UPTO"
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-brand-100 bg-white text-muted-foreground hover:border-brand-200"
                    }`}
                  >
                    UPTO (Unpaid)
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-accent">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-accent">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-accent">
                  Reason <span className="text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Why do you need time off?"
                  className="block w-full rounded-2xl border border-brand-100/70 bg-white px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Requests List */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-accent">My Requests</h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Loading...</p>
          ) : requests.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No time-off requests yet. Click &quot;New Request&quot; to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col gap-2 rounded-2xl border border-brand-100 bg-brand-50/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-accent">
                        {req.type === "PTO" ? "Paid Time Off" : "Unpaid Time Off"}
                      </span>
                      {statusBadge(req.status)}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDate(req.startDate)} - {formatDate(req.endDate)}
                    </p>
                    {req.reason && (
                      <p className="mt-1 text-sm text-muted-foreground">{req.reason}</p>
                    )}
                    {req.reviewNote && (
                      <p className="mt-1 text-xs italic text-muted-foreground">
                        Admin note: {req.reviewNote}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Submitted {formatDate(req.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
