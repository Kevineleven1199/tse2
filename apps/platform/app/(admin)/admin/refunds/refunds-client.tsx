"use client";

import { useState } from "react";

interface Refund {
  id: string;
  tenantId: string;
  jobId: string | null;
  invoiceId: string | null;
  customerName: string;
  customerEmail: string;
  amount: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "PROCESSED" | "DENIED";
  processedBy: string | null;
  processedAt: string | null;
  stripeRefundId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function RefundsClient({
  initialRefunds,
}: {
  initialRefunds: Refund[];
}) {
  const [refunds, setRefunds] = useState<Refund[]>(initialRefunds);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleApprove = async (refundId: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/refunds/${refundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });
      if (!response.ok) throw new Error("Failed to approve refund");
      const updated = await response.json();
      setRefunds(refunds.map((r) => (r.id === refundId ? updated : r)));
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = async (refundId: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/refunds/${refundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DENIED" }),
      });
      if (!response.ok) throw new Error("Failed to deny refund");
      const updated = await response.json();
      setRefunds(refunds.map((r) => (r.id === refundId ? updated : r)));
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const colors =
      status === "APPROVED"
        ? "bg-green-100 text-green-800"
        : status === "PENDING"
          ? "bg-yellow-100 text-yellow-800"
          : status === "PROCESSED"
            ? "bg-blue-100 text-blue-800"
            : "bg-red-100 text-red-800";
    return (
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${colors}`}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {refunds.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No refunds yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 px-3 font-medium">Amount</th>
                <th className="pb-3 px-3 font-medium">Reason</th>
                <th className="pb-3 px-3 font-medium">Status</th>
                <th className="pb-3 px-3 font-medium">Date</th>
                <th className="pb-3 px-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((refund) => (
                <tr key={refund.id} className="border-b border-gray-100">
                  <td className="py-3 px-3 font-medium">${refund.amount.toFixed(2)}</td>
                  <td className="py-3 px-3 max-w-xs truncate">
                    {refund.reason}
                  </td>
                  <td className="py-3 px-3">{statusBadge(refund.status)}</td>
                  <td className="py-3 px-3">
                    {new Date(refund.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-3">
                    {refund.status === "PENDING" && (
                      deleteConfirmId === refund.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(refund.id)}
                            disabled={loading}
                            className="text-xs text-green-600 font-medium hover:text-green-700 disabled:opacity-50"
                          >
                            Yes, approve
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            disabled={loading}
                            className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDeleteConfirmId(refund.id)}
                            disabled={loading}
                            className="text-xs text-green-600 hover:text-green-800 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleDeny(refund.id)}
                            disabled={loading}
                            className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            Deny
                          </button>
                        </div>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
