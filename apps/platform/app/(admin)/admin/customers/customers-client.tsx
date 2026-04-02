"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Upload,
  Download,
  Users,
  TrendingUp,
  DollarSign,
  UserPlus,
  MoreHorizontal,
  Mail,
  Calendar,
  Ban,
  Edit2,
  Eye,
  X,
  ChevronUp,
  ChevronDown,
  Check,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { formatCurrency } from "@/src/lib/utils";
import { CsvImportModal } from "@/src/components/crm/CsvImportModal";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  totalJobs: number;
  totalSpent: number;
  lastService: string | null;
  status: string;
  tags: string[];
  createdAt: string;
}

interface CustomerStats {
  totalCustomers: number;
  activeThisMonth: number;
  avgLifetimeValue: number;
  churnRate: number;
}

interface CustomersClientProps {
  initialCustomers: Customer[];
  initialStats: CustomerStats;
}

type SortColumn = "name" | "email" | "totalJobs" | "totalSpent" | "lastService";
type SortDirection = "asc" | "desc";
type FilterTab = "all" | "active" | "inactive" | "new" | "vip";

export default function CustomersPageClient({
  initialCustomers,
  initialStats,
}: CustomersClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    tags: "",
    notes: "",
  });
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  // Filter logic
  const filteredCustomers = useMemo(() => {
    let result = initialCustomers;

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (customer) =>
          `${customer.firstName} ${customer.lastName}`
            .toLowerCase()
            .includes(q) ||
          customer.email.toLowerCase().includes(q) ||
          (customer.phone && customer.phone.includes(searchQuery)) ||
          (customer.city || "").toLowerCase().includes(q)
      );
    }

    // Tab filters
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    switch (activeTab) {
      case "active":
        result = result.filter(
          (c) =>
            c.lastService && new Date(c.lastService) > ninetyDaysAgo
        );
        break;
      case "inactive":
        result = result.filter(
          (c) =>
            !c.lastService || new Date(c.lastService) <= ninetyDaysAgo
        );
        break;
      case "new":
        result = result.filter(
          (c) => new Date(c.createdAt) > thirtyDaysAgo
        );
        break;
      case "vip":
        result = result.filter((c) => c.totalJobs >= 15);
        break;
      case "all":
      default:
        break;
    }

    // Sorting
    result.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortColumn) {
        case "name":
          aVal = `${a.firstName} ${a.lastName}`.toLowerCase();
          bVal = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case "email":
          aVal = a.email.toLowerCase();
          bVal = b.email.toLowerCase();
          break;
        case "totalJobs":
          aVal = a.totalJobs;
          bVal = b.totalJobs;
          break;
        case "totalSpent":
          aVal = a.totalSpent;
          bVal = b.totalSpent;
          break;
        case "lastService":
          aVal = a.lastService ? new Date(a.lastService).getTime() : 0;
          bVal = b.lastService ? new Date(b.lastService).getTime() : 0;
          break;
      }

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return result;
  }, [initialCustomers, searchQuery, activeTab, sortColumn, sortDirection]);

  // Calculate stats for active filters
  const displayStats = useMemo(() => {
    if (activeTab === "all") {
      return initialStats;
    }
    return {
      ...initialStats,
      totalCustomers: filteredCustomers.length,
    };
  }, [initialStats, activeTab, filteredCustomers.length]);

  const handleSort = useCallback((column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }, [sortColumn, sortDirection]);

  const handleAddClick = () => {
    setEditingCustomer(null);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      tags: "",
      notes: "",
    });
    setShowAddModal(true);
  };

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      postalCode: customer.postalCode || "",
      tags: customer.tags.join(", "),
      notes: "",
    });
    setShowAddModal(true);
    setActionMenuOpen(null);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const method = editingCustomer ? "PATCH" : "POST";
      const url = editingCustomer
        ? `/api/admin/customers/${editingCustomer.id}`
        : "/api/admin/customers";

      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        postalCode: formData.postalCode || null,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save customer");
      }

      setShowAddModal(false);
      router.refresh();
    } catch (error) {
      console.error("Error saving customer:", error);
      alert("Failed to save customer. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = useCallback(() => {
    const headers = [
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Address",
      "City",
      "State",
      "Postal Code",
      "Total Jobs",
      "Total Spent",
      "Last Service",
      "Status",
      "Tags",
    ];

    const rows = filteredCustomers.map((c) => [
      c.firstName,
      c.lastName,
      c.email,
      c.phone || "",
      c.address || "",
      c.city || "",
      c.state || "",
      c.postalCode || "",
      c.totalJobs,
      c.totalSpent,
      c.lastService
        ? new Date(c.lastService).toLocaleDateString()
        : "",
      c.status,
      c.tags.join(";"),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) =>
            typeof cell === "string" && cell.includes(",")
              ? `"${cell}"`
              : cell
          )
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, [filteredCustomers]);

  const getStatusBadge = (customer: Customer) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    if (new Date(customer.createdAt) > thirtyDaysAgo) {
      return { label: "New", color: "bg-blue-100 text-blue-800" };
    }
    if (customer.totalJobs >= 15) {
      return { label: "VIP", color: "bg-purple-100 text-purple-800" };
    }
    if (customer.lastService && new Date(customer.lastService) > ninetyDaysAgo) {
      return { label: "Active", color: "bg-green-100 text-green-800" };
    }
    return { label: "Inactive", color: "bg-gray-100 text-gray-800" };
  };

  const SortHeader = ({
    label,
    column,
  }: {
    label: string;
    column: SortColumn;
  }) => (
    <th
      onClick={() => handleSort(column)}
      className="pb-3 font-medium cursor-pointer hover:text-accent transition"
    >
      <div className="flex items-center gap-2">
        {label}
        {sortColumn === column &&
          (sortDirection === "asc" ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          ))}
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-accent">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {displayStats.totalCustomers} total customers
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white hover:bg-brand-700 rounded-xl transition font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-brand-200 text-brand-600 hover:bg-brand-50 rounded-xl transition font-medium"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-brand-200 text-brand-600 hover:bg-brand-50 rounded-xl transition font-medium"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name, email, phone, or city..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-brand-200 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
        />
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Customers
              </p>
              <p className="text-2xl font-bold text-accent mt-1">
                {displayStats.totalCustomers}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Active This Month
              </p>
              <p className="text-2xl font-bold text-accent mt-1">
                {displayStats.activeThisMonth}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Avg Lifetime Value
              </p>
              <p className="text-2xl font-bold text-accent mt-1">
                {formatCurrency(displayStats.avgLifetimeValue)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <UserPlus className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Churn Rate
              </p>
              <p className="text-2xl font-bold text-accent mt-1">
                {(displayStats.churnRate * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-brand-100 overflow-x-auto">
        {["all", "active", "inactive", "new", "vip"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as FilterTab)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition border-b-2 whitespace-nowrap",
              activeTab === tab
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-muted-foreground hover:text-accent"
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wider text-muted-foreground bg-brand-50/30">
                <th className="px-6 py-4 font-semibold">
                  <SortHeader label="Name" column="name" />
                </th>
                <th className="px-6 py-4 font-semibold">
                  <SortHeader label="Email" column="email" />
                </th>
                <th className="px-6 py-4 font-semibold">Phone</th>
                <th className="px-6 py-4 font-semibold">City</th>
                <th className="px-6 py-4 font-semibold text-right">
                  <SortHeader label="Jobs" column="totalJobs" />
                </th>
                <th className="px-6 py-4 font-semibold text-right">
                  <SortHeader label="Total Spent" column="totalSpent" />
                </th>
                <th className="px-6 py-4 font-semibold">
                  <SortHeader label="Last Service" column="lastService" />
                </th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-12 text-center text-muted-foreground"
                  >
                    {searchQuery
                      ? "No customers match your search"
                      : "No customers found"}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const badge = getStatusBadge(customer);
                  return (
                    <tr
                      key={customer.id}
                      className="border-b border-brand-50 hover:bg-brand-50/50 transition cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/admin/customers/${customer.id}`
                        )
                      }
                    >
                      <td className="px-6 py-4 font-medium text-accent">
                        {customer.firstName} {customer.lastName}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {customer.email}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {customer.phone ? (
                          <a
                            href={`tel:${customer.phone}`}
                            className="text-brand-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {customer.phone}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {customer.city || "—"}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-accent">
                        {customer.totalJobs}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-accent">
                        {formatCurrency(customer.totalSpent)}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {customer.lastService
                          ? new Date(
                              customer.lastService
                            ).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            badge.color
                          )}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td
                        className="px-6 py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="relative">
                          <button
                            onClick={() =>
                              setActionMenuOpen(
                                actionMenuOpen === customer.id
                                  ? null
                                  : customer.id
                              )
                            }
                            className="p-1 hover:bg-brand-100 rounded-lg transition"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {actionMenuOpen === customer.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg border border-brand-100 shadow-lg z-10">
                              <button
                                onClick={() => {
                                  router.push(
                                    `/admin/customers/${customer.id}`
                                  );
                                  setActionMenuOpen(null);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-brand-50 transition flex items-center gap-2 text-sm"
                              >
                                <Eye className="w-4 h-4" />
                                View Profile
                              </button>
                              <button
                                onClick={() => handleEditClick(customer)}
                                className="w-full text-left px-4 py-2 hover:bg-brand-50 transition flex items-center gap-2 text-sm"
                              >
                                <Edit2 className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  window.location.href = `mailto:${customer.email}`;
                                  setActionMenuOpen(null);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-brand-50 transition flex items-center gap-2 text-sm"
                              >
                                <Mail className="w-4 h-4" />
                                Send Email
                              </button>
                              <button
                                onClick={() => {
                                  router.push(
                                    `/admin/jobs/new?customerId=${customer.id}`
                                  );
                                  setActionMenuOpen(null);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-brand-50 transition flex items-center gap-2 text-sm"
                              >
                                <Calendar className="w-4 h-4" />
                                Create Job
                              </button>
                              <div className="border-t border-brand-100">
                                <button
                                  onClick={() => {
                                    setActionMenuOpen(null);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-brand-50 transition flex items-center gap-2 text-sm text-red-600"
                                >
                                  <Ban className="w-4 h-4" />
                                  Block Customer
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-100">
              <h2 className="text-lg font-semibold text-accent">
                {editingCustomer ? "Edit Customer" : "Add New Customer"}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-brand-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-accent mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        firstName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-brand-200 text-sm focus:border-brand-400 focus:outline-none"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-accent mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lastName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-brand-200 text-sm focus:border-brand-400 focus:outline-none"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-accent mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-brand-200 text-sm focus:border-brand-400 focus:outline-none"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-accent mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-brand-200 text-sm focus:border-brand-400 focus:outline-none"
                  placeholder="(555) 000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-accent mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-brand-200 text-sm focus:border-brand-400 focus:outline-none"
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-accent mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-brand-200 text-sm focus:border-brand-400 focus:outline-none"
                    placeholder="New York"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-accent mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-brand-200 text-sm focus:border-brand-400 focus:outline-none"
                    placeholder="NY"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-accent mb-1">
                    Zip
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        postalCode: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-brand-200 text-sm focus:border-brand-400 focus:outline-none"
                    placeholder="10001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-accent mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-brand-200 text-sm focus:border-brand-400 focus:outline-none"
                  placeholder="premium, vip (comma-separated)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-accent mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-brand-200 text-sm focus:border-brand-400 focus:outline-none"
                  placeholder="Add any notes..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-brand-200 text-accent rounded-xl hover:bg-brand-50 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingCustomer ? "Update" : "Add"} Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={showImportModal}
        importType="customer"
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          setShowImportModal(false);
          router.refresh();
        }}
      />
    </div>
  );
}
