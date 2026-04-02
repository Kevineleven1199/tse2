"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";

interface RecurringSchedule {
  id: string;
  tenantId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  address: string;
  serviceType: string;
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY";
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  startDate: string;
  nextRunDate: string;
  lastRunDate: string | null;
  endDate: string | null;
  basePrice: number;
  notes: string | null;
  active: boolean;
  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function RecurringClient({
  initialSchedules,
}: {
  initialSchedules: RecurringSchedule[];
}) {
  const [schedules, setSchedules] = useState<RecurringSchedule[]>(
    initialSchedules
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<{
    customerName: string;
    customerEmail: string;
    address: string;
    serviceType: string;
    frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY";
    basePrice: number;
    startDate: string;
    nextRunDate: string;
  }>({
    customerName: "",
    customerEmail: "",
    address: "",
    serviceType: "",
    frequency: "WEEKLY",
    basePrice: 0,
    startDate: new Date().toISOString().split("T")[0],
    nextRunDate: new Date().toISOString().split("T")[0],
  });

  const handleTogglePause = async (schedule: RecurringSchedule) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/recurring/${schedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !schedule.active }),
      });
      if (!response.ok) throw new Error("Failed to update schedule");
      const updated = await response.json();
      setSchedules(
        schedules.map((s) => (s.id === schedule.id ? updated : s))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const calculateNextRunDate = (startDate: string, frequency: string): string => {
    const date = new Date(startDate);
    switch (frequency) {
      case "WEEKLY":
        date.setDate(date.getDate() + 7);
        break;
      case "BIWEEKLY":
        date.setDate(date.getDate() + 14);
        break;
      case "MONTHLY":
        date.setMonth(date.getMonth() + 1);
        break;
      case "QUARTERLY":
        date.setMonth(date.getMonth() + 3);
        break;
    }
    return date.toISOString().split("T")[0];
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.customerName.trim()) {
      setError("Customer name is required");
      return;
    }
    if (!formData.customerEmail.trim() || !formData.customerEmail.includes("@")) {
      setError("Valid customer email is required");
      return;
    }
    if (!formData.address.trim()) {
      setError("Address is required");
      return;
    }
    if (!formData.serviceType.trim()) {
      setError("Service type is required");
      return;
    }
    if (formData.basePrice <= 0) {
      setError("Base price must be greater than 0");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          nextRunDate: calculateNextRunDate(formData.startDate, formData.frequency),
        }),
      });
      if (!response.ok) throw new Error("Failed to create schedule");
      const newSchedule = await response.json();
      setSchedules([newSchedule, ...schedules]);
      setFormData({
        customerName: "",
        customerEmail: "",
        address: "",
        serviceType: "",
        frequency: "WEEKLY",
        basePrice: 0,
        startDate: new Date().toISOString().split("T")[0],
        nextRunDate: new Date().toISOString().split("T")[0],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreateSchedule}
        className="rounded-lg border p-4 space-y-4 bg-gray-50"
      >
        <h3 className="text-lg font-semibold">Create Schedule</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            placeholder="Customer Name"
            value={formData.customerName}
            onChange={(e) =>
              setFormData({ ...formData, customerName: e.target.value })
            }
            required
          />
          <Input
            type="email"
            placeholder="Customer Email"
            value={formData.customerEmail}
            onChange={(e) =>
              setFormData({ ...formData, customerEmail: e.target.value })
            }
            required
          />
          <Input
            placeholder="Address"
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
            required
          />
          <Input
            placeholder="Service Type"
            value={formData.serviceType}
            onChange={(e) =>
              setFormData({ ...formData, serviceType: e.target.value })
            }
            required
          />
          <Input
            type="date"
            placeholder="Start Date"
            value={formData.startDate}
            onChange={(e) =>
              setFormData({ ...formData, startDate: e.target.value })
            }
            required
          />
          <select
            value={formData.frequency}
            onChange={(e) => {
              const freq = e.target.value as "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY";
              setFormData({
                ...formData,
                frequency: freq,
              })
            }
            }
            className="rounded-lg border px-3 py-2"
            required
          >
            <option value="WEEKLY">Weekly</option>
            <option value="BIWEEKLY">Bi-weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
          </select>
          <Input
            type="number"
            step="0.01"
            placeholder="Base Price"
            value={formData.basePrice}
            onChange={(e) =>
              setFormData({ ...formData, basePrice: parseFloat(e.target.value) })
            }
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Schedule"}
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="pb-3 px-3 font-medium">Customer Name</th>
              <th className="pb-3 px-3 font-medium">Email</th>
              <th className="pb-3 px-3 font-medium">Service Type</th>
              <th className="pb-3 px-3 font-medium">Frequency</th>
              <th className="pb-3 px-3 font-medium">Base Price</th>
              <th className="pb-3 px-3 font-medium">Next Run</th>
              <th className="pb-3 px-3 font-medium">Status</th>
              <th className="pb-3 px-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {schedules.length === 0 ? (
              <tr className="border-b border-gray-100">
                <td colSpan={8} className="py-8 text-center text-muted-foreground">
                  No schedules yet.
                </td>
              </tr>
            ) : (
              schedules.map((schedule) => (
                <tr key={schedule.id} className="border-b border-gray-100">
                  <td className="py-3 px-3 font-medium">
                    {schedule.customerName}
                  </td>
                  <td className="py-3 px-3 text-sm">
                    {schedule.customerEmail}
                  </td>
                  <td className="py-3 px-3">
                    {schedule.serviceType}
                  </td>
                  <td className="py-3 px-3 capitalize">
                    {schedule.frequency.toLowerCase()}
                  </td>
                  <td className="py-3 px-3">${schedule.basePrice.toFixed(2)}</td>
                  <td className="py-3 px-3">
                    {schedule.nextRunDate
                      ? new Date(schedule.nextRunDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        schedule.active
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {schedule.active ? "Active" : "Paused"}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <button
                      onClick={() => handleTogglePause(schedule)}
                      disabled={loading}
                      className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      {schedule.active ? "Pause" : "Resume"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
