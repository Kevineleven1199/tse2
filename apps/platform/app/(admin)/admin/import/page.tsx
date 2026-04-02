"use client";

import { useState, useRef } from "react";
import {
  Upload, FileText, CheckCircle2, AlertTriangle, Loader2,
  Users, Phone, Mail, Database, ArrowRight, Download,
} from "lucide-react";

type ImportResult = {
  success: boolean;
  dryRun: boolean;
  summary: {
    totalCsvRows: number;
    parsed: number;
    internalDuplicatesMerged: number;
    uniqueAfterMerge: number;
    alreadyInDatabase: number;
    newContactsToImport: number;
    created: number;
  };
  duplicateReport: { name: string; reason: string; existingName?: string }[];
  sampleNewContacts: { name: string; email: string | null; phone: string | null; city: string | null; source: string }[];
};

export default function ImportPage() {
  const [source, setSource] = useState<"jobber" | "quo" | "bookingkoala" | "generic">("jobber");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText(ev.target?.result as string);
      setResult(null);
      setError(null);
    };
    reader.readAsText(file);
  };

  const runImport = async (dryRun: boolean) => {
    if (!csvText) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/import-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, source, dryRun }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || `Import failed (${res.status})`);
        return;
      }
      setResult(await res.json());
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-800 via-brand-800 to-purple-700 p-8 text-white shadow-xl">
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-indigo-200/80">Master CRM Import</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Import Contacts</h1>
          <p className="mt-1 text-sm text-indigo-100/80">
            Smart import from Quo (OpenPhone), Jobber, BookingKoala, or any CSV. Auto-deduplication across all sources.
          </p>
        </div>
      </div>

      {/* Source Selection */}
      <div className="rounded-3xl border border-brand-100 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-accent mb-4">1. Select Source</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          {([
            { key: "jobber" as const, label: "Jobber", desc: "Customer export CSV" },
            { key: "quo" as const, label: "Quo / OpenPhone", desc: "Contact export" },
            { key: "bookingkoala" as const, label: "BookingKoala", desc: "Client export" },
            { key: "generic" as const, label: "Generic CSV", desc: "Any format" },
          ]).map((s) => (
            <button key={s.key} onClick={() => setSource(s.key)}
              className={`rounded-2xl border-2 p-4 text-left transition ${source === s.key ? "border-accent bg-brand-50" : "border-brand-100 hover:border-brand-200"}`}>
              <p className="font-semibold text-accent">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* File Upload */}
      <div className="rounded-3xl border border-brand-100 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-accent mb-4">2. Upload CSV File</h2>
        <div
          onClick={() => fileRef.current?.click()}
          className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/30 p-10 text-center transition hover:border-brand-400 hover:bg-brand-50"
        >
          <Upload className="h-10 w-10 text-brand-400" />
          <p className="font-semibold text-accent">{fileName || "Click to select CSV file"}</p>
          <p className="text-xs text-muted-foreground">Or drag and drop your .csv file here</p>
        </div>
        <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileSelect} />

        {csvText && (
          <p className="mt-3 text-xs text-muted-foreground">
            <FileText className="inline h-3 w-3 mr-1" />
            {fileName} — {csvText.split("\n").length - 1} rows detected
          </p>
        )}
      </div>

      {/* Actions */}
      {csvText && (
        <div className="flex gap-3">
          <button onClick={() => runImport(true)} disabled={loading}
            className="flex items-center gap-2 rounded-full border-2 border-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-accent transition hover:bg-brand-50 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Preview (Dry Run)
          </button>
          <button onClick={() => runImport(false)} disabled={loading || !result?.dryRun}
            className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition hover:bg-brand-700 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Import for Real
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className={`rounded-3xl border p-6 ${result.dryRun ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50"}`}>
            <h2 className="flex items-center gap-2 font-bold text-accent">
              {result.dryRun ? <AlertTriangle className="h-5 w-5 text-amber-500" /> : <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {result.dryRun ? "Preview Results (No changes made)" : "Import Complete!"}
            </h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Stat icon={FileText} label="CSV Rows" value={result.summary.totalCsvRows} />
              <Stat icon={Users} label="Parsed" value={result.summary.parsed} />
              <Stat icon={Database} label="Internal Dupes Merged" value={result.summary.internalDuplicatesMerged} />
              <Stat icon={Users} label="Unique" value={result.summary.uniqueAfterMerge} />
              <Stat icon={AlertTriangle} label="Already in DB" value={result.summary.alreadyInDatabase} />
              <Stat icon={CheckCircle2} label={result.dryRun ? "Ready to Import" : "Created"} value={result.dryRun ? result.summary.newContactsToImport : result.summary.created} accent />
            </div>
          </div>

          {/* Sample new contacts */}
          {result.sampleNewContacts.length > 0 && (
            <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-accent mb-3">Sample New Contacts (first 10)</h3>
              <div className="space-y-2">
                {result.sampleNewContacts.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-brand-50/30 px-4 py-2 text-sm">
                    <span className="font-semibold text-accent">{c.name}</span>
                    {c.email && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{c.email}</span>}
                    {c.phone && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{c.phone}</span>}
                    {c.city && <span className="text-xs text-muted-foreground">{c.city}</span>}
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[9px] font-bold text-brand-700">{c.source}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duplicate report */}
          {result.duplicateReport.length > 0 && (
            <div className="rounded-3xl border border-amber-100 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-accent mb-3">Duplicates Detected ({result.summary.alreadyInDatabase})</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {result.duplicateReport.map((d, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-amber-50/50 px-4 py-2 text-sm">
                    <div>
                      <span className="font-semibold text-accent">{d.name}</span>
                      {d.existingName && d.existingName !== d.name && (
                        <span className="text-xs text-muted-foreground ml-2">→ matches {d.existingName}</span>
                      )}
                    </div>
                    <span className="text-xs text-amber-600">{d.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: typeof Users; label: string; value: number; accent?: boolean }) {
  return (
    <div className="text-center rounded-2xl bg-white/80 p-3 shadow-sm border border-brand-50">
      <Icon className={`mx-auto h-5 w-5 mb-1 ${accent ? "text-green-500" : "text-muted-foreground"}`} />
      <p className={`text-2xl font-bold ${accent ? "text-green-600" : "text-accent"}`}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
