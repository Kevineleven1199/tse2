"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

interface JobCostData {
  id: string;
  jobId: string;
  category: string;
  description: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export default function JobCostingClient({
  initialData,
}: {
  initialData: JobCostData[];
}) {
  const [data, setData] = useState<JobCostData[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    jobId: "",
    category: "",
    description: "",
    amount: "",
  });

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.jobId.trim()) {
      setError("Job ID is required");
      return;
    }
    if (!formData.category.trim()) {
      setError("Category is required");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("Amount must be greater than 0");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/job-costing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      if (!response.ok) throw new Error("Failed to add cost");

      const newCost = await response.json();
      setData([newCost, ...data]);
      setFormData({ jobId: "", category: "", description: "", amount: "" });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/job-costing/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      setData(data.filter((item) => item.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={() => setShowForm(!showForm)}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        {showForm ? "Cancel" : "Add Cost"}
      </button>

      {showForm && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">New Cost Entry</h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddCost} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Job ID
                </label>
                <input
                  type="text"
                  value={formData.jobId}
                  onChange={(e) =>
                    setFormData({ ...formData, jobId: e.target.value })
                  }
                  className="w-full rounded border px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full rounded border px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="w-full rounded border px-3 py-2 text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {data.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No cost entries yet.
        </p>
      ) : (
        <Card>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Job ID</th>
                  <th className="text-left py-3 px-4">Category</th>
                  <th className="text-left py-3 px-4">Description</th>
                  <th className="text-right py-3 px-4">Amount</th>
                  <th className="text-center py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.map((cost) => (
                  <tr key={cost.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-xs">{cost.jobId}</td>
                    <td className="py-3 px-4">{cost.category}</td>
                    <td className="py-3 px-4">{cost.description}</td>
                    <td className="text-right py-3 px-4">
                      ${cost.amount.toFixed(2)}
                    </td>
                    <td className="text-center py-3 px-4">
                      {deleteConfirmId === cost.id ? (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleDelete(cost.id)}
                            className="text-red-600 font-medium text-sm hover:text-red-700"
                          >
                            Yes, delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-gray-500 text-sm hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(cost.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
