"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, User, Building2, FileText, Briefcase, Loader2, Receipt, UserCheck } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface SearchResult {
  id: string;
  type: "customer" | "lead" | "request" | "job" | "invoice" | "cleaner";
  title: string;
  subtitle: string;
  href: string;
  metadata?: Record<string, any>;
}

interface GroupedResults {
  customer: SearchResult[];
  lead: SearchResult[];
  request: SearchResult[];
  job: SearchResult[];
  invoice: SearchResult[];
  cleaner: SearchResult[];
}

const typeLabels: Record<string, string> = {
  customer: "Customers",
  lead: "CRM Leads",
  request: "Service Requests",
  job: "Jobs",
  invoice: "Invoices",
  cleaner: "Team Members",
};

const typeIcons: Record<string, React.ReactNode> = {
  customer: <User className="h-4 w-4" />,
  lead: <Building2 className="h-4 w-4" />,
  request: <FileText className="h-4 w-4" />,
  job: <Briefcase className="h-4 w-4" />,
  invoice: <Receipt className="h-4 w-4" />,
  cleaner: <UserCheck className="h-4 w-4" />,
};

const typeColors: Record<string, string> = {
  customer: "text-blue-600 bg-blue-50",
  lead: "text-purple-600 bg-purple-50",
  request: "text-orange-600 bg-orange-50",
  job: "text-green-600 bg-green-50",
  invoice: "text-amber-600 bg-amber-50",
  cleaner: "text-teal-600 bg-teal-50",
};

/**
 * GlobalSearch Component
 * Provides a searchable command palette for the admin portal
 * Keyboard shortcut: Cmd+K or Ctrl+K to open
 * ESC to close
 */
export const GlobalSearch = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>(null);

  // Handle keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setQuery("");
        setSelectedIndex(0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Debounced search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ q: searchQuery });
      const response = await fetch(`/api/admin/search?${params}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        console.error("Search failed:", response.statusText);
        setResults([]);
        return;
      }

      const data = await response.json();
      setResults(data.results || []);
      setSelectedIndex(0);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle input change with debounce
  const handleInputChange = (value: string) => {
    setQuery(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  // Group results by type
  const groupedResults: GroupedResults = {
    customer: results.filter((r) => r.type === "customer"),
    lead: results.filter((r) => r.type === "lead"),
    request: results.filter((r) => r.type === "request"),
    job: results.filter((r) => r.type === "job"),
    invoice: results.filter((r) => r.type === "invoice"),
    cleaner: results.filter((r) => r.type === "cleaner"),
  };

  const totalResults = Object.values(groupedResults).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  // Calculate flat list for keyboard navigation
  const flatResults = Object.values(groupedResults).flat();

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setQuery("");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < flatResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && flatResults[selectedIndex]) {
      e.preventDefault();
      const result = flatResults[selectedIndex];
      handleResultClick(result);
    }
  };

  // Handle result selection
  const handleResultClick = (result: SearchResult) => {
    setRecentSearches((prev) => {
      const updated = [query, ...prev.filter((s) => s !== query)].slice(0, 5);
      return updated;
    });

    setIsOpen(false);
    setQuery("");
    router.push(result.href);
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
      setQuery("");
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-muted-foreground hover:bg-brand-100 transition-colors"
        title="Search (⌘K)"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex rounded border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-600 ml-auto">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="flex items-start justify-center pt-20">
        <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
          {/* Search Input */}
          <div className="flex items-center border-b border-brand-100 px-4 py-3">
            <Search className="h-5 w-5 text-brand-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search customers, leads, requests, jobs..."
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="ml-3 w-full bg-transparent text-lg outline-none placeholder:text-muted-foreground"
            />
            <button
              onClick={() => {
                setIsOpen(false);
                setQuery("");
              }}
              className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Results Area */}
          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                <p className="mt-2 text-sm text-muted-foreground">Searching...</p>
              </div>
            )}

            {!loading && query.length < 2 && recentSearches.length > 0 && (
              <div className="p-4">
                <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase">
                  Recent Searches
                </p>
                <div className="space-y-2">
                  {recentSearches.map((search) => (
                    <button
                      key={search}
                      onClick={() => handleInputChange(search)}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-brand-50 transition-colors"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!loading && query.length < 2 && recentSearches.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <Search className="h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Type at least 2 characters to search
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Press ⌘K or Ctrl+K to focus the search
                </p>
              </div>
            )}

            {!loading && query.length >= 2 && totalResults === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No results found for "{query}"
                </p>
              </div>
            )}

            {!loading && query.length >= 2 && totalResults > 0 && (
              <div className="p-2">
                {Object.entries(groupedResults).map(([type, typeResults]) => {
                  if (typeResults.length === 0) return null;

                  return (
                    <div key={type}>
                      <div className="px-2 py-1.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">
                          {typeLabels[type]}
                        </p>
                      </div>

                      {typeResults.map((result: SearchResult, idx: number) => {
                        const resultIdx = flatResults.indexOf(result);
                        const isSelected = resultIdx === selectedIndex;

                        return (
                          <button
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            className={cn(
                              "w-full rounded-xl px-3 py-2.5 text-left transition-colors",
                              isSelected
                                ? "bg-brand-50 border border-brand-200"
                                : "hover:bg-gray-50"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={cn(
                                  "mt-0.5 rounded-lg p-2 flex-shrink-0",
                                  typeColors[type]
                                )}
                              >
                                {typeIcons[type]}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {result.title}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {result.subtitle}
                                </p>
                                {result.metadata && (
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {result.metadata.status && (
                                      <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                        {result.metadata.status}
                                      </span>
                                    )}
                                    {result.metadata.priority && (
                                      <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                        P{result.metadata.priority}
                                      </span>
                                    )}
                                    {result.metadata.serviceType && (
                                      <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                        {result.metadata.serviceType}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {!loading && query.length >= 2 && totalResults > 0 && (
            <div className="border-t border-brand-100 bg-gray-50 px-4 py-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>
                  Showing {totalResults} result{totalResults !== 1 ? "s" : ""}
                </span>
                <div className="flex gap-4 text-xs">
                  <span>
                    <kbd className="rounded border bg-white px-1.5 py-0.5">
                      ↑↓
                    </kbd>{" "}
                    to navigate
                  </span>
                  <span>
                    <kbd className="rounded border bg-white px-1.5 py-0.5">
                      ↵
                    </kbd>{" "}
                    to open
                  </span>
                  <span>
                    <kbd className="rounded border bg-white px-1.5 py-0.5">
                      esc
                    </kbd>{" "}
                    to close
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
