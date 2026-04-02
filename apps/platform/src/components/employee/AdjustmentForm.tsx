"use client";

import { useState } from "react";

type Props = {
  cleanerId: string;
  periodStart: string;
  periodEnd: string;
  adjustment?: {
    id: string;
    type: "deduction" | "reimbursement" | "bonus";
    amount: number;
    description: string;
  } | null;
  onSaved: () => void;
  onCancel: () => void;
};

export const AdjustmentForm = ({
  cleanerId,
  periodStart,
  periodEnd,
  adjustment,
  onSaved,
  onCancel,
}: Props) => {
  const [type, setType] = useState<"deduction" | "reimbursement" | "bonus">(
    adjustment?.type ?? "deduction"
  );
  const [amount, setAmount] = useState(
    adjustment ? adjustment.amount.toString() : ""
  );
  const [description, setDescription] = useState(adjustment?.description ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;
    setSaving(true);

    const endpoint = adjustment
      ? `/api/employee/payroll-adjustments/${adjustment.id}`
      : "/api/employee/payroll-adjustments";

    await fetch(endpoint, {
      method: adjustment ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cleanerId,
        type,
        amount: parseFloat(amount),
        description,
        payPeriodStart: periodStart,
        payPeriodEnd: periodEnd,
      }),
    });

    setSaving(false);
    onSaved();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm font-semibold text-accent">
        {adjustment ? "Edit Adjustment" : "Add Adjustment"}
      </p>
      <div className="flex flex-wrap gap-2">
        {(["deduction", "reimbursement", "bonus"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
              type === t
                ? t === "deduction"
                  ? "bg-red-500 text-white ring-2 ring-red-300"
                  : t === "reimbursement"
                    ? "bg-green-500 text-white ring-2 ring-green-300"
                    : "bg-blue-500 text-white ring-2 ring-blue-300"
                : "bg-brand-50 text-accent hover:ring-2 hover:ring-brand-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-accent">
            Amount ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="0.00"
            className="w-full rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-accent">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="e.g., Uniform deduction, Mileage reimbursement..."
            className="w-full rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-accent px-6 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : adjustment ? "Update Adjustment" : "Add Adjustment"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-brand-100 px-6 py-2 text-xs font-semibold text-accent transition hover:bg-brand-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
