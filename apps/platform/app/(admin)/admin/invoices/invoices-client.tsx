"use client";

import { useState, useMemo } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";

interface Invoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  serviceRequestId: string | null;
  jobId: string | null;
  lineItems: unknown;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  status: "DRAFT" | "SENT" | "VIEWED" | "PAID" | "OVERDUE" | "CANCELLED";
  dueDate: string | null;
  sentAt: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function InvoicesClient({
  initialInvoices,
}: {
  initialInvoices: Invoice[];
}) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "DRAFT" | "SENT" | "VIEWED" | "PAID" | "OVERDUE" | "CANCELLED">(
    "all"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
        inv.customerEmail.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  const handleSendInvoice = async (invoiceId: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/invoices/${invoiceId}/send`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to send invoice");
      }

      const updatedInvoice = await response.json();
      setInvoices(
        invoices.map((inv) =>
          inv.id === invoiceId ? updatedInvoice : inv
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/invoices/${invoiceId}/pay`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to mark invoice as paid");
      const updatedInvoice = await response.json();
      setInvoices(invoices.map((inv) => (inv.id === invoiceId ? updatedInvoice : inv)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-800";
      case "SENT":
        return "bg-blue-100 text-blue-800";
      case "VIEWED":
        return "bg-purple-100 text-purple-800";
      case "OVERDUE":
        return "bg-red-100 text-red-800";
      case "CANCELLED":
        return "bg-gray-100 text-gray-800";
      case "DRAFT":
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-4 items-center">
        <Input
          type="text"
          placeholder="Search invoices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="VIEWED">Viewed</option>
          <option value="PAID">Paid</option>
          <option value="OVERDUE">Overdue</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No invoices found.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4">Invoice #</th>
                <th className="text-left py-3 px-4">Customer</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-right py-3 px-4">Amount</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Due Date</th>
                <th className="text-center py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((invoice) => (
                <tr key={invoice.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-xs">{invoice.invoiceNumber}</td>
                  <td className="py-3 px-4">{invoice.customerName}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {invoice.customerEmail}
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    ${invoice.total.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {invoice.dueDate
                      ? new Date(invoice.dueDate).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="py-3 px-4 text-center space-x-1">
                    {invoice.status === "DRAFT" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendInvoice(invoice.id)}
                        disabled={loading}
                      >
                        Send
                      </Button>
                    )}
                    {(invoice.status === "SENT" || invoice.status === "VIEWED" || invoice.status === "OVERDUE") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkPaid(invoice.id)}
                        disabled={loading}
                      >
                        Mark Paid
                      </Button>
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
