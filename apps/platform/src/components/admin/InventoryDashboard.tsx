"use client";

import { useState, useEffect } from "react";
import {
  Package,
  Plus,
  X,
  Loader2,
  Check,
  Edit2,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Truck,
  RotateCw,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

type InventoryItem = {
  id: string;
  name: string;
  description: string;
  category: "Cleaners" | "Equipment" | "Supplies" | "Other";
  sku: string;
  amazonASIN?: string;
  amazonURL?: string;
  unit: string;
  currentStock: number;
  minStock: number;
  reorderQty: number;
  unitCost: number;
  autoReorder: boolean;
};

type SupplyOrder = {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  totalCost: number;
  source: "Amazon" | "Manual";
  status: "pending" | "ordered" | "shipped" | "delivered";
  trackingNumber?: string;
  orderDate: string;
  deliveryDate?: string;
};

type TabType = "inventory" | "orders" | "auto-reorder";

export default function InventoryDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("inventory");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [showAddOrderForm, setShowAddOrderForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<
    "All" | "Cleaners" | "Equipment" | "Supplies" | "Other"
  >("All");
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "ordered" | "shipped" | "delivered"
  >("all");
  const [reorderLoading, setReorderLoading] = useState(false);

  const categories: Array<
    "All" | "Cleaners" | "Equipment" | "Supplies" | "Other"
  > = ["All", "Cleaners", "Equipment", "Supplies", "Other"];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsRes, ordersRes] = await Promise.all([
        fetch("/api/inventory"),
        fetch("/api/inventory/orders"),
      ]);

      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setItems(data.items || []);
      }
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Failed to load inventory data:", error);
      setMessage({ type: "error", text: "Failed to load inventory data" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrUpdateItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const itemData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      category: formData.get("category") as
        | "Cleaners"
        | "Equipment"
        | "Supplies"
        | "Other",
      sku: formData.get("sku") as string,
      amazonASIN: (formData.get("amazonASIN") as string) || undefined,
      amazonURL: (formData.get("amazonURL") as string) || undefined,
      unit: formData.get("unit") as string,
      currentStock: parseInt(formData.get("currentStock") as string, 10),
      minStock: parseInt(formData.get("minStock") as string, 10),
      reorderQty: parseInt(formData.get("reorderQty") as string, 10),
      unitCost: parseFloat(formData.get("unitCost") as string),
      autoReorder: formData.get("autoReorder") === "on",
    };

    if (!itemData.name || !itemData.sku) {
      setMessage({ type: "error", text: "Name and SKU are required" });
      return;
    }

    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editingItem ? "update" : "create",
          id: editingItem?.id,
          ...itemData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setMessage({
          type: "error",
          text: error.error || "Failed to save item",
        });
        return;
      }

      const data = await response.json();
      if (editingItem) {
        setItems(items.map((item) => (item.id === data.item.id ? data.item : item)));
      } else {
        setItems([data.item, ...items]);
      }

      setMessage({
        type: "success",
        text: editingItem ? "Item updated!" : "Item added!",
      });
      e.currentTarget.reset();
      setShowAddItemForm(false);
      setEditingItem(null);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Delete this item?")) return;

    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          id: itemId,
        }),
      });

      if (!response.ok) throw new Error("Failed to delete");

      setItems(items.filter((item) => item.id !== itemId));
      setMessage({ type: "success", text: "Item deleted" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to delete item" });
    }
  };

  const handleStockAdjustment = async (
    itemId: string,
    adjustment: number
  ) => {
    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adjust_stock",
          id: itemId,
          adjustment,
        }),
      });

      if (!response.ok) throw new Error("Failed to adjust stock");

      const data = await response.json();
      setItems(items.map((item) => (item.id === data.item.id ? data.item : item)));
    } catch (error) {
      setMessage({ type: "error", text: "Failed to adjust stock" });
    }
  };

  const handleAddOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const orderData = {
      itemId: formData.get("itemId") as string,
      quantity: parseInt(formData.get("quantity") as string, 10),
      totalCost: parseFloat(formData.get("totalCost") as string),
      source: formData.get("source") as "Amazon" | "Manual",
      trackingNumber: (formData.get("trackingNumber") as string) || undefined,
    };

    if (!orderData.itemId || !orderData.quantity) {
      setMessage({ type: "error", text: "Item and quantity are required" });
      return;
    }

    try {
      const response = await fetch("/api/inventory/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) throw new Error("Failed to create order");

      const data = await response.json();
      setOrders([data.order, ...orders]);
      setMessage({ type: "success", text: "Order created!" });
      e.currentTarget.reset();
      setShowAddOrderForm(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to create order" });
    }
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: "pending" | "ordered" | "shipped" | "delivered"
  ) => {
    try {
      const response = await fetch("/api/inventory/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          id: orderId,
          status: newStatus,
        }),
      });

      if (!response.ok) throw new Error("Failed to update order");

      const data = await response.json();
      setOrders(
        orders.map((order) => (order.id === data.order.id ? data.order : order))
      );
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update order status" });
    }
  };

  const handleCheckReorder = async () => {
    setReorderLoading(true);
    try {
      const response = await fetch("/api/inventory/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Failed to check reorder");

      const data = await response.json();
      setMessage({
        type: "success",
        text: `Reorder check complete. ${data.ordersCreated} orders created.`,
      });
      loadData();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to check reorder" });
    } finally {
      setReorderLoading(false);
    }
  };

  const getStockColor = (current: number, min: number) => {
    if (current < min) return "text-red-600 bg-red-50";
    if (current < min * 1.5) return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
  };

  const getStockBadgeColor = (current: number, min: number) => {
    if (current < min) return "bg-red-100 text-red-700";
    if (current < min * 1.5) return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-gray-100 text-gray-700",
      ordered: "bg-blue-100 text-blue-700",
      shipped: "bg-purple-100 text-purple-700",
      delivered: "bg-green-100 text-green-700",
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const filteredItems = items.filter((item) => {
    const categoryMatch =
      categoryFilter === "All" || item.category === categoryFilter;
    const stockMatch =
      !lowStockFilter || item.currentStock < item.minStock;
    return categoryMatch && stockMatch;
  });

  const filteredOrders = orders.filter(
    (order) => statusFilter === "all" || order.status === statusFilter
  );

  const autoReorderItems = items.filter((item) => item.autoReorder);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-accent">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-accent">Inventory</h1>
              <p className="text-sm text-muted-foreground">
                Manage inventory, orders, and auto-reorder settings
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-brand-100">
        <button
          onClick={() => setActiveTab("inventory")}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === "inventory"
              ? "border-b-2 border-accent text-accent"
              : "text-muted-foreground hover:text-accent"
          }`}
        >
          Inventory
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === "orders"
              ? "border-b-2 border-accent text-accent"
              : "text-muted-foreground hover:text-accent"
          }`}
        >
          Orders
        </button>
        <button
          onClick={() => setActiveTab("auto-reorder")}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === "auto-reorder"
              ? "border-b-2 border-accent text-accent"
              : "text-muted-foreground hover:text-accent"
          }`}
        >
          Auto-Reorder
        </button>
      </div>

      {/* Message Alert */}
      {message && (
        <div
          className={`rounded-lg p-3 flex items-center gap-2 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <Check className="h-4 w-4 flex-shrink-0" />
          ) : (
            <X className="h-4 w-4 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* INVENTORY TAB */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          {/* Filters and Add Button */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    categoryFilter === cat
                      ? "bg-accent text-white"
                      : "bg-brand-100 text-accent hover:bg-brand-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={lowStockFilter}
                  onChange={(e) => setLowStockFilter(e.target.checked)}
                  className="rounded"
                />
                Low Stock Only
              </label>
              <button
                onClick={() => {
                  setShowAddItemForm(!showAddItemForm);
                  setEditingItem(null);
                }}
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>
          </div>

          {/* Add/Edit Item Form */}
          {showAddItemForm && (
            <Card className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
              <CardHeader className="pb-4">
                <h3 className="text-lg font-semibold text-accent">
                  {editingItem ? "Edit Item" : "Add New Item"}
                </h3>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddOrUpdateItem} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-accent mb-1">
                        Item Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={editingItem?.name}
                        placeholder="e.g., Green Cleaner Spray"
                        className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-accent mb-1">
                        SKU *
                      </label>
                      <input
                        type="text"
                        name="sku"
                        defaultValue={editingItem?.sku}
                        placeholder="e.g., GC-SPRAY-500"
                        className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-accent mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      defaultValue={editingItem?.description}
                      placeholder="Product description..."
                      rows={2}
                      className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-accent mb-1">
                        Category *
                      </label>
                      <select
                        name="category"
                        defaultValue={editingItem?.category || "Supplies"}
                        className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                      >
                        <option>Cleaners</option>
                        <option>Equipment</option>
                        <option>Supplies</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-accent mb-1">
                        Unit *
                      </label>
                      <input
                        type="text"
                        name="unit"
                        defaultValue={editingItem?.unit || "pcs"}
                        placeholder="pcs, liters, etc."
                        className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-accent mb-1">
                        Unit Cost *
                      </label>
                      <input
                        type="number"
                        name="unitCost"
                        defaultValue={editingItem?.unitCost}
                        step="0.01"
                        placeholder="0.00"
                        className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-accent mb-1">
                        Current Stock *
                      </label>
                      <input
                        type="number"
                        name="currentStock"
                        defaultValue={editingItem?.currentStock || 0}
                        className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-accent mb-1">
                        Min Stock *
                      </label>
                      <input
                        type="number"
                        name="minStock"
                        defaultValue={editingItem?.minStock || 10}
                        className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-accent mb-1">
                        Reorder Qty *
                      </label>
                      <input
                        type="number"
                        name="reorderQty"
                        defaultValue={editingItem?.reorderQty || 50}
                        className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-accent mb-1">
                        Amazon ASIN
                      </label>
                      <input
                        type="text"
                        name="amazonASIN"
                        defaultValue={editingItem?.amazonASIN}
                        placeholder="B00XXXXX"
                        className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-accent mb-1">
                        Amazon URL
                      </label>
                      <input
                        type="url"
                        name="amazonURL"
                        defaultValue={editingItem?.amazonURL}
                        placeholder="https://amazon.com/..."
                        className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="autoReorder"
                      id="autoReorder"
                      defaultChecked={editingItem?.autoReorder}
                      className="rounded"
                    />
                    <label
                      htmlFor="autoReorder"
                      className="text-sm font-medium text-accent"
                    >
                      Enable Auto-Reorder
                    </label>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      type="submit"
                      className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
                    >
                      <Check className="h-4 w-4" />
                      {editingItem ? "Update Item" : "Add Item"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddItemForm(false);
                        setEditingItem(null);
                      }}
                      className="rounded-full border border-brand-100 bg-white px-4 py-2 text-sm font-semibold text-accent hover:bg-brand-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Items Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : filteredItems.length === 0 ? (
            <Card className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm text-center">
              <Package className="mx-auto h-8 w-8 text-brand-200 mb-2" />
              <p className="text-muted-foreground">
                {items.length === 0
                  ? "No items yet. Add your first item!"
                  : "No items match your filters."}
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-accent">{item.name}</h3>
                        <p className="text-xs text-muted-foreground">{item.sku}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          item.category === "Cleaners"
                            ? "bg-blue-100 text-blue-700"
                            : item.category === "Equipment"
                              ? "bg-purple-100 text-purple-700"
                              : item.category === "Supplies"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {item.category}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    )}

                    <div className={`rounded-lg p-3 ${getStockColor(item.currentStock, item.minStock)}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">
                          {item.currentStock} {item.unit}
                        </span>
                        <span className="text-xs">
                          Min: {item.minStock}
                        </span>
                      </div>
                      {item.currentStock < item.minStock && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertCircle className="h-3 w-3" />
                          <span className="text-xs font-medium">Low Stock</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-brand-100 pt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Unit Cost</p>
                        <p className="font-semibold text-accent">
                          ${item.unitCost.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Value</p>
                        <p className="font-semibold text-accent">
                          ${(item.currentStock * item.unitCost).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleStockAdjustment(item.id, -1)
                        }
                        className="flex-1 rounded-lg border border-brand-100 bg-white px-2 py-1.5 text-sm font-medium text-accent hover:bg-brand-50 transition-colors flex items-center justify-center gap-1"
                      >
                        <ChevronDown className="h-3 w-3" />
                        Decrease
                      </button>
                      <button
                        onClick={() =>
                          handleStockAdjustment(item.id, 1)
                        }
                        className="flex-1 rounded-lg border border-brand-100 bg-white px-2 py-1.5 text-sm font-medium text-accent hover:bg-brand-50 transition-colors flex items-center justify-center gap-1"
                      >
                        <ChevronUp className="h-3 w-3" />
                        Increase
                      </button>
                    </div>

                    {item.amazonURL && (
                      <a
                        href={item.amazonURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-accent hover:bg-brand-100 transition-colors"
                      >
                        View on Amazon
                      </a>
                    )}

                    {item.autoReorder && (
                      <div className="flex items-center gap-1 rounded-lg bg-green-50 px-2 py-1 text-xs text-green-700">
                        <RotateCw className="h-3 w-3" />
                        Auto-Reorder Enabled
                      </div>
                    )}

                    <div className="flex gap-2 border-t border-brand-100 pt-3">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setShowAddItemForm(true);
                        }}
                        className="flex-1 rounded-lg border border-brand-100 bg-white px-3 py-1.5 text-xs font-medium text-accent hover:bg-brand-50 transition-colors flex items-center justify-center gap-1"
                      >
                        <Edit2 className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {["all", "pending", "ordered", "shipped", "delivered"].map((status) => (
                <button
                  key={status}
                  onClick={() =>
                    setStatusFilter(
                      status as
                        | "all"
                        | "pending"
                        | "ordered"
                        | "shipped"
                        | "delivered"
                    )
                  }
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? "bg-accent text-white"
                      : "bg-brand-100 text-accent hover:bg-brand-200"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddOrderForm(!showAddOrderForm)}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Order
            </button>
          </div>

          {/* Add Order Form */}
          {showAddOrderForm && (
            <Card className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
              <CardHeader className="pb-4">
                <h3 className="text-lg font-semibold text-accent">Create Order</h3>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddOrder} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-accent mb-1">
                        Item *
                      </label>
                      <select
                        name="itemId"
                        className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                        required
                      >
                        <option value="">Select an item...</option>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-accent mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        placeholder="0"
                        className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-accent mb-1">
                        Total Cost *
                      </label>
                      <input
                        type="number"
                        name="totalCost"
                        placeholder="0.00"
                        step="0.01"
                        className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-accent mb-1">
                        Source *
                      </label>
                      <select
                        name="source"
                        className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                        required
                      >
                        <option value="Amazon">Amazon</option>
                        <option value="Manual">Manual</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-accent mb-1">
                      Tracking Number
                    </label>
                    <input
                      type="text"
                      name="trackingNumber"
                      placeholder="Optional"
                      className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      type="submit"
                      className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
                    >
                      <Check className="h-4 w-4" />
                      Create Order
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddOrderForm(false)}
                      className="rounded-full border border-brand-100 bg-white px-4 py-2 text-sm font-semibold text-accent hover:bg-brand-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Orders Table */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm text-center">
              <Truck className="mx-auto h-8 w-8 text-brand-200 mb-2" />
              <p className="text-muted-foreground">
                No orders found.
              </p>
            </Card>
          ) : (
            <Card className="rounded-2xl border border-brand-100 bg-white overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-brand-100 bg-brand-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-accent">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-accent">
                        Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-accent">
                        Total Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-accent">
                        Source
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-accent">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-accent">
                        Tracking
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-accent">
                        Order Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="border-b border-brand-100 hover:bg-brand-50">
                        <td className="px-6 py-4 text-sm text-accent font-medium">
                          {order.itemName}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {order.quantity}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-accent">
                          ${order.totalCost.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {order.source}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <select
                            value={order.status}
                            onChange={(e) =>
                              handleUpdateOrderStatus(
                                order.id,
                                e.target.value as
                                  | "pending"
                                  | "ordered"
                                  | "shipped"
                                  | "delivered"
                              )
                            }
                            className={`rounded-full px-3 py-1 text-xs font-medium border-0 cursor-pointer ${getStatusColor(
                              order.status
                            )}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="ordered">Ordered</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {order.trackingNumber || "—"}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {new Date(order.orderDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* AUTO-REORDER TAB */}
      {activeTab === "auto-reorder" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-accent">
                Auto-Reorder Items
              </h2>
              <p className="text-sm text-muted-foreground">
                Items with auto-reorder enabled will create orders when stock
                falls below minimum.
              </p>
            </div>
            <button
              onClick={handleCheckReorder}
              disabled={reorderLoading}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {reorderLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RotateCw className="h-4 w-4" />
                  Check & Reorder Now
                </>
              )}
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : autoReorderItems.length === 0 ? (
            <Card className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm text-center">
              <RotateCw className="mx-auto h-8 w-8 text-brand-200 mb-2" />
              <p className="text-muted-foreground">
                No items with auto-reorder enabled.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {autoReorderItems.map((item) => {
                const needsReorder = item.currentStock < item.minStock;
                return (
                  <Card
                    key={item.id}
                    className={`rounded-2xl border p-4 ${
                      needsReorder
                        ? "border-red-200 bg-red-50"
                        : "border-brand-100 bg-white"
                    } shadow-sm`}
                  >
                    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                      <div className="flex-1">
                        <h3 className="font-semibold text-accent">{item.name}</h3>
                        <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Current Stock</p>
                            <p className="font-semibold text-accent">
                              {item.currentStock} {item.unit}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Min Stock</p>
                            <p className="font-semibold text-accent">
                              {item.minStock} {item.unit}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Reorder Qty</p>
                            <p className="font-semibold text-accent">
                              {item.reorderQty} {item.unit}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              Est. Cost
                            </p>
                            <p className="font-semibold text-accent">
                              ${(item.reorderQty * item.unitCost).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                      {needsReorder && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2">
                          <AlertCircle className="h-4 w-4 text-red-700" />
                          <span className="text-xs font-semibold text-red-700">
                            Needs Reorder
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
