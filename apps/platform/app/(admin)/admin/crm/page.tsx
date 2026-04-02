"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users, Phone, AlertTriangle, MapPin, TrendingUp, Target,
  Building2, UserCheck, Clock, Star, Mail, Search,
  PhoneCall, Loader2, ChevronUp, ChevronDown,
  Upload, Eye, ArrowUpDown,
} from "lucide-react";

type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  status: string;
  type: "customer" | "at_risk" | "never_booked";
  daysSinceService: number | null;
  lastService: string | null;
  totalJobs: number;
  totalSpent: number;
  riskLevel: string | null;
  createdAt: string;
};

type SortKey = "name" | "email" | "city" | "type" | "totalJobs" | "totalSpent" | "daysSinceService";
type SortDir = "asc" | "desc";

export default function CrmCommandCenter() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filterType, setFilterType] = useState<"all" | "customer" | "at_risk" | "never_booked">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ total: 0, customers: 0, atRisk: 0, neverBooked: 0 });

  const fetchContacts = useCallback((searchQuery?: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "200" });
    if (searchQuery) params.set("search", searchQuery);
    fetch(`/api/admin/crm/contacts?${params}`)
      .then(r => r.ok ? r.json() : { contacts: [], total: 0 })
      .then((data) => {
        const all: Contact[] = (data.contacts || []).map((c: any) => ({
          id: c.id,
          name: c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim(),
          email: c.email || "",
          phone: c.phone || null,
          city: c.city || null,
          status: c.status || "active",
          type: c.totalJobs > 0 ? "customer" as const : "never_booked" as const,
          daysSinceService: null,
          lastService: null,
          totalJobs: c.totalJobs || 0,
          totalSpent: 0,
          riskLevel: null,
          createdAt: c.createdAt || "",
        }));
        const withJobs = all.filter(c => c.totalJobs > 0).length;
        setStats({
          total: data.total || all.length,
          customers: withJobs,
          atRisk: 0,
          neverBooked: all.length - withJobs,
        });
        setContacts(all);
        setLoading(false);
      });
  }, []);

  // Initial load
  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // Debounced server-side search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts(search || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchContacts]);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }, [sortKey]);

  const filtered = useMemo(() => {
    let result = contacts;
    if (filterType !== "all") result = result.filter(c => c.type === filterType);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone?.includes(q) || c.city?.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      let av: any = a[sortKey] ?? ""; let bv: any = b[sortKey] ?? "";
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      return av < bv ? (sortDir === "asc" ? -1 : 1) : av > bv ? (sortDir === "asc" ? 1 : -1) : 0;
    });
    return result;
  }, [contacts, filterType, search, sortKey, sortDir]);

  const toggleSelect = (id: string) => setSelectedIds(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => { if (selectedIds.size === filtered.length) setSelectedIds(new Set()); else setSelectedIds(new Set(filtered.map(c => c.id))); };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>;

  const SH = ({ label, field, w }: { label: string; field: SortKey; w?: string }) => (
    <th onClick={() => handleSort(field)} className={`cursor-pointer select-none px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-accent ${w || ""}`}>
      <div className="flex items-center gap-1">{label}{sortKey === field ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-20" />}</div>
    </th>
  );

  const badge = (type: string, risk?: string | null) => {
    if (type === "at_risk") return <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${risk === "critical" ? "bg-red-100 text-red-700" : risk === "high" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{risk || "at risk"}</span>;
    if (type === "never_booked") return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-600">new</span>;
    return <span className="rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold uppercase text-green-700">active</span>;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-purple-800 via-brand-800 to-indigo-700 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.4em] text-purple-200/80">CRM</p>
            <h1 className="text-2xl font-bold">{stats.total.toLocaleString()} Contacts</h1>
          </div>
          <div className="flex gap-2">
            <div className="rounded-xl bg-white/10 px-4 py-2"><p className="text-[9px] font-bold uppercase text-white/50">Active</p><p className="text-lg font-bold">{stats.customers.toLocaleString()}</p></div>
            <div className={`rounded-xl px-4 py-2 ${stats.atRisk > 0 ? "bg-red-500/20 ring-1 ring-red-300/30" : "bg-white/10"}`}><p className="text-[9px] font-bold uppercase text-white/50">At Risk</p><p className="text-lg font-bold">{stats.atRisk}</p></div>
            <div className="rounded-xl bg-white/10 px-4 py-2"><p className="text-[9px] font-bold uppercase text-white/50">New</p><p className="text-lg font-bold">{stats.neverBooked}</p></div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-brand-100 bg-brand-50/30 px-3 py-2 min-w-[200px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, phone, city..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50" />
        </div>
        <div className="flex gap-1">
          {(["all", "customer", "at_risk", "never_booked"] as const).map((f) => (
            <button key={f} onClick={() => setFilterType(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filterType === f ? "bg-accent text-white" : "bg-brand-50 text-accent hover:bg-brand-100"}`}>
              {f === "all" ? "All" : f === "customer" ? "Active" : f === "at_risk" ? "At Risk" : "New"}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <Link href="/admin/call-lists" className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"><PhoneCall className="h-3 w-3" /> Call Lists</Link>
          <Link href="/admin/prospects" className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"><Building2 className="h-3 w-3" /> Prospects</Link>
          <Link href="/admin/import" className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"><Upload className="h-3 w-3" /> Import</Link>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="rounded-2xl border border-brand-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-brand-100 bg-brand-50/30">
              <tr>
                <th className="w-10 px-3 py-3"><input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="h-3.5 w-3.5 rounded" /></th>
                <SH label="Name" field="name" />
                <SH label="Email" field="email" />
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone</th>
                <SH label="City" field="city" />
                <SH label="Status" field="type" />
                <SH label="Jobs" field="totalJobs" />
                <SH label="Revenue" field="totalSpent" />
                <SH label="Last Service" field="daysSinceService" />
                <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {filtered.slice(0, 200).map((c) => (
                <tr key={c.id} className="transition hover:bg-brand-50/40 cursor-pointer group" onClick={() => router.push(`/admin/customers/${c.id}`)}>
                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} className="h-3.5 w-3.5 rounded" /></td>
                  <td className="px-3 py-2 font-semibold text-accent group-hover:text-brand-700">{c.name || "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground max-w-[180px] truncate">{c.email?.includes("@import") ? "—" : c.email}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{c.phone || "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{c.city || "—"}</td>
                  <td className="px-3 py-2">{badge(c.type, c.riskLevel)}</td>
                  <td className="px-3 py-2 text-center font-semibold">{c.totalJobs || "—"}</td>
                  <td className="px-3 py-2 text-right font-semibold">{c.totalSpent > 0 ? `$${c.totalSpent.toFixed(0)}` : "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{c.daysSinceService != null ? `${c.daysSinceService}d ago` : "—"}</td>
                  <td className="px-3 py-2 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition">
                      {c.phone && <a href={`tel:${c.phone}`} className="rounded p-1 hover:bg-brand-100"><Phone className="h-3.5 w-3.5 text-muted-foreground" /></a>}
                      {c.email && !c.email.includes("@import") && <a href={`mailto:${c.email}`} className="rounded p-1 hover:bg-brand-100"><Mail className="h-3.5 w-3.5 text-muted-foreground" /></a>}
                      <Link href={`/admin/customers/${c.id}`} className="rounded p-1 hover:bg-brand-100"><Eye className="h-3.5 w-3.5 text-muted-foreground" /></Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-brand-100 bg-brand-50/20 px-4 py-2 text-xs text-muted-foreground">
          <span>Showing {Math.min(filtered.length, 200)} of {filtered.length}{selectedIds.size > 0 ? ` (${selectedIds.size} selected)` : ""}</span>
          <span>{stats.total.toLocaleString()} total</span>
        </div>
      </div>
    </div>
  );
}
