"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, Save } from "lucide-react";

type Slot = {
  id?: string;
  weekday: number;
  startTime: string;
  endTime: string;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DEFAULT_START = "08:00";
const DEFAULT_END = "17:00";

export const AvailabilityEditor = () => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fetch current availability
  useEffect(() => {
    fetch("/api/cleaner/availability")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSlots(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addSlot = (weekday: number) => {
    setSlots((prev) => [
      ...prev,
      { weekday, startTime: DEFAULT_START, endTime: DEFAULT_END },
    ]);
    setSaved(false);
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const updateSlot = (index: number, field: "startTime" | "endTime", value: string) => {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/cleaner/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slots: slots.map(({ weekday, startTime, endTime }) => ({
            weekday,
            startTime,
            endTime,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to save availability");
        return;
      }

      const updated = await res.json();
      if (Array.isArray(updated)) {
        setSlots(updated);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading availability...
      </div>
    );
  }

  // Group slots by weekday
  const slotsByDay = new Map<number, { slot: Slot; globalIndex: number }[]>();
  slots.forEach((slot, idx) => {
    const existing = slotsByDay.get(slot.weekday) || [];
    existing.push({ slot, globalIndex: idx });
    slotsByDay.set(slot.weekday, existing);
  });

  return (
    <div className="space-y-4">
      {WEEKDAYS.map((dayName, weekday) => {
        const daySlots = slotsByDay.get(weekday) || [];
        const isActive = daySlots.length > 0;

        return (
          <div
            key={weekday}
            className={`rounded-2xl border p-4 transition-colors ${
              isActive
                ? "border-brand-200 bg-brand-50/40"
                : "border-brand-100 bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3
                className={`text-sm font-semibold ${
                  isActive ? "text-accent" : "text-muted-foreground"
                }`}
              >
                {dayName}
              </h3>
              <button
                type="button"
                onClick={() => addSlot(weekday)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-100"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Slot
              </button>
            </div>

            {daySlots.length === 0 ? (
              <p className="text-xs text-muted-foreground">Not available</p>
            ) : (
              <div className="space-y-2">
                {daySlots.map(({ slot, globalIndex }) => (
                  <div key={globalIndex} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateSlot(globalIndex, "startTime", e.target.value)}
                      className="rounded-xl border border-brand-100 bg-white px-2 py-1.5 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateSlot(globalIndex, "endTime", e.target.value)}
                      className="rounded-xl border border-brand-100 bg-white px-2 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeSlot(globalIndex)}
                      className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-2xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : saved ? (
          <>
            <Save className="h-4 w-4" />
            Saved!
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Save Availability
          </>
        )}
      </button>
    </div>
  );
};
