"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

interface GiftCardData {
  id: string;
  code: string;
  tenantId: string;
  purchaserName: string | null;
  purchaserEmail: string;
  recipientEmail: string | null;
  recipientName: string | null;
  message: string | null;
  initialBalance: number;
  currentBalance: number;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function GiftCardsClient({
  initialData,
}: {
  initialData: GiftCardData[];
}) {
  const [giftCards, setGiftCards] = useState<GiftCardData[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    code: "",
    purchaserName: "",
    purchaserEmail: "",
    initialBalance: "",
  });

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.code.trim()) {
      setError("Gift card code is required");
      return;
    }
    if (!formData.purchaserName.trim()) {
      setError("Purchaser name is required");
      return;
    }
    if (!formData.purchaserEmail.trim()) {
      setError("Purchaser email is required");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.purchaserEmail)) {
      setError("Please enter a valid email address");
      return;
    }
    if (!formData.initialBalance || parseFloat(formData.initialBalance) <= 0) {
      setError("Initial amount must be greater than 0");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/gift-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          initialBalance: parseFloat(formData.initialBalance),
        }),
      });

      if (!response.ok) throw new Error("Failed to create gift card");

      const newCard = await response.json();
      setGiftCards([newCard, ...giftCards]);
      setFormData({ code: "", purchaserName: "", purchaserEmail: "", initialBalance: "" });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Deactivate this gift card?")) return;

    try {
      const response = await fetch(`/api/admin/gift-cards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      });

      if (!response.ok) throw new Error("Failed to deactivate card");

      setGiftCards(
        giftCards.map((c) => (c.id === id ? { ...c, active: false } : c))
      );
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
        {showForm ? "Cancel" : "Create Gift Card"}
      </button>

      {showForm && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">New Gift Card</h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  className="w-full rounded border px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Purchaser Name
                </label>
                <input
                  type="text"
                  value={formData.purchaserName}
                  onChange={(e) =>
                    setFormData({ ...formData, purchaserName: e.target.value })
                  }
                  className="w-full rounded border px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Purchaser Email
                </label>
                <input
                  type="email"
                  value={formData.purchaserEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, purchaserEmail: e.target.value })
                  }
                  className="w-full rounded border px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Initial Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.initialBalance}
                  onChange={(e) =>
                    setFormData({ ...formData, initialBalance: e.target.value })
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
                {loading ? "Creating..." : "Create"}
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {giftCards.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No gift cards yet.
        </p>
      ) : (
        <Card>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Code</th>
                  <th className="text-left py-3 px-4">Purchaser</th>
                  <th className="text-right py-3 px-4">Balance</th>
                  <th className="text-center py-3 px-4">Status</th>
                  <th className="text-center py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {giftCards.map((card) => (
                  <tr key={card.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-xs">{card.code}</td>
                    <td className="py-3 px-4">{card.purchaserName}</td>
                    <td className="text-right py-3 px-4">
                      ${card.currentBalance.toFixed(2)}
                    </td>
                    <td className="text-center py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          card.active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {card.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      {card.active && (
                        <button
                          onClick={() => handleDeactivate(card.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Deactivate
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
