"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Tag,
  FileText,
  MessageSquare,
  Clock,
  Activity,
  Plus,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { cn } from "@/src/lib/utils";
import type { CrmLead, ServiceRequest, TodoItem, CallTranscript } from "@prisma/client";

interface ContactDetailProps {
  lead: CrmLead;
  activity: {
    serviceRequests: ServiceRequest[];
    todos: TodoItem[];
    callTranscripts: CallTranscript[];
  };
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-purple-100 text-purple-800",
  qualified: "bg-green-100 text-green-800",
  won: "bg-emerald-100 text-emerald-800",
  lost: "bg-red-100 text-red-800",
};

export const ContactDetail = ({ lead, activity }: ContactDetailProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    businessName: lead.businessName,
    contactName: lead.contactName || "",
    contactEmail: lead.contactEmail || "",
    contactPhone: lead.contactPhone || "",
    address: lead.address || "",
    city: lead.city || "",
    state: lead.state || "",
    postalCode: lead.postalCode || "",
    notes: lead.notes || "",
    tags: (lead.tags || []).join(", "),
    status: lead.status,
  });

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/admin/contacts/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });

      if (!response.ok) throw new Error("Failed to save contact");

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save contact");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTodo = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Follow up with ${formData.businessName}`,
          relatedId: lead.id,
          relatedType: "crm_lead",
          priority: 2,
        }),
      });

      if (!response.ok) throw new Error("Failed to create todo");

      // Refresh page to show new todo
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create todo");
    } finally {
      setLoading(false);
    }
  };

  const allActivity = [
    ...activity.serviceRequests.map((sr) => ({
      type: "service_request" as const,
      date: new Date(sr.createdAt),
      title: `Service request for ${sr.serviceType}`,
      data: sr,
    })),
    ...activity.todos.map((todo) => ({
      type: "todo" as const,
      date: new Date(todo.createdAt),
      title: todo.title,
      data: todo,
    })),
    ...activity.callTranscripts.map((ct) => ({
      type: "call" as const,
      date: new Date(ct.createdAt),
      title: `Call transcript`,
      data: ct,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-accent">
            {formData.businessName}
          </h1>
          <p className="text-sm text-gray-600 mt-1">Contact Management</p>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-red-800">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-green-800">Contact saved successfully</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-accent">Basic Information</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Business Name *
                  </label>
                  <Input
                    value={formData.businessName}
                    onChange={(e) =>
                      setFormData({ ...formData, businessName: e.target.value })
                    }
                    required
                    className="text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Contact Name
                  </label>
                  <Input
                    value={formData.contactName}
                    onChange={(e) =>
                      setFormData({ ...formData, contactName: e.target.value })
                    }
                    className="text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, contactEmail: e.target.value })
                    }
                    className="text-base"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Phone
                  </label>
                  <Input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, contactPhone: e.target.value })
                    }
                    className="text-base"
                    autoComplete="tel"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Address
                </label>
                <Input
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="text-base"
                  autoComplete="street-address"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    City
                  </label>
                  <Input
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="text-base"
                    autoComplete="address-level2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    State
                  </label>
                  <Input
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    className="text-base"
                    autoComplete="address-level1"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Postal Code
                  </label>
                  <Input
                    value={formData.postalCode}
                    onChange={(e) =>
                      setFormData({ ...formData, postalCode: e.target.value })
                    }
                    className="text-base"
                    autoComplete="postal-code"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status & Tags */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-accent">Status & Tags</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900",
                    "focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent",
                    "text-sm"
                  )}
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <Input
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  placeholder="high-priority, vip, enterprise"
                  className="text-base"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-accent">Notes</h2>
            </CardHeader>
            <CardContent>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Add internal notes about this contact..."
                className={cn(
                  "w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900",
                  "focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent",
                  "text-base min-h-[120px] resize-none"
                )}
              />
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-accent">Activity Timeline</h2>
            </CardHeader>
            <CardContent>
              {allActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No activity yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allActivity.map((item, idx) => (
                    <div
                      key={`${item.type}-${idx}`}
                      className="flex gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0"
                    >
                      <div className="flex-shrink-0 pt-1">
                        {item.type === "service_request" && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                        )}
                        {item.type === "todo" && (
                          <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5" />
                        )}
                        {item.type === "call" && (
                          <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {item.date.toLocaleDateString()} at{" "}
                          {item.date.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 flex flex-col lg:static fixed bottom-0 right-0 left-0 lg:left-auto">
          {/* Quick Info Card */}
          <Card className="hidden lg:block">
            <CardHeader>
              <h3 className="text-lg font-semibold text-accent">Quick Info</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.contactPhone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                  <a
                    href={`tel:${formData.contactPhone}`}
                    className="text-sm text-accent hover:underline break-all"
                  >
                    {formData.contactPhone}
                  </a>
                </div>
              )}
              {formData.contactEmail && (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                  <a
                    href={`mailto:${formData.contactEmail}`}
                    className="text-sm text-accent hover:underline break-all"
                  >
                    {formData.contactEmail}
                  </a>
                </div>
              )}
              {formData.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-gray-700">
                    {[
                      formData.address,
                      formData.city,
                      formData.state,
                      formData.postalCode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </div>
              )}
              {lead.lastContactedAt && (
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-gray-700">
                    <p className="font-medium">Last Contacted</p>
                    <p className="text-xs text-gray-500">
                      {new Date(lead.lastContactedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="hidden lg:block">
            <CardHeader>
              <h3 className="text-lg font-semibold text-accent">Quick Actions</h3>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={handleCreateTodo}
                disabled={loading}
                className="w-full"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                {loading ? "Creating..." : "Create Todo"}
              </Button>
              <Button
                disabled={true}
                className="w-full"
                variant="outline"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Send SMS
              </Button>
              <Button className="w-full" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Create Quote
              </Button>
            </CardContent>
          </Card>

          {/* Save Button - Sticky on mobile */}
          <div className="lg:static sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:border-0 lg:bg-transparent lg:p-0">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-accent text-white hover:bg-accent/90"
              size="lg"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
