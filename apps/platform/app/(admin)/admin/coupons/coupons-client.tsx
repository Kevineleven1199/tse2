"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";

interface Coupon {
  id: string;
  code: string;
  discountType: "FIXED" | "PERCENTAGE";
  discountValue: number;
  usedCount: number;
  active: boolean;
  createdAt: string;
}

export default function CouponsClient({
  initialCoupons,
}: {
  initialCoupons: Coupon[];
}) {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    discountType: "FIXED" as "FIXED" | "PERCENTAGE",
    discountValue: 0,
  });

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.code.trim()) {
      setError("Coupon code is required");
      return;
    }
    if (formData.discountValue <= 0) {
      setError("Discount value must be greater than 0");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error("Failed to create coupon");
      const newCoupon = await response.json();
      setCoupons([newCoupon, ...coupons]);
      setFormData({ code: "", discountType: "FIXED", discountValue: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (couponId: string, active: boolean) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/coupons/${couponId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      if (!response.ok) throw new Error("Failed to update coupon");
      const updated = await response.json();
      setCoupons(coupons.map((c) => (c.id === couponId ? updated : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (couponId: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/coupons/${couponId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete coupon");
      setCoupons(coupons.filter((c) => c.id !== couponId));
      setDeleteConfirmId(null);
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
        onSubmit={handleCreateCoupon}
        className="rounded-lg border p-4 space-y-4 bg-gray-50"
      >
        <h3 className="text-lg font-semibold">Create Coupon</h3>
        <div className="grid grid-cols-4 gap-4">
          <Input
            placeholder="Code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          />
          <select
            value={formData.discountType}
            onChange={(e) =>
              setFormData({
                ...formData,
                discountType: e.target.value as "FIXED" | "PERCENTAGE",
              })
            }
            className="rounded-lg border px-3 py-2"
          >
            <option value="FIXED">Fixed</option>
            <option value="PERCENTAGE">Percentage</option>
          </select>
          <Input
            type="number"
            placeholder="Value"
            value={formData.discountValue}
            onChange={(e) =>
              setFormData({
                ...formData,
                discountValue: parseFloat(e.target.value),
              })
            }
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="pb-3 px-3 font-medium">Code</th>
              <th className="pb-3 px-3 font-medium">Type</th>
              <th className="pb-3 px-3 font-medium">Value</th>
              <th className="pb-3 px-3 font-medium">Uses</th>
              <th className="pb-3 px-3 font-medium">Status</th>
              <th className="pb-3 px-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr className="border-b border-gray-100">
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  No coupons yet.
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => (
                <tr key={coupon.id} className="border-b border-gray-100">
                  <td className="py-3 px-3 font-mono font-semibold">
                    {coupon.code}
                  </td>
                  <td className="py-3 px-3 capitalize">
                    {coupon.discountType}
                  </td>
                  <td className="py-3 px-3">
                    {coupon.discountType === "PERCENTAGE"
                      ? `${coupon.discountValue}%`
                      : `$${coupon.discountValue.toFixed(2)}`}
                  </td>
                  <td className="py-3 px-3">{coupon.usedCount}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        coupon.active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {coupon.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {deleteConfirmId === coupon.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(coupon.id)}
                          disabled={loading}
                          className="text-xs text-red-600 font-medium hover:text-red-700 disabled:opacity-50"
                        >
                          Yes, delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          disabled={loading}
                          className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleToggleActive(coupon.id, coupon.active)
                          }
                          disabled={loading}
                          className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          {coupon.active ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(coupon.id)}
                          disabled={loading}
                          className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    )}
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
