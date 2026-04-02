"use client";

import { useState, useEffect, useCallback } from "react";

type Prospect = {
  id: string;
  businessName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  industry: string | null;
  sqft: number | null;
  score: number;
  priority: number;
  status: string;
  callCount: number;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  notes: string | null;
  aiInsights: string | null;
  tags: string[];
  metadata: any;
  estimatedRevenue: { low: number; high: number; frequency: string };
  tier: { tier: string; label: string; color: string; action: string };
};

type Stats = {
  total: number;
  tierStats: { A: number; B: number; C: number; D: number };
  totalEstimatedMonthlyRevenue: number;
  industries: { value: string; label: string; baseScore: number }[];
};

const INDUSTRIES = [
  { value: "condo_association", label: "Condo / HOA" },
  { value: "medical_office", label: "Medical Office" },
  { value: "dental_office", label: "Dental Office" },
  { value: "daycare", label: "Daycare" },
  { value: "veterinary", label: "Veterinary" },
  { value: "office_building", label: "Office Building" },
  { value: "coworking_space", label: "Coworking" },
  { value: "gym", label: "Gym" },
  { value: "church", label: "Church" },
  { value: "restaurant", label: "Restaurant" },
  { value: "law_firm", label: "Law Firm" },
  { value: "salon", label: "Salon / Spa" },
  { value: "hotel", label: "Hotel" },
  { value: "school", label: "School" },
];

export default function ProspectsClient() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tierFilter, setTierFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [genCount, setGenCount] = useState(25);

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tierFilter !== "all") params.set("tier", tierFilter);
    if (industryFilter !== "all") params.set("industry", industryFilter);
    params.set("limit", "100");
    const res = await fetch(`/api/crm/prospects?${params}`);
    const data = await res.json();
    setProspects(data.prospects || []);
    setStats(data.stats || null);
    setLoading(false);
  }, [tierFilter, industryFilter]);

  useEffect(() => { fetchProspects(); }, [fetchProspects]);

  const generateProspects = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/crm/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industries: selectedIndustries.length > 0 ? selectedIndustries : undefined,
          count: genCount,
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert(`Generated ${data.generated} prospects, added ${data.added} new leads (${data.duplicatesSkipped} duplicates skipped)`);
        fetchProspects();
      }
    } catch (err) {
      alert("Failed to generate prospects");
    }
    setGenerating(false);
  };

  const addToCampaign = async (leadIds: string[]) => {
    alert(`Selected ${leadIds.length} leads for campaign. Go to Campaigns page to create and send.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-700 p-6 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-purple-200">SALES INTELLIGENCE</p>
            <h1 className="text-2xl font-semibold">Commercial Prospects</h1>
            <p className="mt-1 text-sm text-purple-100">AI-ranked commercial cleaning opportunities with owner contacts</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={generateProspects}
              disabled={generating}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-purple-700 shadow hover:bg-purple-50 transition disabled:opacity-50"
            >
              {generating ? "Discovering..." : "Discover New Prospects"}
            </button>
          </div>
        </div>
      </div>

      {/* Revenue Highlight */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl border border-brand-100 bg-white p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Pipeline</p>
            <p className="mt-1 text-2xl font-bold text-accent">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-xs text-red-600">Tier A (Top)</p>
            <p className="mt-1 text-2xl font-bold text-red-700">{stats.tierStats.A}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="text-xs text-amber-600">Tier B (High)</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{stats.tierStats.B}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
            <p className="text-xs text-blue-600">Tier C (Medium)</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">{stats.tierStats.C}</p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
            <p className="text-xs text-green-600">Est. Monthly Rev</p>
            <p className="mt-1 text-2xl font-bold text-green-700">${stats.totalEstimatedMonthlyRevenue?.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Generation Options */}
      <div className="rounded-xl border border-brand-100 bg-white p-4">
        <p className="text-sm font-semibold text-accent mb-3">Target Industries (select for AI generation)</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {INDUSTRIES.map((ind) => (
            <button
              key={ind.value}
              onClick={() => {
                setSelectedIndustries((prev) =>
                  prev.includes(ind.value) ? prev.filter((i) => i !== ind.value) : [...prev, ind.value]
                );
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                selectedIndustries.includes(ind.value)
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {ind.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-muted-foreground">Generate</label>
          <select
            value={genCount}
            onChange={(e) => setGenCount(parseInt(e.target.value))}
            className="rounded border px-2 py-1 text-sm"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="text-xs text-muted-foreground">prospects per batch</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1.5">
          {[
            { value: "all", label: "All Tiers" },
            { value: "A", label: "Tier A" },
            { value: "B", label: "Tier B" },
            { value: "C", label: "Tier C" },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setTierFilter(t.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                tierFilter === t.value ? "bg-purple-600 text-white" : "bg-white border border-brand-200 text-brand-700 hover:bg-brand-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
          className="rounded-lg border border-brand-200 px-3 py-1.5 text-sm"
        >
          <option value="all">All Industries</option>
          {INDUSTRIES.map((ind) => (
            <option key={ind.value} value={ind.value}>{ind.label}</option>
          ))}
        </select>
      </div>

      {/* Prospects Table */}
      <div className="overflow-x-auto rounded-xl border border-brand-100 bg-white">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading prospects...</div>
        ) : prospects.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">No prospects yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Generate AI prospects to start building your pipeline</p>
            <button
              onClick={generateProspects}
              disabled={generating}
              className="mt-4 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-purple-700 transition"
            >
              Discover Commercial Prospects
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-purple-50/50 text-left text-xs uppercase tracking-wider text-purple-600">
              <tr>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Industry</th>
                <th className="px-4 py-3">Est. Revenue</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {prospects.map((p) => (
                <>
                  <tr key={p.id} className="hover:bg-purple-25 transition cursor-pointer" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${p.tier.color}`}>
                        {p.tier.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-accent">{p.businessName}</p>
                      {p.city && <p className="text-xs text-muted-foreground">{p.city}, {p.state}</p>}
                      {p.sqft && <p className="text-xs text-muted-foreground">{p.sqft.toLocaleString()} sqft</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">{p.contactName || "—"}</p>
                      {p.metadata?.ownerTitle && <p className="text-xs text-muted-foreground">{p.metadata.ownerTitle}</p>}
                      {p.contactEmail && <p className="text-xs text-blue-600">{p.contactEmail}</p>}
                      {p.contactPhone && <p className="text-xs font-mono">{p.contactPhone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs">{p.industry?.replace(/_/g, " ") || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-green-700">
                        ${p.estimatedRevenue.low.toLocaleString()}-${p.estimatedRevenue.high.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">/mo ({p.estimatedRevenue.frequency})</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold ${
                        p.score >= 85 ? "bg-red-100 text-red-700" : p.score >= 70 ? "bg-amber-100 text-amber-700" : p.score >= 50 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {p.score}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.status === "new" ? "bg-emerald-100 text-emerald-700" :
                        p.status === "contacted" ? "bg-sky-100 text-sky-700" :
                        p.status === "qualified" ? "bg-purple-100 text-purple-700" :
                        p.status === "won" ? "bg-green-200 text-green-800" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {p.status}
                      </span>
                      {p.tags?.includes("emailed") && <span className="ml-1 text-xs text-blue-500" title="Email sent">📧</span>}
                      {p.callCount > 0 && <span className="ml-1 text-xs text-green-500" title={`${p.callCount} calls`}>📞{p.callCount}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {p.contactPhone && (
                          <a href={`tel:${p.contactPhone}`} className="rounded-lg bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 transition" onClick={(e) => e.stopPropagation()}>
                            Call
                          </a>
                        )}
                        {p.contactEmail && (
                          <a href={`mailto:${p.contactEmail}`} className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition" onClick={(e) => e.stopPropagation()}>
                            Email
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === p.id && (
                    <tr key={`${p.id}-detail`}>
                      <td colSpan={8} className="bg-purple-50/30 px-6 py-4">
                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <p className="text-xs font-semibold text-purple-600 mb-1">AI Insight</p>
                            <p className="text-sm text-muted-foreground">{p.aiInsights || "No insights available"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-purple-600 mb-1">Contact Details</p>
                            <p className="text-sm">{p.contactName} {p.metadata?.ownerTitle ? `(${p.metadata.ownerTitle})` : ""}</p>
                            {p.metadata?.bestTimeToCall && <p className="text-xs text-muted-foreground">Best time: {p.metadata.bestTimeToCall}</p>}
                            {p.metadata?.decisionMakerRole && <p className="text-xs text-muted-foreground">Decision maker: {p.metadata.decisionMakerRole}</p>}
                            {p.address && <p className="text-xs text-muted-foreground mt-1">{p.address}</p>}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-purple-600 mb-1">Activity</p>
                            <p className="text-sm">{p.tier.action}</p>
                            {p.lastContactedAt && <p className="text-xs text-muted-foreground">Last contacted: {new Date(p.lastContactedAt).toLocaleDateString()}</p>}
                            {p.nextFollowUpAt && <p className="text-xs text-muted-foreground">Follow-up: {new Date(p.nextFollowUpAt).toLocaleDateString()}</p>}
                            {p.notes && (
                              <div className="mt-2 rounded-lg bg-white p-2 border text-xs text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto">
                                {p.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
