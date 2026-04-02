"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail, MessageSquare, Phone, History, Upload, Download } from "lucide-react";
import type { CustomerLifecycleStage } from "@prisma/client";
import { CsvImportModal } from "@/src/components/crm/CsvImportModal";

type Lead = {
  id: string;
  businessName: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  website: string | null;
  industry: string | null;
  sqft: number | null;
  source: string;
  status: string;
  priority: number;
  score: number;
  callCount: number;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  lifecycleStage: CustomerLifecycleStage;
  communicationPreference: string;
  leadTemperature: string;
  lifetimeValue: number;
  totalBookings: number;
  notes: string | null;
  aiInsights: string | null;
  tags: string[];
  assignedTo: string | null;
  metadata: any;
};

type Stats = {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  won: number;
  lost: number;
  hotLeads: number;
};

const LIFECYCLE_STAGES: Record<CustomerLifecycleStage, { label: string; color: string; bgColor: string }> = {
  COLD_LEAD: { label: "Cold Lead", color: "text-blue-700", bgColor: "bg-blue-100" },
  WARM_LEAD: { label: "Warm Lead", color: "text-amber-700", bgColor: "bg-amber-100" },
  PROSPECT: { label: "Prospect", color: "text-orange-700", bgColor: "bg-orange-100" },
  FIRST_TIME_CUSTOMER: { label: "First Customer", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  REPEAT_CUSTOMER: { label: "Repeat Customer", color: "text-green-700", bgColor: "bg-green-100" },
  LOYAL_CUSTOMER: { label: "Loyal/VIP", color: "text-teal-700", bgColor: "bg-teal-100" },
  REFERRER: { label: "Referrer", color: "text-purple-700", bgColor: "bg-purple-100" },
  CHAMPION: { label: "Champion", color: "text-pink-700", bgColor: "bg-pink-100" },
};

export default function LeadsPageClient({ userId, userName, role }: { userId: string; userName: string; role: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState<"all" | CustomerLifecycleStage>("all");
  const [temperatureFilter, setTemperatureFilter] = useState<"all" | "cold" | "warm" | "hot">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [callOutcome, setCallOutcome] = useState<{ leadId: string; show: boolean } | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [showActivityTimeline, setShowActivityTimeline] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const handleExportCSV = useCallback(() => {
    if (leads.length === 0) return;
    const headers = ["Business Name", "Contact Name", "Email", "Phone", "Address", "City", "State", "Industry", "Sqft", "Status", "Priority", "Score", "Lifecycle Stage", "Notes", "Source"];
    const rows = leads.map((l) => [
      l.businessName, l.contactName ?? "", l.contactEmail ?? "", l.contactPhone ?? "",
      l.address ?? "", l.city ?? "", l.state ?? "", l.industry ?? "", String(l.sqft ?? ""),
      l.status, String(l.priority), String(l.score), l.lifecycleStage, l.notes ?? "", l.source ?? "",
    ]);
    const csvContent = [headers, ...rows].map((r) => r.map((f) => `"${(f || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [leads]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== "all") params.set("stage", filter);
    if (temperatureFilter !== "all") params.set("temperature", temperatureFilter);
    if (search) params.set("search", search);
    const res = await fetch(`/api/crm/leads?${params}`);
    const data = await res.json();
    setLeads(data.leads || []);
    setStats(data.stats || null);
    setLoading(false);
  }, [filter, temperatureFilter, search]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const priorityLabel = (p: number) => p === 1 ? "🔥 Hot" : p === 2 ? "🟡 Warm" : "🔵 Cold";
  const priorityColor = (p: number) => p === 1 ? "bg-red-100 text-red-700" : p === 2 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700";

  const logCall = async (leadId: string, outcome: string, notes: string, followUpDays?: number) => {
    await fetch("/api/crm/call-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "log_call", leadId, outcome, notes, nextFollowUpDays: followUpDays }),
    });
    setCallOutcome(null);
    fetchLeads();
  };

  const bulkEmail = async () => {
    if (selectedLeads.size === 0) return;
    const emailList = leads
      .filter((l) => selectedLeads.has(l.id))
      .map((l) => l.contactEmail)
      .filter(Boolean)
      .join(",");
    window.location.href = `mailto:${emailList}`;
  };

  const bulkMoveStage = async (stage: CustomerLifecycleStage) => {
    for (const leadId of selectedLeads) {
      await fetch("/api/crm/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, stage }),
      });
    }
    setSelectedLeads(new Set());
    fetchLeads();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-8 text-white shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">CRM</p>
            <h1 className="text-2xl font-semibold">Lead Management</h1>
            <p className="mt-1 text-sm text-brand-100">Complete lifecycle from cold lead to champion referrer</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 rounded-full bg-white/20 border border-white/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/30 transition">
              <Upload className="h-3.5 w-3.5" /> Import CSV
            </button>
            <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-full bg-white/20 border border-white/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/30 transition">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button onClick={() => setShowAdd(true)} className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-brand-700 shadow-md hover:bg-brand-50 hover:shadow-lg transition duration-200">
              + Add Lead
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {[
            { label: "Total", value: stats.total, color: "text-gray-700" },
            { label: "New", value: stats.new, color: "text-emerald-600" },
            { label: "Contacted", value: stats.contacted, color: "text-sky-600" },
            { label: "Qualified", value: stats.qualified, color: "text-purple-600" },
            { label: "Won", value: stats.won, color: "text-green-600" },
            { label: "Lost", value: stats.lost, color: "text-gray-400" },
            { label: "Hot", value: stats.hotLeads, color: "text-red-600" },
          ].map((s) => (
            <div key={s.label} className="card-hover rounded-2xl border border-brand-100 bg-white p-4 text-center shadow-sm">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs font-medium text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lifecycle Stage Tabs */}
      <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-gray-700">Filter by Lifecycle Stage:</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === "all"
                ? "bg-brand-600 text-white"
                : "bg-white border border-brand-200 text-brand-700 hover:bg-brand-50"
            }`}
          >
            All Stages
          </button>
          {(Object.keys(LIFECYCLE_STAGES) as CustomerLifecycleStage[]).map((stage) => {
            const stageInfo = LIFECYCLE_STAGES[stage];
            return (
              <button
                key={stage}
                onClick={() => setFilter(stage)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  filter === stage
                    ? `${stageInfo.bgColor} ${stageInfo.color}`
                    : "bg-white border border-brand-200 text-brand-700 hover:bg-brand-50"
                }`}
              >
                {stageInfo.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Temperature + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1.5">
          {(["all", "cold", "warm", "hot"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTemperatureFilter(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                temperatureFilter === t
                  ? t === "cold" ? "bg-blue-100 text-blue-700" : t === "warm" ? "bg-amber-100 text-amber-700" : t === "hot" ? "bg-red-100 text-red-700" : "bg-brand-100 text-brand-700"
                  : "bg-white border border-brand-200 text-brand-700 hover:bg-brand-50"
              }`}
            >
              {t === "all" ? "All" : t === "cold" ? "🔵 Cold" : t === "warm" ? "🟡 Warm" : "🔥 Hot"}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search leads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto rounded-lg border border-brand-200 px-3 py-1.5 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>

      {/* Bulk Actions */}
      {selectedLeads.size > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between shadow-sm">
          <p className="text-sm font-medium text-amber-900">{selectedLeads.size} leads selected</p>
          <div className="flex gap-2">
            <button onClick={bulkEmail} className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition duration-200">
              <Mail size={14} className="inline mr-1" /> Email
            </button>
            <button onClick={() => setSelectedLeads(new Set())} className="rounded-lg bg-gray-200 text-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-300 transition duration-200">
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Leads Table */}
      <div className="overflow-x-auto rounded-2xl border border-brand-100 bg-white shadow-sm card-hover">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No leads found.</p>
            <button onClick={() => setShowAdd(true)} className="mt-3 text-sm text-brand-600 hover:underline">
              Add your first lead →
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50/80 text-left text-xs font-semibold uppercase tracking-wider text-brand-600">
              <tr>
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedLeads.size === leads.length && leads.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLeads(new Set(leads.map((l) => l.id)));
                      } else {
                        setSelectedLeads(new Set());
                      }
                    }}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Bookings</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Follow-up</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {leads.map((lead) => (
                <tr key={lead.id} className="transition hover:bg-brand-50/70">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedLeads.has(lead.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedLeads);
                        if (e.target.checked) {
                          newSet.add(lead.id);
                        } else {
                          newSet.delete(lead.id);
                        }
                        setSelectedLeads(newSet);
                      }}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold ${lead.score >= 80 ? "bg-green-100 text-green-700" : lead.score >= 50 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                      {lead.score}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-accent">{lead.businessName}</p>
                    {lead.contactName && <p className="text-xs text-muted-foreground">{lead.contactName}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LIFECYCLE_STAGES[lead.lifecycleStage].bgColor} ${LIFECYCLE_STAGES[lead.lifecycleStage].color}`}>
                      {LIFECYCLE_STAGES[lead.lifecycleStage].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{lead.contactPhone || "—"}</td>
                  <td className="px-4 py-3 text-center font-semibold">{lead.totalBookings}</td>
                  <td className="px-4 py-3">${lead.lifetimeValue.toFixed(0)}</td>
                  <td className="px-4 py-3 text-xs">
                    {lead.nextFollowUpAt ? (
                      <span className={new Date(lead.nextFollowUpAt) < new Date() ? "text-red-600 font-semibold" : ""}>
                        {new Date(lead.nextFollowUpAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {lead.contactPhone && (
                        <a href={`tel:${lead.contactPhone}`} className="rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition duration-200">
                          <Phone size={12} className="inline" />
                        </a>
                      )}
                      {lead.contactEmail && (
                        <a href={`mailto:${lead.contactEmail}`} className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition duration-200">
                          <Mail size={12} className="inline" />
                        </a>
                      )}
                      <button onClick={() => setShowActivityTimeline(lead.id)} className="rounded-lg bg-purple-50 px-2.5 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 transition duration-200">
                        <History size={12} className="inline" />
                      </button>
                      <button onClick={() => setEditLead(lead)} className="rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition duration-200">
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {callOutcome?.show && (
        <CallOutcomeModal
          leadId={callOutcome.leadId}
          onLog={logCall}
          onClose={() => setCallOutcome(null)}
        />
      )}

      {(showAdd || editLead) && (
        <AddEditLeadModal
          lead={editLead}
          onSave={async (data) => {
            await fetch("/api/crm/leads", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            setShowAdd(false);
            setEditLead(null);
            fetchLeads();
          }}
          onClose={() => {
            setShowAdd(false);
            setEditLead(null);
          }}
        />
      )}

      {showActivityTimeline && (
        <ActivityTimelineModal
          leadId={showActivityTimeline}
          leadName={leads.find((l) => l.id === showActivityTimeline)?.businessName || ""}
          onClose={() => setShowActivityTimeline(null)}
        />
      )}

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={() => { setShowImport(false); fetchLeads(); }}
        importType="lead"
      />
    </div>
  );
}

// ─── Call Outcome Modal ───
function CallOutcomeModal({ leadId, onLog, onClose }: { leadId: string; onLog: (id: string, outcome: string, notes: string, days?: number) => void; onClose: () => void }) {
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [followUpDays, setFollowUpDays] = useState(3);

  const outcomes = [
    { value: "answered", label: "Answered", icon: "✅" },
    { value: "voicemail", label: "Left Voicemail", icon: "📞" },
    { value: "no_answer", label: "No Answer", icon: "📵" },
    { value: "interested", label: "Interested!", icon: "🌟" },
    { value: "appointment_set", label: "Appointment Set", icon: "📅" },
    { value: "not_interested", label: "Not Interested", icon: "❌" },
    { value: "wrong_number", label: "Wrong Number", icon: "🚫" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-accent">Log Call Outcome</h3>
        <div className="mt-6 grid grid-cols-2 gap-2">
          {outcomes.map((o) => (
            <button
              key={o.value}
              onClick={() => setOutcome(o.value)}
              className={`rounded-lg border px-3 py-2 text-sm text-left font-medium transition ${outcome === o.value ? "border-brand-600 bg-brand-50 text-brand-700" : "border-brand-100 text-accent hover:bg-brand-50/60"}`}
            >
              {o.icon} {o.label}
            </button>
          ))}
        </div>
        <textarea
          placeholder="Call notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-4 w-full rounded-lg border border-brand-100 p-3 text-sm focus:ring-2 focus:ring-brand-200 focus:border-transparent"
          rows={3}
        />
        {!["not_interested", "wrong_number"].includes(outcome) && (
          <div className="mt-3 flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Follow up in</label>
            <select
              value={followUpDays}
              onChange={(e) => setFollowUpDays(parseInt(e.target.value))}
              className="rounded border border-brand-200 px-2 py-1 text-sm"
            >
              <option value={1}>1 day</option>
              <option value={2}>2 days</option>
              <option value={3}>3 days</option>
              <option value={5}>5 days</option>
              <option value={7}>1 week</option>
              <option value={14}>2 weeks</option>
              <option value={30}>1 month</option>
            </select>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-100 transition duration-200">
            Cancel
          </button>
          <button
            onClick={() => outcome && onLog(leadId, outcome, notes, followUpDays)}
            disabled={!outcome}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Activity Timeline Modal ───
function ActivityTimelineModal({ leadId, leadName, onClose }: { leadId: string; leadName: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-md max-h-96 overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-accent">Activity Timeline</h3>
        <p className="mt-1 text-sm text-gray-600">{leadName}</p>
        <div className="mt-6 space-y-4">
          <p className="text-center text-sm text-gray-500">Loading activity...</p>
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-100 transition duration-200">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add/Edit Lead Modal ───
function AddEditLeadModal({ lead, onSave, onClose }: { lead: Lead | null; onSave: (data: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    id: lead?.id || undefined,
    businessName: lead?.businessName || "",
    contactName: lead?.contactName || "",
    contactPhone: lead?.contactPhone || "",
    contactEmail: lead?.contactEmail || "",
    address: lead?.address || "",
    city: lead?.city || "Austin",
    state: "TX",
    industry: lead?.industry || "",
    sqft: lead?.sqft?.toString() || "",
    source: lead?.source || "cold_call",
    lifecycleStage: lead?.lifecycleStage || "COLD_LEAD",
    communicationPreference: lead?.communicationPreference || "email",
    notes: lead?.notes || "",
  });

  const set = (key: string, value: any) => setForm((p) => ({ ...p, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-accent">{lead ? "Edit Lead" : "Add New Lead"}</h3>
        <div className="mt-6 space-y-3">
          <input
            placeholder="Business Name *"
            value={form.businessName}
            onChange={(e) => set("businessName", e.target.value)}
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-200 focus:border-transparent"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Contact Name"
              value={form.contactName}
              onChange={(e) => set("contactName", e.target.value)}
              className="rounded-lg border border-brand-100 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-200 focus:border-transparent"
            />
            <input
              placeholder="Phone"
              value={form.contactPhone}
              onChange={(e) => set("contactPhone", e.target.value)}
              className="rounded-lg border border-brand-100 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-200 focus:border-transparent"
            />
          </div>
          <input
            placeholder="Email"
            value={form.contactEmail}
            onChange={(e) => set("contactEmail", e.target.value)}
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-200 focus:border-transparent"
          />
          <input
            placeholder="Address"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-200 focus:border-transparent"
          />
          <div className="grid grid-cols-3 gap-3">
            <input
              placeholder="City"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              className="rounded-lg border border-brand-100 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-200 focus:border-transparent"
            />
            <select
              value={form.industry}
              onChange={(e) => set("industry", e.target.value)}
              className="rounded-lg border border-brand-100 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-200 focus:border-transparent"
            >
              <option value="">Industry</option>
              {["restaurant", "medical_office", "dental_office", "law_firm", "real_estate_office", "gym", "yoga_studio", "salon", "hotel", "retail_store", "office", "other"].map((i) => (
                <option key={i} value={i}>
                  {i.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <input
              placeholder="Sqft"
              value={form.sqft}
              onChange={(e) => set("sqft", e.target.value)}
              className="rounded-lg border border-brand-100 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-200 focus:border-transparent"
              type="number"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.source} onChange={(e) => set("source", e.target.value)} className="rounded-lg border border-brand-100 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-200 focus:border-transparent">
              {["cold_call", "referral", "website", "google", "ai_discovery"].map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <select value={form.lifecycleStage} onChange={(e) => set("lifecycleStage", e.target.value)} className="rounded-lg border border-brand-100 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-200 focus:border-transparent">
              {(Object.keys(LIFECYCLE_STAGES) as CustomerLifecycleStage[]).map((stage) => (
                <option key={stage} value={stage}>
                  {LIFECYCLE_STAGES[stage].label}
                </option>
              ))}
            </select>
          </div>
          <textarea
            placeholder="Notes..."
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="w-full rounded-lg border border-brand-100 p-3 text-sm focus:ring-2 focus:ring-brand-200 focus:border-transparent"
            rows={3}
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-100 transition duration-200">
            Cancel
          </button>
          <button
            onClick={() => form.businessName && onSave({ ...form, sqft: form.sqft ? parseInt(form.sqft) : null })}
            disabled={!form.businessName}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {lead ? "Update" : "Create Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}
