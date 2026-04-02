"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { cn, formatCurrency } from "@/src/lib/utils";
import {
  Download,
  Eye,
  FileText,
  Loader2,
  AlertCircle,
  Plus,
  Check,
  Clock,
} from "lucide-react";


interface Paystub {
  id: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  grossPay: number;
  netPay: number;
  totalHours: number;
  status: "draft" | "finalized";
  cleaner: {
    id: string;
    name: string;
  };
}

interface PaystubListProps {
  isAdmin: boolean;
  cleaners: { id: string; name: string }[];
}

export function PaystubList({ isAdmin, cleaners }: PaystubListProps) {
  const [paystubs, setPaystubs] = useState<Paystub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchPaystubs();
  }, []);

  const fetchPaystubs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/employee/paystubs");

      if (!response.ok) {
        throw new Error("Failed to fetch paystubs");
      }

      const data = await response.json();
      // API returns { cleanerId, paystubs: [...], total } for cleaners
      // or could return a flat array for admins
      const list = Array.isArray(data) ? data : (data.paystubs ?? []);
      setPaystubs(list);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred while fetching paystubs"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePaystubs = async (
    cleanerId: string | "all",
    period: "current" | "previous"
  ) => {
    try {
      setIsGenerating(true);
      const response = await fetch("/api/employee/paystubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleanerId: cleanerId === "all" ? undefined : cleanerId,
          period,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate paystubs");
      }

      // Refresh the list
      await fetchPaystubs();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred while generating paystubs"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const startMonth = startDate.toLocaleDateString("en-US", { month: "short" });
    const startDay = startDate.getDate();
    const endMonth = endDate.toLocaleDateString("en-US", { month: "short" });
    const endDay = endDate.getDate();
    const year = endDate.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} – ${endDay}, ${year}`;
    } else {
      return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
    }
  };

  const handleViewPdf = (paystubId: string) => {
    window.open(`/api/employee/paystubs/${paystubId}/pdf`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="mt-4 text-gray-600">Loading paystubs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-start gap-3 pt-6">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error Loading Paystubs</h3>
            <p className="mt-1 text-sm text-red-800">{error}</p>
            <button
              onClick={fetchPaystubs}
              className="mt-3 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Generate Paystubs Button (Admin/Manager Only) */}
      {isAdmin && (
        <Card className="border-accent/20 bg-brand-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Generate New Paystubs</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Create paystubs for the current or previous pay period
                </p>
              </div>
              <GeneratePaystubsDialog
                cleaners={cleaners}
                onGenerate={handleGeneratePaystubs}
                isLoading={isGenerating}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paystubs Grid */}
      {paystubs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No Paystubs Yet</h3>
            <p className="mt-2 text-center text-gray-600">
              {isAdmin
                ? "Generate paystubs to get started"
                : "You don't have any paystubs yet. Check back soon!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paystubs.map((paystub) => (
            <Card key={paystub.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="bg-brand-50 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-gray-600">
                      Pay Period
                    </p>
                    <h3 className="mt-1 font-semibold text-gray-900">
                      {formatPeriod(paystub.periodStart, paystub.periodEnd)}
                    </h3>
                    {isAdmin && (
                      <p className="mt-2 text-xs text-gray-600">{paystub.cleaner?.name}</p>
                    )}
                  </div>
                  <div className="ml-2">
                    {paystub.status === "finalized" ? (
                      <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-1">
                        <Check className="h-3 w-3 text-green-700" />
                        <span className="text-xs font-medium text-green-700">Finalized</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1">
                        <Clock className="h-3 w-3 text-yellow-700" />
                        <span className="text-xs font-medium text-yellow-700">Draft</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                {/* Payment Details */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-gray-600">Gross Pay</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(paystub.grossPay)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-gray-600">Net Pay</span>
                    <span className="text-lg font-bold text-accent">
                      {formatCurrency(paystub.netPay)}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-4 flex items-baseline justify-between">
                    <span className="text-sm text-gray-600">Hours Worked</span>
                    <span className="font-semibold text-gray-900">
                      {(paystub.totalHours ?? 0).toFixed(1)} hrs
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewPdf(paystub.id)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full border border-accent bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent hover:bg-brand-50 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    View PDF
                  </button>
                  <a
                    href={`/api/employee/paystubs/${paystub.id}/pdf`}
                    download
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-green-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface GeneratePaystubsDialogProps {
  cleaners: { id: string; name: string }[];
  onGenerate: (cleanerId: string | "all", period: "current" | "previous") => Promise<void>;
  isLoading: boolean;
}

function GeneratePaystubsDialog({
  cleaners,
  onGenerate,
  isLoading,
}: GeneratePaystubsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCleaner, setSelectedCleaner] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<"current" | "previous">("current");

  const handleSubmit = async () => {
    await onGenerate(selectedCleaner, selectedPeriod);
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-green-700 transition-colors"
        disabled={isLoading}
      >
        <Plus className="h-4 w-4" />
        Generate
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader className="border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Generate Paystubs</h2>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Cleaner Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Select Cleaner
                </label>
                <select
                  value={selectedCleaner}
                  onChange={(e) => setSelectedCleaner(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="all">All Cleaners</option>
                  {cleaners.map((cleaner) => (
                    <option key={cleaner.id} value={cleaner.id}>
                      {cleaner.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Period Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Pay Period
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="period"
                      value="current"
                      checked={selectedPeriod === "current"}
                      onChange={(e) =>
                        setSelectedPeriod(e.target.value as "current" | "previous")
                      }
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">Current Period</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="period"
                      value="previous"
                      checked={selectedPeriod === "previous"}
                      onChange={(e) =>
                        setSelectedPeriod(e.target.value as "current" | "previous")
                      }
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">Previous Period</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                  className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-900 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 flex-1 rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isLoading ? "Generating..." : "Generate"}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
