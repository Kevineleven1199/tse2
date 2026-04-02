"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardContent } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";

type InventoryRequest = {
  id: string;
  itemName: string;
  quantity: number;
  reason: string | null;
  urgency: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  createdAt: string;
};

export function InventoryRequestForm() {
  const [requests, setRequests] = useState<InventoryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [urgency, setUrgency] = useState<"low" | "normal" | "high">("normal");
  const [reason, setReason] = useState("");

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory-requests");
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
      const res = await fetch("/api/inventory-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName,
          quantity: parseInt(quantity, 10),
          urgency,
          reason: reason || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit request");
      }

      setSuccess("Inventory request submitted successfully!");
      setShowForm(false);
      setItemName("");
      setQuantity("1");
      setUrgency("normal");
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

  const urgencyBadge = (urg: string) => {
    const styles: Record<string, string> = {
      low: "bg-blue-100 text-blue-700",
      normal: "bg-gray-100 text-gray-700",
      high: "bg-red-100 text-red-700",
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[urg] || "bg-gray-100 text-gray-700"}`}>
        {urg}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-accent">Inventory Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Request supplies and inventory items for your jobs
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
            <h2 className="text-lg font-semibold text-accent">New Inventory Request</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-accent">Item Name</label>
                <Input
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. All-purpose cleaner, Microfiber cloths"
                  required
                  maxLength={255}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-accent">Quantity</label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min={1}
                    max={9999}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-accent">Urgency</label>
                  <div className="flex gap-2">
                    {(["low", "normal", "high"] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setUrgency(level)}
                        className={`rounded-xl border px-4 py-2 text-sm font-medium capitalize transition ${
                          urgency === level
                            ? level === "high"
                              ? "border-red-400 bg-red-50 text-red-700"
                              : level === "low"
                                ? "border-blue-400 bg-blue-50 text-blue-700"
                                : "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-brand-100 bg-white text-muted-foreground hover:border-brand-200"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
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
                  placeholder="Why do you need this item? Any specific brand or details?"
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
              No inventory requests yet. Click &quot;New Request&quot; to get started.
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
                      <span className="font-semibold text-accent">{req.itemName}</span>
                      {statusBadge(req.status)}
                      {urgencyBadge(req.urgency)}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Qty: {req.quantity}
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
