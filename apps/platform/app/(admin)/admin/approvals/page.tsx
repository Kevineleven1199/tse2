"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

interface Approval {
  id: string;
  type: string;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  address: string | null;
  serviceType: string | null;
  estimatedHours: number | null;
  aiSummary: string | null;
  requestedDay: string | null;
  requestedTime: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovals();
  }, []);

  async function fetchApprovals() {
    try {
      const response = await fetch("/api/admin/approvals?status=pending");
      if (!response.ok) {
        throw new Error("Failed to fetch approvals");
      }
      const data = await response.json();
      setApprovals(data.approvals);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load approvals");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(approvalId: string) {
    try {
      const response = await fetch("/api/admin/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, action: "approve" }),
      });
      if (!response.ok) throw new Error("Failed to approve");
      await fetchApprovals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    }
  }

  async function handleReject(approvalId: string) {
    try {
      const response = await fetch("/api/admin/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, action: "reject" }),
      });
      if (!response.ok) throw new Error("Failed to reject");
      await fetchApprovals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
              Admin Queue
            </p>
            <h1 className="text-2xl font-semibold">Pending Approvals</h1>
            <p className="mt-1 text-sm text-brand-100">
              Review and approve inbound service requests
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading approvals...</p>
          </CardContent>
        </Card>
      ) : approvals.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p className="text-4xl mb-3">✓</p>
            <p className="font-semibold text-foreground">All caught up!</p>
            <p className="text-sm text-muted-foreground mt-1">
              No pending approvals. Check back later for new requests.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <h2 className="text-lg font-semibold text-accent">
              {approvals.length} Pending
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {approvals.map((approval) => (
                <div
                  key={approval.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-semibold text-foreground">
                          {approval.customerName || "Unknown"}
                        </span>
                        {approval.serviceType && (
                          <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                            {approval.serviceType.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>

                      {approval.aiSummary && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {approval.aiSummary}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
                        {approval.customerPhone && (
                          <div>
                            <p className="font-medium text-foreground">Phone</p>
                            <p>{approval.customerPhone}</p>
                          </div>
                        )}
                        {approval.customerEmail && (
                          <div>
                            <p className="font-medium text-foreground">Email</p>
                            <p className="truncate">{approval.customerEmail}</p>
                          </div>
                        )}
                        {approval.estimatedHours != null && (
                          <div>
                            <p className="font-medium text-foreground">Est. Hours</p>
                            <p>{approval.estimatedHours}</p>
                          </div>
                        )}
                        {approval.requestedDay && (
                          <div>
                            <p className="font-medium text-foreground">Requested</p>
                            <p>
                              {approval.requestedDay}
                              {approval.requestedTime ? ` at ${approval.requestedTime}` : ""}
                            </p>
                          </div>
                        )}
                      </div>

                      {approval.address && (
                        <p className="text-xs text-muted-foreground mt-3">
                          <span className="font-medium">Address: </span>
                          {approval.address}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 whitespace-nowrap">
                      <button
                        onClick={() => handleApprove(approval.id)}
                        className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(approval.id)}
                        className="px-4 py-2 rounded-lg bg-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-400 transition"
                      >
                        Reject
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-3">
                    Created {new Date(approval.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
