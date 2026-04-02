"use client";

import { useState, useEffect, useCallback } from "react";

type CallLead = {
  id: string;
  businessName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  city: string | null;
  industry: string | null;
  sqft: number | null;
  status: string;
  priority: number;
  score: number;
  callCount: number;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  notes: string | null;
  aiInsights: string | null;
  tags: string[];
  metadata: any;
  position: number;
  callAction: string;
  suggestedScript: string;
};

export default function CallListClient({ userId, userName }: { userId: string; userName: string }) {
  const [callList, setCallList] = useState<CallLead[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [mode, setMode] = useState("smart");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeLead, setActiveLead] = useState<CallLead | null>(null);
  const [callNotes, setCallNotes] = useState("");
  const [showScript, setShowScript] = useState<string | null>(null);

  const fetchCallList = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/crm/call-lists?mode=${mode}`);
    const data = await res.json();
    setCallList(data.callList || []);
    setStats(data.stats || null);
    setLoading(false);
  }, [mode]);

  useEffect(() => { fetchCallList(); }, [fetchCallList]);

  const generateLeads = async () => {
    setGenerating(true);
    const res = await fetch("/api/crm/call-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate" }),
    });
    const data = await res.json();
    setGenerating(false);
    if (data.added > 0) fetchCallList();
    alert(`Generated ${data.generated || 0} prospects, added ${data.added || 0} new leads (${data.duplicatesSkipped || 0} duplicates skipped)`);
  };

  const logCall = async (leadId: string, outcome: string) => {
    await fetch("/api/crm/call-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "log_call", leadId, outcome, notes: callNotes }),
    });
    setActiveLead(null);
    setCallNotes("");
    fetchCallList();
  };

  const nextLead = () => {
    if (!activeLead) {
      setActiveLead(callList[0] || null);
    } else {
      const idx = callList.findIndex((l) => l.id === activeLead.id);
      setActiveLead(callList[idx + 1] || null);
    }
    setCallNotes("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-200">AI Power Dialer</p>
            <h1 className="text-2xl font-semibold">Commercial Call Lists</h1>
            <p className="mt-1 text-sm text-emerald-100">AI-generated prospect lists with smart call sequencing</p>
          </div>
          <div className="flex gap-2">
            <button onClick={generateLeads} disabled={generating}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 shadow hover:bg-emerald-50 transition disabled:opacity-50">
              {generating ? "Generating..." : "🤖 AI Generate Leads"}
            </button>
            <button onClick={nextLead}
              className="rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-900 transition">
              ▶ Start Calling
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "In Today's List", value: stats.totalInList, icon: "📋" },
            { label: "Overdue Follow-ups", value: stats.followUpsOverdue, icon: "⚠️" },
            { label: "Calls Made Today", value: stats.callsMadeToday, icon: "📞" },
            { label: "Hot Leads", value: stats.hotLeads, icon: "🔥" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-brand-100 bg-white p-4">
              <p className="text-xs text-muted-foreground">{s.icon} {s.label}</p>
              <p className="mt-1 text-2xl font-bold text-accent">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Mode Tabs */}
      <div className="flex gap-2">
        {[
          { value: "smart", label: "🧠 Smart Queue" },
          { value: "followups", label: "📅 Follow-ups" },
          { value: "new", label: "✨ Fresh Leads" },
        ].map((m) => (
          <button key={m.value} onClick={() => setMode(m.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${mode === m.value ? "bg-emerald-600 text-white" : "bg-white border border-brand-200 text-brand-700 hover:bg-brand-50"}`}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Active Call Panel */}
      {activeLead && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">NOW CALLING</p>
              <h2 className="mt-1 text-xl font-bold text-accent">{activeLead.businessName}</h2>
              {activeLead.contactName && (
                <p className="text-sm text-muted-foreground">
                  {activeLead.contactName}
                  {activeLead.metadata?.ownerTitle && <span className="text-xs ml-1">({activeLead.metadata.ownerTitle})</span>}
                </p>
              )}
              {activeLead.contactEmail && <p className="text-xs text-emerald-200">{activeLead.contactEmail}</p>}
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {activeLead.industry && <span className="rounded-full bg-white px-2 py-0.5 border">{activeLead.industry.replace(/_/g, " ")}</span>}
                {activeLead.city && <span className="rounded-full bg-white px-2 py-0.5 border">📍 {activeLead.city}</span>}
                {activeLead.sqft && <span className="rounded-full bg-white px-2 py-0.5 border">🏢 {activeLead.sqft.toLocaleString()} sqft</span>}
                <span className="rounded-full bg-white px-2 py-0.5 border">📞 {activeLead.callCount} previous calls</span>
                {activeLead.tags?.includes("emailed") && <span className="rounded-full bg-blue-100 px-2 py-0.5 border border-blue-200 text-blue-700">📧 Emailed</span>}
                {activeLead.metadata?.bestTimeToCall && <span className="rounded-full bg-amber-100 px-2 py-0.5 border border-amber-200 text-amber-700">🕐 {activeLead.metadata.bestTimeToCall}</span>}
              </div>
            </div>
            <a href={`tel:${activeLead.contactPhone}`}
              className="rounded-full bg-green-600 px-6 py-3 text-lg font-bold text-white shadow-lg hover:bg-green-700 transition">
              📞 {activeLead.contactPhone}
            </a>
          </div>

          {/* AI Insights */}
          {activeLead.aiInsights && (
            <div className="mt-4 rounded-lg bg-white p-3 border border-emerald-200">
              <p className="text-xs font-semibold text-emerald-600 mb-1">🤖 AI Insight</p>
              <p className="text-sm text-muted-foreground">{activeLead.aiInsights}</p>
            </div>
          )}

          {/* Suggested Script */}
          <div className="mt-3 rounded-lg bg-white p-3 border border-emerald-200">
            <p className="text-xs font-semibold text-emerald-600 mb-1">📝 Suggested Script</p>
            <p className="text-sm text-muted-foreground italic">{activeLead.suggestedScript}</p>
          </div>

          {/* Previous Notes */}
          {activeLead.notes && (
            <div className="mt-3 rounded-lg bg-amber-50 p-3 border border-amber-200">
              <p className="text-xs font-semibold text-amber-600 mb-1">📒 Previous Notes</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{activeLead.notes}</p>
            </div>
          )}

          {/* Call Notes */}
          <textarea placeholder="Type call notes here..." value={callNotes} onChange={(e) => setCallNotes(e.target.value)}
            className="mt-4 w-full rounded-lg border border-emerald-200 p-3 text-sm" rows={2} />

          {/* Outcome Buttons */}
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { value: "answered", label: "✅ Answered", color: "bg-sky-50 text-sky-700 border-sky-200" },
              { value: "voicemail", label: "📞 Voicemail", color: "bg-amber-50 text-amber-700 border-amber-200" },
              { value: "no_answer", label: "📵 No Answer", color: "bg-gray-50 text-gray-600 border-gray-200" },
              { value: "interested", label: "🌟 Interested!", color: "bg-green-50 text-green-700 border-green-200" },
              { value: "appointment_set", label: "📅 Appt Set", color: "bg-purple-50 text-purple-700 border-purple-200" },
              { value: "not_interested", label: "❌ Not Interested", color: "bg-red-50 text-red-600 border-red-200" },
            ].map((o) => (
              <button key={o.value} onClick={() => logCall(activeLead.id, o.value)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:shadow ${o.color}`}>
                {o.label}
              </button>
            ))}
            <button onClick={nextLead}
              className="ml-auto rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition">
              Skip → Next
            </button>
          </div>
        </div>
      )}

      {/* Call List */}
      <div className="overflow-x-auto rounded-xl border border-brand-100 bg-white">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading call list...</div>
        ) : callList.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">No leads in queue</p>
            <p className="mt-1 text-sm text-muted-foreground">Generate AI leads or add them from CRM</p>
            <button onClick={generateLeads} disabled={generating}
              className="mt-4 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700 transition">
              🤖 Generate Commercial Leads
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-emerald-50/50 text-left text-xs uppercase tracking-wider text-emerald-600">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Industry</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Calls</th>
                <th className="px-4 py-3">Script</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {callList.map((lead) => (
                <tr key={lead.id} className={`hover:bg-emerald-25 transition cursor-pointer ${activeLead?.id === lead.id ? "bg-emerald-50" : ""}`}
                  onClick={() => { setActiveLead(lead); setCallNotes(""); }}>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{lead.position}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      lead.callAction === "FIRST CALL" ? "bg-emerald-100 text-emerald-700" :
                      lead.callAction === "FOLLOW UP" ? "bg-amber-100 text-amber-700" :
                      lead.callAction === "CLOSE" ? "bg-purple-100 text-purple-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {lead.callAction}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{lead.businessName}</p>
                    {lead.contactName && (
                      <p className="text-xs text-muted-foreground">
                        {lead.contactName}
                        {lead.metadata?.ownerTitle && <span className="ml-1 text-gray-400">({lead.metadata.ownerTitle})</span>}
                      </p>
                    )}
                    {lead.tags?.includes("emailed") && <span className="text-xs text-blue-500">📧</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">{lead.industry?.replace(/_/g, " ") || "—"}</td>
                  <td className="px-4 py-3">
                    <a href={`tel:${lead.contactPhone}`} className="font-mono text-xs text-emerald-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                      {lead.contactPhone}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                      lead.score >= 80 ? "bg-green-100 text-green-700" : lead.score >= 50 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
                    }`}>{lead.score}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs">{lead.callCount}</td>
                  <td className="px-4 py-3">
                    <button onClick={(e) => { e.stopPropagation(); setShowScript(showScript === lead.id ? null : lead.id); }}
                      className="text-xs text-emerald-600 hover:underline">
                      {showScript === lead.id ? "Hide" : "View"}
                    </button>
                    {showScript === lead.id && (
                      <div className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs text-muted-foreground italic max-w-xs">
                        {lead.suggestedScript}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
