"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { formatCurrency } from "@/src/lib/utils";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  FileText,
  MessageSquare,
  Activity,
  ArrowRight,
  MapPin,
  Phone,
  Mail,
  Edit2,
  Trash2,
  Save,
  X,
  Loader2,
  Send,
  Star,
  UserCheck,
  CalendarDays,
  Receipt,
} from "lucide-react";

interface ServiceRequest {
  id: string;
  status: string;
  serviceType: string;
  address: string;
  city: string;
  state: string;
  createdAt: string;
  scheduledDate?: string;
  jobStatus?: string;
  assignedCleaner?: string | null;
  quotedAmount: number;
  jobId?: string;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  method: string;
  date: string;
  isDeposit: boolean;
}

interface CrmLeadData {
  id: string;
  source: string;
  status: string;
  priority: number;
  lifecycleStage: string;
  lastContacted?: string;
  lifetimeValue: number;
  totalBookings: number;
}

type CommunicationItem = {
  type: "call" | "email" | "sms" | "note";
  id: string;
  date: string;
  direction?: string;
  summary?: string | null;
  sentiment?: string | null;
  duration?: number | null;
  subject?: string | null;
  aiSummary?: string | null;
  category?: string | null;
  status?: string | null;
  content?: string | null;
  pinned?: boolean;
  tags?: string | string[] | null;
};

type ActivityItem = {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  date: string;
};

interface CustomerDetailClientProps {
  customerData: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    status: string;
    isBlocked: boolean;
    memberSince: string;
    totalJobs: number;
    totalSpent: number;
    avgRating: number;
    loyaltyLevel: string;
    lastServiceDate?: string;
    serviceRequests: ServiceRequest[];
    payments: Payment[];
    crmLead: CrmLeadData | null;
    communications?: CommunicationItem[];
    recentActivity?: ActivityItem[];
    aiSummary?: string;
  };
  customerId: string;
}

export function CustomerDetailClient({
  customerData,
  customerId,
}: CustomerDetailClientProps) {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: customerData.name.split(" ")[0] || "",
    lastName: customerData.name.split(" ").slice(1).join(" ") || "",
    email: customerData.email,
    phone: customerData.phone || "",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) { setEditing(false); router.refresh(); }
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${customerData.name}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${customerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "block", reason: "Deleted by admin" }),
      });
      if (res.ok) router.push("/admin/crm");
    } finally { setDeleting(false); }
  };

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      NEW: "bg-blue-100 text-blue-800",
      QUOTED: "bg-yellow-100 text-yellow-800",
      ACCEPTED: "bg-green-100 text-green-800",
      SCHEDULED: "bg-purple-100 text-purple-800",
      COMPLETED: "bg-emerald-100 text-emerald-800",
      CANCELED: "bg-red-100 text-red-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      CLAIMED: "bg-blue-100 text-blue-800",
    };
    return statusMap[status] || "bg-gray-100 text-gray-800";
  };

  const getJobStatusIcon = (status?: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case "SCHEDULED":
        return <Calendar className="h-4 w-4 text-purple-600" />;
      case "PENDING":
      case "CLAIMED":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-800",
      AUTHORIZED: "bg-blue-100 text-blue-800",
      CAPTURED: "bg-emerald-100 text-emerald-800",
      REFUNDED: "bg-orange-100 text-orange-800",
      FAILED: "bg-red-100 text-red-800",
    };
    return statusMap[status] || "bg-gray-100 text-gray-800";
  };

  const formattedMemberSince = new Date(customerData.memberSince).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "jobs", label: "Jobs & Schedule" },
    { id: "payments", label: "Payments" },
    { id: "communication", label: "Communication" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <div className="space-y-4">
      {/* ── Profile Header ── */}
      <div className="rounded-3xl bg-gradient-to-br from-brand-800 via-brand-700 to-emerald-600 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold backdrop-blur-sm">
              {customerData.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              {editing ? (
                <div className="flex items-center gap-2">
                  <input value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName: e.target.value})}
                    className="rounded-lg bg-white/20 px-3 py-1 text-lg font-bold text-white placeholder:text-white/50 border border-white/30 w-32" placeholder="First" />
                  <input value={editForm.lastName} onChange={e => setEditForm({...editForm, lastName: e.target.value})}
                    className="rounded-lg bg-white/20 px-3 py-1 text-lg font-bold text-white placeholder:text-white/50 border border-white/30 w-32" placeholder="Last" />
                </div>
              ) : (
                <h1 className="text-2xl font-bold">{customerData.name}</h1>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-brand-100/80">
                {customerData.email && !customerData.email.includes("@import") && (
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {editing ?
                    <input value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})}
                      className="rounded bg-white/20 px-2 py-0.5 text-sm border border-white/30 w-48" />
                    : customerData.email}
                  </span>
                )}
                {(customerData.phone || editing) && (
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {editing ?
                    <input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})}
                      className="rounded bg-white/20 px-2 py-0.5 text-sm border border-white/30 w-36" />
                    : customerData.phone}
                  </span>
                )}
                <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Since {formattedMemberSince}</span>
              </div>
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {editing ? (
              <>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-bold text-accent shadow hover:bg-brand-50">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                </button>
                <button onClick={() => setEditing(false)}
                  className="flex items-center gap-1 rounded-full bg-white/20 border border-white/30 px-4 py-2 text-xs font-bold text-white hover:bg-white/30">
                  <X className="h-3 w-3" /> Cancel
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1 rounded-full bg-white/20 border border-white/30 px-4 py-2 text-xs font-bold text-white hover:bg-white/30">
                  <Edit2 className="h-3 w-3" /> Edit
                </button>
                {customerData.phone && (
                  <a href={`tel:${customerData.phone}`}
                    className="flex items-center gap-1 rounded-full bg-white/20 border border-white/30 px-4 py-2 text-xs font-bold text-white hover:bg-white/30">
                    <Phone className="h-3 w-3" /> Call
                  </a>
                )}
                {customerData.email && !customerData.email.includes("@import") && (
                  <a href={`mailto:${customerData.email}`}
                    className="flex items-center gap-1 rounded-full bg-white/20 border border-white/30 px-4 py-2 text-xs font-bold text-white hover:bg-white/30">
                    <Mail className="h-3 w-3" /> Email
                  </a>
                )}
                <Link href="/get-a-quote"
                  className="flex items-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-bold text-accent shadow hover:bg-brand-50">
                  <Send className="h-3 w-3" /> Send Estimate
                </Link>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex items-center gap-1 rounded-full bg-red-500/20 border border-red-300/30 px-4 py-2 text-xs font-bold text-white hover:bg-red-500/40">
                  {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Jobs</p>
          <p className="text-2xl font-bold text-accent">{customerData.totalJobs}</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Spent</p>
          <p className="text-2xl font-bold text-accent">{formatCurrency(customerData.totalSpent)}</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Loyalty</p>
          <p className="text-2xl font-bold text-accent">{customerData.loyaltyLevel}</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</p>
          <p className="text-2xl font-bold text-accent">{customerData.status}</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Last Service</p>
          <p className="text-lg font-bold text-accent">{customerData.lastServiceDate ? new Date(customerData.lastServiceDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Never"}</p>
        </div>
      </div>

      {/* ── Tabs + Content ── */}
      <div className="rounded-3xl border border-brand-100 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-brand-100 px-6 pt-4">
          <div className="flex gap-0 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`relative border-b-2 px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap ${
                  selectedTab === tab.id
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-muted-foreground hover:text-accent"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {selectedTab === "overview" && (
          <div className="space-y-6 p-6">
            {/* AI Customer Intelligence */}
            {customerData.aiSummary && (
              <div className="rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 to-white p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700 font-bold text-sm">AI</span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-600 mb-1">Customer Intelligence Summary</p>
                    <p className="text-sm text-accent leading-relaxed">{customerData.aiSummary}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Customer Information */}
              <Card className="border border-brand-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Email</p>
                    <p className="font-semibold break-all">{customerData.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Phone</p>
                    <p className="font-semibold">
                      {customerData.phone || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Status</p>
                    <Badge
                      className={`${
                        customerData.isBlocked
                          ? "bg-red-100 text-red-800"
                          : customerData.status === "Active"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {customerData.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Member Since
                    </p>
                    <p className="font-semibold">{formattedMemberSince}</p>
                  </div>
                </CardContent>
              </Card>

              {/* CRM Information (if available) */}
              {customerData.crmLead && (
                <Card className="border border-brand-100">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">
                      CRM Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Lifecycle Stage
                      </p>
                      <p className="font-semibold">
                        {customerData.crmLead.lifecycleStage.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Lead Source
                      </p>
                      <p className="font-semibold">
                        {customerData.crmLead.source.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Priority
                      </p>
                      <Badge
                        className={`${
                          customerData.crmLead.priority === 1
                            ? "bg-red-100 text-red-800"
                            : customerData.crmLead.priority === 2
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                        }`}
                      >
                        {customerData.crmLead.priority === 1
                          ? "High"
                          : customerData.crmLead.priority === 2
                            ? "Medium"
                            : "Low"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Lifetime Value
                      </p>
                      <p className="font-semibold">
                        {formatCurrency(customerData.crmLead.lifetimeValue)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Service Summary */}
            <Card className="border border-brand-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Service Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-brand-600">
                      {customerData.totalJobs}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Total Services</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-brand-600">
                      {formatCurrency(customerData.totalSpent)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Total Revenue</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-brand-600">
                      {customerData.totalJobs > 0
                        ? formatCurrency(
                            customerData.totalSpent / customerData.totalJobs
                          )
                        : "$0"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Average per Service
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Jobs & Schedule Tab */}
        {selectedTab === "jobs" && (
          <div className="space-y-4 p-6">
            {customerData.serviceRequests.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 p-12 text-center">
                <p className="text-muted-foreground">No service requests yet</p>
                <Link href={`/admin/customers/${customerId}/new-job`}>
                  <Button variant="outline" size="sm" className="mt-4">
                    Create First Job
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {customerData.serviceRequests.map((request) => (
                  <Card
                    key={request.id}
                    className="border border-brand-100 hover:border-brand-300 transition-colors"
                  >
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{request.serviceType}</p>
                              <Badge className={getStatusColor(request.status)}>
                                {request.status}
                              </Badge>
                              {request.jobStatus && (
                                <div className="flex items-center gap-1">
                                  {getJobStatusIcon(request.jobStatus)}
                                  <span className="text-xs text-muted-foreground">
                                    {request.jobStatus}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="h-4 w-4 flex-shrink-0" />
                                <span>
                                  {request.address}, {request.city}, {request.state}
                                </span>
                              </div>

                              {request.scheduledDate && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Calendar className="h-4 w-4 flex-shrink-0" />
                                  <span>
                                    {new Date(request.scheduledDate).toLocaleDateString()}{" "}
                                    {new Date(request.scheduledDate).toLocaleTimeString(
                                      "en-US",
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      }
                                    )}
                                  </span>
                                </div>
                              )}

                              {request.assignedCleaner && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <p className="text-xs">
                                    <span className="font-semibold">Cleaner:</span>{" "}
                                    {request.assignedCleaner}
                                  </p>
                                </div>
                              )}

                              <div className="flex items-center gap-2 text-muted-foreground">
                                <DollarSign className="h-4 w-4 flex-shrink-0" />
                                <span className="font-semibold">
                                  {formatCurrency(request.quotedAmount)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {request.jobId && (
                            <Link href={`/admin/schedule?jobId=${request.jobId}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 ml-4"
                              >
                                View in Schedule
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground pt-2 border-t border-brand-100">
                          Created: {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payments Tab */}
        {selectedTab === "payments" && (
          <div className="space-y-4 p-6">
            {customerData.payments.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 p-12 text-center">
                <p className="text-muted-foreground">No payment records yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-brand-100">
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                        Amount
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                        Method
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                        Type
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerData.payments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="border-b border-brand-50 hover:bg-brand-50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          {new Date(payment.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="py-3 px-4 capitalize text-muted-foreground">
                          {payment.method}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">
                            {payment.isDeposit ? "Deposit" : "Full Payment"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getPaymentStatusColor(payment.status)}>
                            {payment.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Communication Tab */}
        {selectedTab === "communication" && (
          <div className="space-y-4 p-6">
            {/* AI Summary */}
            {customerData.aiSummary && (
              <Card className="border border-brand-200 bg-gradient-to-r from-brand-50 to-white">
                <CardContent className="pt-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-sm">AI</span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-brand-600 mb-1">Customer Intelligence</p>
                      <p className="text-sm text-accent leading-relaxed">{customerData.aiSummary}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Unified Timeline */}
            <Card className="border border-brand-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Communication Timeline ({customerData.communications?.length ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(!customerData.communications || customerData.communications.length === 0) ? (
                  <div className="rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 p-12 text-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-4 opacity-40" />
                    <p className="text-muted-foreground">No communications on record yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customerData.communications.map((comm) => {
                      const icons: Record<string, string> = { call: "📞", email: "📧", sms: "💬", note: "📝" };
                      const colors: Record<string, string> = {
                        call: "border-blue-200 bg-blue-50",
                        email: "border-purple-200 bg-purple-50",
                        sms: "border-green-200 bg-green-50",
                        note: "border-amber-200 bg-amber-50",
                      };
                      return (
                        <div key={comm.id} className={`rounded-xl border p-3.5 ${colors[comm.type] ?? "border-brand-100 bg-brand-50/30"}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <span className="text-lg">{icons[comm.type] ?? "📋"}</span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold uppercase tracking-wider text-accent">{comm.type}</span>
                                  {comm.direction && (
                                    <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-semibold ${comm.direction === "inbound" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                                      {comm.direction}
                                    </span>
                                  )}
                                  {comm.sentiment && (
                                    <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-semibold ${
                                      comm.sentiment === "positive" ? "bg-green-100 text-green-700" :
                                      comm.sentiment === "negative" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                                    }`}>{comm.sentiment}</span>
                                  )}
                                  {comm.pinned && <span className="text-[10px]">📌</span>}
                                </div>
                                <p className="text-sm text-accent mt-0.5">
                                  {comm.subject || comm.summary || comm.aiSummary || comm.content || "No content"}
                                </p>
                                {comm.category && <span className="text-[10px] text-muted-foreground">{comm.category}</span>}
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {new Date(comm.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Activity Tab */}
        {selectedTab === "activity" && (
          <div className="space-y-4 p-6">
            <Card className="border border-brand-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customerData.serviceRequests.length > 0 ? (
                    customerData.serviceRequests.map((request, idx) => (
                      <div
                        key={request.id}
                        className={`flex gap-4 pb-4 ${
                          idx !== customerData.serviceRequests.length - 1
                            ? "border-b border-brand-100"
                            : ""
                        }`}
                      >
                        <div className="mt-1">
                          {request.jobStatus === "COMPLETED" ? (
                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <FileText className="h-5 w-5 text-brand-600" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="font-semibold text-sm">
                            {request.jobStatus === "COMPLETED"
                              ? "Service Completed"
                              : "Service Requested"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.serviceType} - {request.address}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(request.createdAt).toLocaleDateString()} at{" "}
                            {new Date(request.createdAt).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground">
                      No activity yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
