"use client";

import { useState, useEffect } from "react";
import { Card } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";

interface CancellationPolicy {
  id: string;
  name: string;
  hoursBeforeJob: number;
  feeType: "PERCENTAGE" | "FIXED";
  feeValue: number;
  active: boolean;
  createdAt: string;
}

type FeeType = "PERCENTAGE" | "FIXED";

interface FormData {
  name: string;
  hoursBeforeJob: string;
  feeType: FeeType;
  feeValue: string;
}

export function CancellationPoliciesManager() {
  const [policies, setPolicies] = useState<CancellationPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    hoursBeforeJob: "24",
    feeType: "PERCENTAGE",
    feeValue: "10"
  });
  const [error, setError] = useState<string | null>(null);

  // Fetch policies on mount
  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/cancellation-policies");
      if (!response.ok) throw new Error("Failed to fetch policies");
      const data = await response.json();
      setPolicies(data.policies || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch("/api/admin/cancellation-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          hoursBeforeJob: parseInt(formData.hoursBeforeJob),
          feeType: formData.feeType,
          feeValue: parseFloat(formData.feeValue)
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create policy");
      }

      // Reset form and refresh list
      setFormData({
        name: "",
        hoursBeforeJob: "24",
        feeType: "PERCENTAGE",
        feeValue: "10"
      });
      setShowForm(false);
      await fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading policies...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      <div>
        <Button
          variant="primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "Add New Policy"}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900">
                Policy Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Same Day Cancellation"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Hours Before Job
              </label>
              <input
                type="number"
                value={formData.hoursBeforeJob}
                onChange={(e) =>
                  setFormData({ ...formData, hoursBeforeJob: e.target.value })
                }
                placeholder="e.g., 24"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                required
              />
              <p className="mt-1 text-sm text-gray-600">
                Fee applies if cancelled within this many hours before job
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Fee Type
              </label>
              <select
                value={formData.feeType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    feeType: e.target.value as FeeType
                  })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="PERCENTAGE">Percentage of payout</option>
                <option value="FIXED">Fixed amount</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Fee Value {formData.feeType === "PERCENTAGE" ? "(%)" : "($)"}
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.feeValue}
                onChange={(e) =>
                  setFormData({ ...formData, feeValue: e.target.value })
                }
                placeholder={formData.feeType === "PERCENTAGE" ? "e.g., 10" : "e.g., 50"}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                required
              />
            </div>

            <div className="flex gap-2">
              <Button variant="primary" type="submit">
                Create Policy
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        {policies.length === 0 ? (
          <p className="text-gray-600 py-8 text-center">
            No cancellation policies configured yet.
          </p>
        ) : (
          <div className="grid gap-4">
            {policies.map((policy) => (
              <Card key={policy.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {policy.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Cancellation within {policy.hoursBeforeJob} hours
                    </p>
                    <p className="text-sm text-gray-600">
                      Fee:{" "}
                      {policy.feeType === "PERCENTAGE"
                        ? `${policy.feeValue}% of payout`
                        : `$${policy.feeValue.toFixed(2)}`}
                    </p>
                    {!policy.active && (
                      <p className="text-sm text-yellow-600 mt-2">
                        Status: Inactive
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    Created {new Date(policy.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
