"use client";

import { useState, useEffect } from "react";
import { X, Loader2, UserCheck, Plus } from "lucide-react";

type AvailableCleaner = {
  id: string;
  name: string;
  rating: number;
  completedJobs: number;
  available: boolean;
  conflictCount: number;
};

type Props = {
  onClose: () => void;
  onCreated: () => void;
};

const SERVICE_TYPES = [
  { value: "HOME_CLEAN", label: "Home Clean" },
  { value: "PRESSURE_WASH", label: "Pressure Wash" },
  { value: "AUTO_DETAIL", label: "Auto Detail" },
  { value: "CUSTOM", label: "Custom" },
];

export const CreateJobModal = ({ onClose, onCreated }: Props) => {
  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [serviceType, setServiceType] = useState("HOME_CLEAN");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [quotedPrice, setQuotedPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedCleanerId, setAssignedCleanerId] = useState("");

  // UI state
  const [cleaners, setCleaners] = useState<AvailableCleaner[]>([]);
  const [loadingCleaners, setLoadingCleaners] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch available cleaners when date/time changes
  useEffect(() => {
    if (!scheduledDate || !startTime || !endTime) return;

    setLoadingCleaners(true);
    const params = new URLSearchParams({
      date: scheduledDate,
      start: startTime,
      end: endTime,
    });

    fetch(`/api/admin/cleaners/available?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCleaners(data);
      })
      .catch(() => setCleaners([]))
      .finally(() => setLoadingCleaners(false));
  }, [scheduledDate, startTime, endTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          serviceType,
          address,
          city,
          scheduledDate,
          startTime,
          endTime,
          estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
          quotedPrice: quotedPrice ? parseFloat(quotedPrice) : undefined,
          notes: notes || undefined,
          assignedCleanerId: assignedCleanerId || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to create job");
        return;
      }

      onCreated();
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl mx-4">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-brand-100 bg-white px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-brand-600" />
            <h2 className="text-lg font-semibold text-accent">Create New Job</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error banner */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Customer Info Section */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Customer Information
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-accent mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  placeholder="John Smith"
                  className="w-full rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-accent mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  required
                  placeholder="john@example.com"
                  className="w-full rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-accent mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                  placeholder="+1 (555) 123-4567"
                  className="w-full rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Service & Location Section */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Service & Location
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-accent mb-1">
                  Service Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  required
                  className="w-full rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                >
                  {SERVICE_TYPES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-accent mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  placeholder="Orlando"
                  className="w-full rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-accent mb-1">
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  placeholder="123 Main St"
                  className="w-full rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Schedule Section */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Schedule
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-accent mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-accent mb-1">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-accent mb-1">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Pricing & Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-accent mb-1">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="2"
                  className="w-full rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-accent mb-1">
                  Quoted Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={quotedPrice}
                  onChange={(e) => setQuotedPrice(e.target.value)}
                  placeholder="150.00"
                  className="w-full rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-accent mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Special instructions, access codes, etc."
                  className="w-full rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Cleaner Assignment */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Assign Cleaner (Optional)
            </p>
            {loadingCleaners ? (
              <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading available cleaners...
              </div>
            ) : cleaners.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No cleaners found. Select a date and time to check availability.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {/* Unassigned option */}
                <label
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                    assignedCleanerId === ""
                      ? "border-brand-600 bg-brand-50 ring-1 ring-brand-200"
                      : "border-brand-100 hover:bg-brand-50/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="cleaner"
                    value=""
                    checked={assignedCleanerId === ""}
                    onChange={() => setAssignedCleanerId("")}
                    className="accent-brand-600"
                  />
                  <p className="text-sm font-medium text-accent">Leave Unassigned</p>
                </label>

                {cleaners.map((c) => (
                  <label
                    key={c.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                      assignedCleanerId === c.id
                        ? "border-brand-600 bg-brand-50 ring-1 ring-brand-200"
                        : "border-brand-100 hover:bg-brand-50/50"
                    } ${!c.available ? "opacity-50" : ""}`}
                  >
                    <input
                      type="radio"
                      name="cleaner"
                      value={c.id}
                      checked={assignedCleanerId === c.id}
                      onChange={() => setAssignedCleanerId(c.id)}
                      className="accent-brand-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-accent">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Rating: {c.rating.toFixed(1)} | {c.completedJobs} jobs
                        {c.conflictCount > 0 && (
                          <span className="text-amber-600 ml-1">
                            ({c.conflictCount} conflict{c.conflictCount > 1 ? "s" : ""})
                          </span>
                        )}
                      </p>
                    </div>
                    {c.available && (
                      <UserCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Creating..." : "Create Job"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-brand-100 px-6 py-3 text-sm font-semibold text-accent transition-colors hover:bg-brand-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
