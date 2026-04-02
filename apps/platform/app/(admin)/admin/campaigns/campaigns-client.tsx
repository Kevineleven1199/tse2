"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Mail,
  Plus,
  Send,
  Eye,
  Copy,
  Trash2,
  Edit2,
  X,
  Users,
  BarChart3,
  MousePointerClick,
  Clock,
  FileText,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertTriangle,
  Inbox,
  Download,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/src/lib/utils";

interface EmailCampaign {
  id: string;
  tenantId: string;
  name: string;
  subject: string;
  htmlContent: string;
  audienceType: string;
  audienceFilter?: Record<string, unknown>;
  status: "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "FAILED";
  scheduledAt: string | null;
  sentAt: string | null;
  totalRecipients: number;
  openCount: number;
  clickCount: number;
  createdAt: string;
  updatedAt: string;
  _count?: { recipients: number };
}

interface CampaignTemplate {
  id: string;
  name: string;
  subject: string;
  category: string;
  targetIndustries: string[];
  description: string;
  htmlContent: string;
}

interface CampaignStats {
  total: number;
  drafts: number;
  sent: number;
  scheduled: number;
}

interface AudienceOption {
  value: string;
  label: string;
  description: string;
}

const AUDIENCE_OPTIONS: AudienceOption[] = [
  { value: "all_customers", label: "All Customers", description: "Everyone in your database" },
  { value: "recent_90", label: "Recent Customers (90 days)", description: "Active in the last 90 days" },
  { value: "inactive_90", label: "Inactive (90+ days)", description: "No activity for 90+ days" },
  { value: "crm_leads", label: "CRM Leads", description: "Prospects not yet converted" },
  { value: "custom", label: "Custom Filter", description: "Build your own segment" },
];

const TEMPLATE_VARIABLES = [
  { tag: "{{name}}", example: "John Smith" },
  { tag: "{{firstName}}", example: "John" },
  { tag: "{{lastName}}", example: "Smith" },
  { tag: "{{email}}", example: "john@example.com" },
  { tag: "{{city}}", example: "San Francisco" },
  { tag: "{{company}}", example: "Acme Corp" },
];

interface FormData {
  name: string;
  subject: string;
  htmlContent: string;
  audienceType: string;
}

interface CampaignsClientProps {
  initialCampaigns: EmailCampaign[];
  stats: CampaignStats;
}

export default function CampaignsClient({
  initialCampaigns,
  stats,
}: CampaignsClientProps) {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>(initialCampaigns);
  const [currentStats, setCurrentStats] = useState<CampaignStats>(stats);
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);
  const [showSendConfirm, setShowSendConfirm] = useState<string | null>(null);
  const [estimatedCount, setEstimatedCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    subject: "",
    htmlContent: "",
    audienceType: "all_customers",
  });

  // Load templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await fetch("/api/admin/campaigns/templates");
        const data = await res.json();
        setTemplates(data.templates || []);
      } catch (err) {
        console.error("Failed to load templates:", err);
      }
    };
    loadTemplates();
  }, []);

  // Estimate recipient count when audience type changes
  useEffect(() => {
    if (formData.audienceType && formData.audienceType !== "custom") {
      estimateRecipientCount();
    }
  }, [formData.audienceType]);

  const estimateRecipientCount = async () => {
    setCountLoading(true);
    try {
      const res = await fetch("/api/admin/campaigns/estimate-recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audienceType: formData.audienceType }),
      });
      const data = await res.json();
      setEstimatedCount(data.count || 0);
    } catch (err) {
      console.error("Failed to estimate recipients:", err);
      setEstimatedCount(0);
    } finally {
      setCountLoading(false);
    }
  };

  const handleNextStep = () => {
    if (modalStep === 1) {
      if (!formData.name.trim() || !formData.subject.trim()) {
        setError("Campaign name and subject are required");
        return;
      }
    } else if (modalStep === 2) {
      if (!formData.audienceType) {
        setError("Please select an audience");
        return;
      }
    } else if (modalStep === 3) {
      if (!formData.htmlContent.trim()) {
        setError("Email content is required");
        return;
      }
    }
    setError(null);
    setModalStep(modalStep + 1);
  };

  const handlePreviousStep = () => {
    setError(null);
    setModalStep(modalStep - 1);
  };

  const handlePreview = () => {
    setPreviewContent(formData.htmlContent);
    setShowPreview(true);
  };

  const handleSaveAsDraft = async () => {
    if (!formData.name.trim() || !formData.subject.trim() || !formData.htmlContent.trim()) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const endpoint = editingCampaign
        ? `/api/admin/campaigns/${editingCampaign.id}`
        : "/api/admin/campaigns";
      const method = editingCampaign ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, status: "DRAFT" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save campaign");
      }

      const result = await res.json();

      if (editingCampaign) {
        setCampaigns(campaigns.map(c => c.id === result.id ? result : c));
        setSuccess("Campaign updated");
      } else {
        setCampaigns([result, ...campaigns]);
        setSuccess("Campaign saved as draft");
      }

      resetForm();
      setTimeout(() => {
        setSuccess(null);
        setShowModal(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save campaign");
    } finally {
      setLoading(false);
    }
  };

  const handleSendNow = async () => {
    if (!formData.name.trim() || !formData.subject.trim() || !formData.htmlContent.trim()) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let campaignId = editingCampaign?.id;

      // Create campaign if new
      if (!campaignId) {
        const createRes = await fetch("/api/admin/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, status: "DRAFT" }),
        });

        if (!createRes.ok) {
          const data = await createRes.json();
          throw new Error(data.error || "Failed to create campaign");
        }

        const created = await createRes.json();
        campaignId = created.id;
      }

      // Send campaign
      const sendRes = await fetch(`/api/admin/campaigns/${campaignId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!sendRes.ok) {
        const data = await sendRes.json();
        throw new Error(data.error || "Failed to send campaign");
      }

      const sent = await sendRes.json();

      // Refresh campaigns list
      const listRes = await fetch("/api/admin/campaigns?limit=50");
      const list = await listRes.json();
      setCampaigns(list.campaigns || list);

      setSuccess(`Campaign sent to ${sent.sentCount || 0} recipients`);
      resetForm();
      setTimeout(() => {
        setSuccess(null);
        setShowModal(false);
        setShowSendConfirm(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send campaign");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this campaign?")) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete campaign");
      }

      setCampaigns(campaigns.filter(c => c.id !== id));
      setSuccess("Campaign deleted");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete campaign");
    } finally {
      setLoading(false);
    }
  };

  const handleEditCampaign = (campaign: EmailCampaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      subject: campaign.subject,
      htmlContent: campaign.htmlContent,
      audienceType: campaign.audienceType,
    });
    setModalStep(1);
    setShowModal(true);
  };

  const handleDuplicateCampaign = (campaign: EmailCampaign) => {
    setEditingCampaign(null);
    setFormData({
      name: `${campaign.name} (Copy)`,
      subject: campaign.subject,
      htmlContent: campaign.htmlContent,
      audienceType: campaign.audienceType,
    });
    setModalStep(1);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      subject: "",
      htmlContent: "",
      audienceType: "all_customers",
    });
    setModalStep(1);
    setEditingCampaign(null);
    setShowPreview(false);
    setPreviewContent("");
    setShowSendConfirm(null);
    setError(null);
    setEstimatedCount(null);
  };

  const closeModal = () => {
    resetForm();
    setShowModal(false);
  };

  const insertVariable = (variable: string) => {
    const textarea = document.querySelector("textarea[id='html-content']") as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent =
        formData.htmlContent.substring(0, start) +
        variable +
        formData.htmlContent.substring(end);
      setFormData({ ...formData, htmlContent: newContent });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: "bg-gray-100 text-gray-800 border-gray-200",
      SCHEDULED: "bg-blue-100 text-blue-800 border-blue-200",
      SENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
      SENT: "bg-green-100 text-green-800 border-green-200",
      FAILED: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[status] || colors.DRAFT;
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      DRAFT: <FileText className="w-4 h-4" />,
      SCHEDULED: <Clock className="w-4 h-4" />,
      SENDING: <Send className="w-4 h-4" />,
      SENT: <Check className="w-4 h-4" />,
      FAILED: <AlertTriangle className="w-4 h-4" />,
    };
    return icons[status] || icons.DRAFT;
  };

  const openRate = (campaign: EmailCampaign) => {
    if (campaign.totalRecipients === 0) return 0;
    return Math.round((campaign.openCount / campaign.totalRecipients) * 100);
  };

  const clickRate = (campaign: EmailCampaign) => {
    if (campaign.totalRecipients === 0) return 0;
    return Math.round((campaign.clickCount / campaign.totalRecipients) * 100);
  };

  return (
    <div className="min-h-screen bg-brand-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              MARKETING
            </p>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">Email Campaigns</h1>
            <p className="text-sm text-gray-600 mt-2">
              Create, send, and track email campaigns to your customers
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-semibold transition"
          >
            <Plus className="w-5 h-5" />
            New Campaign
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Total Campaigns", value: currentStats.total, icon: Mail, color: "brand" },
            { label: "Sent", value: currentStats.sent, icon: Send, color: "green" },
            { label: "Drafts", value: currentStats.drafts, icon: FileText, color: "gray" },
            { label: "Scheduled", value: currentStats.scheduled, icon: Clock, color: "blue" },
          ].map((stat) => {
            const Icon = stat.icon;
            const colorClass = {
              brand: "bg-brand-50 border-brand-100",
              green: "bg-green-50 border-green-100",
              gray: "bg-gray-50 border-gray-100",
              blue: "bg-blue-50 border-blue-100",
            }[stat.color];

            return (
              <div
                key={stat.label}
                className={`rounded-2xl border ${colorClass} p-6`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                  <Icon className="w-8 h-8 text-gray-400" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-900">{success}</p>
            </div>
          </div>
        )}

        {/* Campaign List */}
        <div className="rounded-2xl border border-brand-100 bg-white overflow-hidden shadow-sm">
          {campaigns.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No campaigns yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Create your first email campaign to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-brand-50 border-b border-brand-100">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Campaign
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Recipients
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Open Rate
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Click Rate
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Created
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-100">
                  {campaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className="hover:bg-brand-50/50 transition"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {campaign.name}
                          </p>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                            {campaign.subject}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className={cn(
                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border",
                            getStatusColor(campaign.status)
                          )}
                        >
                          {getStatusIcon(campaign.status)}
                          {campaign.status}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                          <Users className="w-4 h-4 text-gray-400" />
                          {campaign.totalRecipients}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm">
                          <div className="flex-1">
                            <div className="w-12 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand-600 rounded-full"
                                style={{
                                  width: `${Math.min(openRate(campaign), 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                          <span className="font-semibold text-gray-700 w-8 text-right">
                            {openRate(campaign)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm">
                          <div className="flex-1">
                            <div className="w-12 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{
                                  width: `${Math.min(clickRate(campaign), 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                          <span className="font-semibold text-gray-700 w-8 text-right">
                            {clickRate(campaign)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {new Date(campaign.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {campaign.status === "DRAFT" && (
                            <>
                              <button
                                onClick={() => handleEditCampaign(campaign)}
                                className="p-2 hover:bg-brand-100 rounded-lg transition text-gray-600"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setShowSendConfirm(campaign.id);
                                  setEstimatedCount(campaign.totalRecipients);
                                }}
                                className="p-2 hover:bg-green-100 rounded-lg transition text-green-600"
                                title="Send"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {campaign.status === "SENT" && (
                            <button
                              onClick={() => handleDuplicateCampaign(campaign)}
                              className="p-2 hover:bg-blue-100 rounded-lg transition text-blue-600"
                              title="Duplicate"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteCampaign(campaign.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-brand-100 px-8 py-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingCampaign ? "Edit Campaign" : "Create Campaign"}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Step {modalStep} of 4
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="px-8 py-4 flex gap-2">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={cn(
                    "h-2 rounded-full flex-1 transition",
                    step <= modalStep
                      ? "bg-brand-600"
                      : "bg-gray-200"
                  )}
                />
              ))}
            </div>

            {/* Modal Content */}
            <div className="px-8 py-6 space-y-6">
              {/* Step 1: Campaign Setup */}
              {modalStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Campaign Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., Spring Promotion 2026"
                      className="w-full px-4 py-3 rounded-xl border border-brand-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Subject Line
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) =>
                        setFormData({ ...formData, subject: e.target.value })
                      }
                      placeholder="e.g., Special offer for {{firstName}}!"
                      className="w-full px-4 py-3 rounded-xl border border-brand-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                    />
                    <p className="text-xs text-gray-600 mt-2">
                      Tip: Use personalization variables like {"{firstName}"}, {"{city}"}, {"{company}"} to increase engagement
                    </p>
                  </div>
                </div>
              )}

              {/* Step 2: Audience Selection */}
              {modalStep === 2 && (
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Select your audience
                    </h3>
                    <div className="space-y-2">
                      {AUDIENCE_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={cn(
                            "flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition",
                            formData.audienceType === option.value
                              ? "border-brand-600 bg-brand-50"
                              : "border-brand-100 hover:border-brand-200"
                          )}
                        >
                          <input
                            type="radio"
                            name="audience"
                            value={option.value}
                            checked={formData.audienceType === option.value}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                audienceType: e.target.value,
                              })
                            }
                            className="mt-1 w-5 h-5 accent-brand-600"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">
                              {option.label}
                            </p>
                            <p className="text-sm text-gray-600 mt-0.5">
                              {option.description}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {estimatedCount !== null && (
                    <div className="mt-4 rounded-xl bg-blue-50 border border-blue-200 p-4">
                      <p className="text-sm text-blue-900">
                        <strong>Estimated recipients:</strong>{" "}
                        {countLoading ? (
                          <Loader2 className="w-4 h-4 inline animate-spin" />
                        ) : (
                          estimatedCount.toLocaleString()
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Content */}
              {modalStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Email Content (HTML)
                    </label>
                    <textarea
                      id="html-content"
                      value={formData.htmlContent}
                      onChange={(e) =>
                        setFormData({ ...formData, htmlContent: e.target.value })
                      }
                      placeholder="Paste your HTML email content here..."
                      className="w-full px-4 py-3 rounded-xl border border-brand-100 focus:outline-none focus:ring-2 focus:ring-brand-600 font-mono text-sm h-64"
                    />
                    <p className="text-xs text-gray-600 mt-2">
                      Pro tip: Click below to insert personalization variables
                    </p>
                  </div>

                  {/* Template Variables */}
                  <div>
                    <p className="text-xs font-semibold text-gray-900 mb-2">
                      Insert Variables
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {TEMPLATE_VARIABLES.map((variable) => (
                        <button
                          key={variable.tag}
                          onClick={() => insertVariable(variable.tag)}
                          className="px-3 py-2 text-xs bg-gray-50 hover:bg-brand-50 border border-gray-200 rounded-lg transition font-mono"
                        >
                          {variable.tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handlePreview}
                    className="flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    Preview Email
                  </button>
                </div>
              )}

              {/* Step 4: Review */}
              {modalStep === 4 && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-gray-50 p-4 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase">
                        Campaign Name
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {formData.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase">
                        Subject Line
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {formData.subject}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase">
                        Audience
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {AUDIENCE_OPTIONS.find(
                          (a) => a.value === formData.audienceType
                        )?.label || formData.audienceType}
                      </p>
                      {estimatedCount && (
                        <p className="text-xs text-gray-600 mt-1">
                          ~{estimatedCount.toLocaleString()} recipients
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase">
                        Content Preview
                      </p>
                      <div className="text-xs text-gray-600 mt-1 line-clamp-2 font-mono">
                        {formData.htmlContent.substring(0, 100)}...
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                    <p className="text-xs text-amber-900">
                      <strong>Ready to send?</strong> This campaign will be sent to all users in your selected audience. Make sure everything looks correct before proceeding.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-brand-100 px-8 py-4 flex justify-between gap-3">
              {modalStep > 1 && (
                <button
                  onClick={handlePreviousStep}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-brand-200 text-brand-600 hover:bg-brand-50 font-semibold transition disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}

              <div className="flex-1" />

              {modalStep < 4 && (
                <button
                  onClick={handleNextStep}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {modalStep === 4 && (
                <>
                  <button
                    onClick={handleSaveAsDraft}
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold transition disabled:opacity-50"
                  >
                    Save as Draft
                  </button>
                  <button
                    onClick={() => setShowSendConfirm("confirmed")}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Send Now
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Send Confirmation Dialog */}
      {showSendConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center">
              Confirm Send
            </h3>
            <p className="text-sm text-gray-600 text-center mt-3">
              You're about to send "{formData.name}" to approximately{" "}
              <strong>{estimatedCount?.toLocaleString()}</strong> recipients. This
              action cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSendConfirm(null)}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendNow}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Panel */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-brand-100 px-8 py-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Email Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8">
              <div
                className="bg-gray-50 rounded-xl border border-gray-200 p-8 font-serif text-sm"
                dangerouslySetInnerHTML={{ __html: previewContent }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
