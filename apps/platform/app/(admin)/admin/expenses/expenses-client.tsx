"use client";

import { useState, useMemo } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";

interface Expense {
  id: string;
  tenantId: string;
  category: string;
  vendor: string | null;
  description: string;
  amount: number;
  date: string;
  recurring: boolean;
  receiptUrl: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  "labor",
  "supplies",
  "marketing",
  "software",
  "insurance",
  "fuel",
  "equipment",
  "other",
];

export default function ExpensesClient({
  initialExpenses,
}: {
  initialExpenses: Expense[];
}) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    category: "supplies",
    vendor: "",
    description: "",
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    recurring: false,
  });

  const filtered = useMemo(() => {
    return expenses.filter((exp) => {
      const matchesSearch =
        exp.description.toLowerCase().includes(search.toLowerCase()) ||
        (exp.vendor?.toLowerCase() || "").includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || exp.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, search, categoryFilter]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.description.trim()) {
      setError("Description is required");
      return;
    }
    if (formData.amount <= 0) {
      setError("Amount must be greater than 0");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to create expense");

      const newExpense = await response.json();
      setExpenses([newExpense, ...expenses]);
      setFormData({
        category: "supplies",
        vendor: "",
        description: "",
        amount: 0,
        date: new Date().toISOString().split("T")[0],
        recurring: false,
      });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/expenses/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete expense");

      setExpenses(expenses.filter((exp) => exp.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      labor: "bg-blue-100 text-blue-800",
      supplies: "bg-green-100 text-green-800",
      marketing: "bg-purple-100 text-purple-800",
      software: "bg-pink-100 text-pink-800",
      insurance: "bg-orange-100 text-orange-800",
      fuel: "bg-yellow-100 text-yellow-800",
      equipment: "bg-indigo-100 text-indigo-800",
      other: "bg-gray-100 text-gray-800",
    };
    return colors[category] || colors.other;
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <Input
          placeholder="Search by description or vendor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          {showForm ? "Cancel" : "Add Expense"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreateExpense}
          className="rounded-lg border p-4 space-y-4 bg-gray-50"
        >
          <h3 className="text-lg font-semibold">New Expense</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full rounded-lg border px-3 py-2"
                required
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <Input
              placeholder="Vendor"
              value={formData.vendor}
              onChange={(e) =>
                setFormData({ ...formData, vendor: e.target.value })
              }
            />
            <Input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              required
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Amount"
              value={formData.amount || ""}
              onChange={(e) =>
                setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
              }
              required
            />
            <Input
              placeholder="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recurring"
                checked={formData.recurring}
                onChange={(e) =>
                  setFormData({ ...formData, recurring: e.target.checked })
                }
                className="rounded"
              />
              <label htmlFor="recurring" className="text-sm font-medium">
                Recurring
              </label>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Expense"}
          </button>
        </form>
      )}

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No expenses found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 px-3 font-medium">Date</th>
                <th className="pb-3 px-3 font-medium">Category</th>
                <th className="pb-3 px-3 font-medium">Vendor</th>
                <th className="pb-3 px-3 font-medium">Description</th>
                <th className="pb-3 px-3 font-medium text-right">Amount</th>
                <th className="pb-3 px-3 font-medium">Recurring</th>
                <th className="pb-3 px-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((expense) => (
                <tr key={expense.id} className="border-b border-gray-100">
                  <td className="py-3 px-3">
                    {new Date(expense.date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getCategoryColor(
                        expense.category
                      )}`}
                    >
                      {expense.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-sm">
                    {expense.vendor || "-"}
                  </td>
                  <td className="py-3 px-3">{expense.description}</td>
                  <td className="py-3 px-3 text-right font-medium">
                    ${expense.amount.toFixed(2)}
                  </td>
                  <td className="py-3 px-3">
                    {expense.recurring ? (
                      <span className="text-xs font-medium text-green-700">Yes</span>
                    ) : (
                      <span className="text-xs font-medium text-gray-500">No</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {deleteConfirmId === expense.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="text-xs text-red-600 font-medium hover:text-red-700"
                        >
                          Yes, delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(expense.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
