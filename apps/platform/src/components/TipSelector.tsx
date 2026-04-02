"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";

type TipSelectorProps = {
  jobId?: string;
  invoiceId?: string;
  jobTotal: number;
  onTipSubmitted?: (tipData: { amount: number; paymentMethod: string }) => void;
};

export function TipSelector({
  jobId,
  invoiceId,
  jobTotal,
  onTipSubmitted,
}: TipSelectorProps) {
  const [selectedTip, setSelectedTip] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "cash">("stripe");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tipPercentages = [10, 15, 20];
  const tipAmounts = tipPercentages.map((pct) => (jobTotal * pct) / 100);

  const handleTipSelect = (amount: number) => {
    setSelectedTip(amount);
    setCustomTip("");
    setError(null);
  };

  const handleCustomTip = (value: string) => {
    setCustomTip(value);
    setSelectedTip(null);
    setError(null);
  };

  const getTipAmount = (): number => {
    if (selectedTip !== null) {
      return selectedTip;
    }
    return customTip ? parseFloat(customTip) : 0;
  };

  const handleSubmit = async () => {
    const tipAmount = getTipAmount();
    if (tipAmount <= 0) {
      setError("Please select or enter a tip amount");
      return;
    }

    if (!jobId && !invoiceId) {
      setError("No job or invoice specified");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          invoiceId,
          amount: tipAmount,
          paymentMethod,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit tip");
      }

      setSubmitted(true);
      onTipSubmitted?.({ amount: tipAmount, paymentMethod });

      // Reset after 3 seconds
      setTimeout(() => {
        setSelectedTip(null);
        setCustomTip("");
        setSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error("Error submitting tip:", error);
      setError(`Error: ${error instanceof Error ? error.message : "Failed to submit tip"}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-6 text-center">
          <p className="text-lg font-semibold text-green-900">
            Thank you for the tip!
          </p>
          <p className="text-sm text-green-700">
            Your generosity is greatly appreciated
          </p>
        </CardContent>
      </Card>
    );
  }

  const tipAmount = getTipAmount();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Add a Tip</CardTitle>
        <p className="mt-1 text-sm text-gray-600">
          Thank you for using Tri State Enterprise!
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error State */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Tip Percentage Buttons */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Quick tip</p>
          <div className="grid grid-cols-3 gap-2">
            {tipPercentages.map((pct, idx) => (
              <button
                key={pct}
                onClick={() => handleTipSelect(tipAmounts[idx])}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${
                  selectedTip === tipAmounts[idx]
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
              >
                {pct}%
                <br />
                <span className="text-xs font-normal">
                  ${tipAmounts[idx].toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Tip */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Or enter custom amount
          </label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-700">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={customTip}
              onChange={(e) => handleCustomTip(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium text-gray-700">Payment method</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPaymentMethod("stripe")}
              className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-all ${
                paymentMethod === "stripe"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              Card
            </button>
            <button
              onClick={() => setPaymentMethod("cash")}
              className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-all ${
                paymentMethod === "cash"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              Cash
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          variant="primary"
          className="w-full"
          onClick={handleSubmit}
          disabled={submitting || tipAmount === 0}
        >
          {submitting ? "Processing..." : `Add Tip ${tipAmount > 0 ? `$${tipAmount.toFixed(2)}` : ""}`}
        </Button>

        <p className="text-xs text-center text-gray-500">
          Tips go directly to your cleaner and are not subject to fees
        </p>
      </CardContent>
    </Card>
  );
}
