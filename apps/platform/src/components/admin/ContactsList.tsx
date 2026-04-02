"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Plus,
  ChevronUp,
  ChevronDown,
  Calendar,
  AlertCircle,
  Upload,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Card, CardContent } from "@/src/components/ui/card";
import { cn } from "@/src/lib/utils";
import { parseCsv } from "@/src/lib/csv";
import type { CrmLead } from "@prisma/client";

// Simple debounce implementation
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null;
  return (function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  } as unknown) as T;
}

interface ContactsListProps {
  initialContacts: CrmLead[];
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-purple-100 text-purple-800",
  qualified: "bg-green-100 text-green-800",
  won: "bg-emerald-100 text-emerald-800",
  lost: "bg-red-100 text-red-800",
};

const SOURCE_LABELS: Record<string, string> = {
  ai_discovery: "AI Discovery",
  website: "Website",
  service_request: "Service Request",
  referral: "Referral",
  manual: "Manual",
  cold_call: "Cold Call",
};

export const ContactsList = ({ initialContacts }: ContactsListProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [contacts, setContacts] = useState<CrmLead[]>(initialContacts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [source, setSource] = useState(searchParams.get("source") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "date");
  const [order, setOrder] = useState(searchParams.get("order") || "desc");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);

  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvImportMessage, setCsvImportMessage] = useState<string | null>(null);
  const [csvImportError, setCsvImportError] = useState<string | null>(null);

  // Debounced search function
  const fetchContacts = useCallback(
    debounce(async (searchVal: string, statusVal: string, sourceVal: string, sortVal: string, orderVal: string, pageVal: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (searchVal) params.append("search", searchVal);
        if (statusVal) params.append("status", statusVal);
        if (sourceVal) params.append("source", sourceVal);
        params.append("sort", sortVal);
        params.append("order", orderVal);
        params.append("page", pageVal.toString());
        params.append("limit", "20");

        const response = await fetch(`/api/admin/contacts?${params}`);
        if (!response.ok) throw new Error("Failed to fetch contacts");

        const result = await response.json();
        setContacts(result.data);

        // Update URL
        router.push(`?${params.toString()}`, { scroll: false });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch contacts");
      } finally {
        setLoading(false);
      }
    }, 300),
    [router]
  );

  useEffect(() => {
    fetchContacts(search, status, source, sort, order, page);
  }, [search, status, source, sort, order, page, fetchContacts]);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to create contact");

      setFormData({ businessName: "", contactName: "", contactEmail: "", contactPhone: "" });
      setShowAddForm(false);
      setPage(1);

      // Refresh contacts
      fetchContacts(search, status, source, sort, order, 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contact");
    } finally {
      setLoading(false);
    }
  };

  const handleImportCsv = async (file: File) => {
    setCsvImportError(null);
    setCsvImportMessage(null);
    setCsvImporting(true);

    try {
      const text = await file.text();
      const rows = parseCsv(text);

      if (rows.length === 0) {
        throw new Error("The CSV file is empty or missing data rows.");
      }

      const response = await fetch("/api/admin/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to import contacts CSV.");
      }

      setCsvImportMessage(
        `Imported ${result.created} contacts, updated ${result.updated}, skipped ${result.skipped}.`
      );
      setPage(1);
      fetchContacts(search, status, source, sort, order, 1);
    } catch (err) {
      setCsvImportError(
        err instanceof Error ? err.message : "Failed to import contacts CSV."
      );
    } finally {
      setCsvImporting(false);
    }
  };

  const statuses = ["new", "contacted", "qualified", "won", "lost"];
  const sources = ["ai_discovery", "website", "service_request", "referral", "manual", "cold_call"];

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-gray-600 leading-none">Status:</span>
          <button
            onClick={() => {
              setStatus("");
              setPage(1);
            }}
            className={cn(
              "px-3 py-2 rounded-full text-xs font-medium transition-colors min-h-[44px] flex items-center",
              !status
                ? "bg-accent text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            All
          </button>
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
              className={cn(
                "px-3 py-2 rounded-full text-xs font-medium transition-colors capitalize min-h-[44px] flex items-center",
                status === s
                  ? `${STATUS_COLORS[s]} shadow-sm`
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Source Filter Pills */}
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 items-center">
          <span className="text-xs font-semibold text-gray-600 leading-none whitespace-nowrap">Source:</span>
          <button
            onClick={() => {
              setSource("");
              setPage(1);
            }}
            className={cn(
              "px-3 py-2 rounded-full text-xs font-medium transition-colors whitespace-nowrap min-h-[44px] flex items-center",
              !source
                ? "bg-accent text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            All
          </button>
          {sources.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSource(s);
                setPage(1);
              }}
              className={cn(
                "px-3 py-2 rounded-full text-xs font-medium transition-colors whitespace-nowrap min-h-[44px] flex items-center",
                source === s
                  ? "bg-accent text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              {SOURCE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Add Contact Form */}
      {showAddForm && (
        <Card>
          <CardContent>
            <form onSubmit={handleAddContact} className="space-y-4 pt-4">
              <h3 className="font-semibold text-accent">Add New Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Business Name *"
                  value={formData.businessName}
                  onChange={(e) =>
                    setFormData({ ...formData, businessName: e.target.value })
                  }
                  required
                />
                <Input
                  placeholder="Contact Name"
                  value={formData.contactName}
                  onChange={(e) =>
                    setFormData({ ...formData, contactName: e.target.value })
                  }
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, contactEmail: e.target.value })
                  }
                />
                <Input
                  placeholder="Phone"
                  value={formData.contactPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPhone: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Contact"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Add Contact Button */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {contacts.length} contact{contacts.length !== 1 ? "s" : ""} found
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-accent px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent hover:bg-brand-50">
            <Upload className="h-4 w-4" />
            {csvImporting ? "Importing..." : "Import CSV"}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={csvImporting}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.currentTarget.value = "";
                if (file) {
                  void handleImportCsv(file);
                }
              }}
            />
          </label>
          <Button onClick={() => setShowAddForm(!showAddForm)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>
      {(csvImportMessage || csvImportError) && (
        <div
          className={cn(
            "rounded-lg border p-3 text-xs font-medium",
            csvImportError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          )}
        >
          {csvImportError ?? csvImportMessage}
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th
                className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => {
                  setSort("name");
                  setOrder(order === "asc" && sort === "name" ? "desc" : "asc");
                  setPage(1);
                }}
              >
                <div className="flex items-center gap-2">
                  Business Name
                  {sort === "name" && (
                    order === "asc" ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Contact Person
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Phone
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Email
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Status
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Source
              </th>
              <th
                className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => {
                  setSort("score");
                  setOrder(order === "asc" && sort === "score" ? "desc" : "asc");
                  setPage(1);
                }}
              >
                <div className="flex items-center gap-2">
                  Score
                  {sort === "score" && (
                    order === "asc" ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Last Contact
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && contacts.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No contacts found
                </td>
              </tr>
            )}
            {!loading &&
              contacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/admin/contacts/${contact.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-accent hover:underline">
                    {contact.businessName}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {contact.contactName || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {contact.contactPhone || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {contact.contactEmail || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        STATUS_COLORS[contact.status] || "bg-gray-100 text-gray-700"
                      )}
                    >
                      {contact.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {SOURCE_LABELS[contact.source] || contact.source}
                  </td>
                  <td className="px-4 py-3 font-semibold text-accent">
                    {contact.score}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {contact.lastContactedAt
                      ? new Date(contact.lastContactedAt).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {loading && (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        )}
        {!loading && contacts.length === 0 && (
          <div className="text-center py-8 text-gray-500">No contacts found</div>
        )}
        {!loading &&
          contacts.map((contact) => (
            <Card key={contact.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <Link href={`/admin/contacts/${contact.id}`} className="flex-1">
                    <h3 className="font-semibold text-accent hover:underline">
                      {contact.businessName}
                    </h3>
                    {contact.contactName && (
                      <p className="text-xs text-gray-600">{contact.contactName}</p>
                    )}
                  </Link>
                  <span
                    className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                      STATUS_COLORS[contact.status] || "bg-gray-100 text-gray-700"
                    )}
                  >
                    {contact.status}
                  </span>
                </div>

                {(contact.contactPhone || contact.contactEmail) && (
                  <div className="space-y-1 text-xs text-gray-600">
                    {contact.contactPhone && (
                      <p>Phone: {contact.contactPhone}</p>
                    )}
                    {contact.contactEmail && (
                      <p>Email: {contact.contactEmail}</p>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <div className="flex gap-2 text-xs">
                    <span className="text-gray-500">
                      {SOURCE_LABELS[contact.source] || contact.source}
                    </span>
                    <span className="font-semibold text-accent">
                      Score: {contact.score}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {contact.lastContactedAt && (
                      <div className="flex items-center gap-1 text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span className="text-xs">
                          {new Date(contact.lastContactedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <Link
                      href={`/admin/clients/${contact.id}/timeline`}
                      className="text-xs font-medium text-green-600 hover:text-green-700 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Timeline
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
};
