"use client";

import { useState, useEffect } from "react";
import { Brush, ShieldCheck, UserCog, Mail, Phone, Loader2, Plus, X, Check, KeyRound, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  meta: string;
  createdAt: string;
  status: "active" | "inactive" | "reset_requested";
  role?: string;
};

type CleanerMember = TeamMember & {
  hourlyRate?: number;
};

type ResetRequest = {
  userId: string;
  name: string;
  email: string;
  role: string;
  requestedAt: string;
};

type TeamManagementProps = {
  initialCleaners: CleanerMember[];
  initialManagers: TeamMember[];
};

export function TeamManagement({ initialCleaners, initialManagers }: TeamManagementProps) {
  const [cleaners, setCleaners] = useState(initialCleaners);
  const [managers, setManagers] = useState(initialManagers);
  const [showCleanerForm, setShowCleanerForm] = useState(false);
  const [showManagerForm, setShowManagerForm] = useState(false);
  const [cleanerLoading, setCleanerLoading] = useState(false);
  const [managerLoading, setManagerLoading] = useState(false);
  const [cleanerMessage, setCleanerMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [managerMessage, setManagerMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password reset state
  const [resetLoading, setResetLoading] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<{ userId: string; type: "success" | "error"; text: string } | null>(null);
  const [resetRequests, setResetRequests] = useState<ResetRequest[]>([]);
  const [approveLoading, setApproveLoading] = useState<string | null>(null);

  // Fetch reset requests on mount
  useEffect(() => {
    fetchResetRequests();
  }, []);

  const fetchResetRequests = async () => {
    try {
      const res = await fetch("/api/admin/reset-password");
      if (res.ok) {
        const data = await res.json();
        setResetRequests(data.requests || []);
      }
    } catch {}
  };

  const handleResetPassword = async (userId: string, userName: string) => {
    if (!confirm(`Reset password for ${userName}? A new temporary password will be emailed to them.`)) return;

    setResetLoading(userId);
    setResetMessage(null);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetMessage({ userId, type: "success", text: `Password reset! Temp: ${data.tempPassword}` });
      } else {
        setResetMessage({ userId, type: "error", text: data.error || "Failed to reset" });
      }
    } catch {
      setResetMessage({ userId, type: "error", text: "Network error" });
    } finally {
      setResetLoading(null);
    }
  };

  const handleApproveReset = async (userId: string, action: "approve" | "deny") => {
    setApproveLoading(userId);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      if (res.ok) {
        setResetRequests((prev) => prev.filter((r) => r.userId !== userId));
      }
    } catch {}
    setApproveLoading(null);
  };

  const handleCleanerSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCleanerLoading(true);
    setCleanerMessage(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const hourlyRate = parseFloat(formData.get("hourlyRate") as string);

    if (!name || !email || !hourlyRate) {
      setCleanerMessage({ type: "error", text: "Please fill in all required fields" });
      setCleanerLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/invite-employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone: phone || undefined, hourlyRate, role: "CLEANER" }),
      });

      if (!response.ok) {
        const error = await response.json();
        setCleanerMessage({ type: "error", text: error.error || "Failed to invite cleaner" });
        return;
      }

      const data = await response.json();
      const newCleaner: CleanerMember = {
        id: data.user.id,
        name: `${data.user.firstName} ${data.user.lastName}`.trim(),
        email: data.user.email,
        phone: phone || undefined,
        hourlyRate: data.cleaner?.hourlyRate,
        meta: "Joined today",
        createdAt: new Date().toLocaleDateString(),
        status: "active",
      };

      setCleaners([newCleaner, ...cleaners]);
      setCleanerMessage({ type: "success", text: "Cleaner invited successfully!" });
      e.currentTarget.reset();
      setTimeout(() => setShowCleanerForm(false), 1500);
    } catch {
      setCleanerMessage({ type: "error", text: "An error occurred. Please try again." });
    } finally {
      setCleanerLoading(false);
    }
  };

  const handleManagerSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setManagerLoading(true);
    setManagerMessage(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;

    if (!name || !email) {
      setManagerMessage({ type: "error", text: "Please fill in required fields" });
      setManagerLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/invite-employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone: phone || undefined, hourlyRate: 0, role: "MANAGER" }),
      });

      if (!response.ok) {
        const error = await response.json();
        setManagerMessage({ type: "error", text: error.error || "Failed to invite manager" });
        return;
      }

      const data = await response.json();
      const newManager: TeamMember = {
        id: data.user.id,
        name: `${data.user.firstName} ${data.user.lastName}`.trim(),
        email: data.user.email,
        phone: phone || undefined,
        meta: "Joined today",
        createdAt: new Date().toLocaleDateString(),
        status: "active",
      };

      setManagers([newManager, ...managers]);
      setManagerMessage({ type: "success", text: "Manager invited successfully!" });
      e.currentTarget.reset();
      setTimeout(() => setShowManagerForm(false), 1500);
    } catch {
      setManagerMessage({ type: "error", text: "An error occurred. Please try again." });
    } finally {
      setManagerLoading(false);
    }
  };

  const ResetButton = ({ userId, userName }: { userId: string; userName: string }) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleResetPassword(userId, userName)}
        disabled={resetLoading === userId}
        className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
        title="Reset password and email new credentials"
      >
        {resetLoading === userId ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <KeyRound className="h-3 w-3" />
        )}
        Reset Password
      </button>
      {resetMessage?.userId === userId && (
        <span className={`text-xs ${resetMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
          {resetMessage.text}
        </span>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Password Reset Requests Banner */}
      {resetRequests.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-amber-800">Password Reset Requests</h2>
                <p className="text-sm text-amber-600">{resetRequests.length} pending request{resetRequests.length > 1 ? "s" : ""}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {resetRequests.map((req) => (
              <div key={req.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-white p-4">
                <div>
                  <p className="text-sm font-semibold text-accent">{req.name}</p>
                  <p className="text-xs text-muted-foreground">{req.email} &middot; {req.role}</p>
                  <p className="text-xs text-amber-600">Requested {new Date(req.requestedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveReset(req.userId, "approve")}
                    disabled={approveLoading === req.userId}
                    className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {approveLoading === req.userId ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                    Approve
                  </button>
                  <button
                    onClick={() => handleApproveReset(req.userId, "deny")}
                    disabled={approveLoading === req.userId}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cleaners Section */}
        <Card className="bg-white">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-accent">
                <Brush className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-accent">Cleaners</h2>
                <p className="text-sm text-muted-foreground">Active cleaners with access to the job marketplace and payouts dashboard.</p>
              </div>
            </div>
            <button
              onClick={() => setShowCleanerForm(!showCleanerForm)}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Invite Cleaner
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            {showCleanerForm && (
              <div className="rounded-2xl border-2 border-brand-100 bg-brand-50/30 p-4 space-y-3">
                <form onSubmit={handleCleanerSubmit} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-accent mb-1">Name *</label>
                    <input type="text" name="name" placeholder="First and Last Name" className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" disabled={cleanerLoading} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-accent mb-1">Email *</label>
                    <input type="email" name="email" placeholder="email@example.com" className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" disabled={cleanerLoading} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-accent mb-1">Phone</label>
                    <input type="tel" name="phone" placeholder="(555) 123-4567" className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" disabled={cleanerLoading} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-accent mb-1">Hourly Rate *</label>
                    <input type="number" name="hourlyRate" placeholder="20.00" step="0.01" min="0" className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" disabled={cleanerLoading} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="submit" disabled={cleanerLoading} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors">
                      {cleanerLoading ? (<><Loader2 className="h-4 w-4 animate-spin" />Sending...</>) : "Send Invite"}
                    </button>
                    <button type="button" onClick={() => { setShowCleanerForm(false); setCleanerMessage(null); }} className="rounded-lg border border-brand-100 bg-white px-4 py-2 text-sm font-medium text-accent hover:bg-brand-50 transition-colors">Cancel</button>
                  </div>
                </form>
                {cleanerMessage && (
                  <div className={`rounded-lg p-3 flex items-center gap-2 text-sm ${cleanerMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    {cleanerMessage.type === "success" ? <Check className="h-4 w-4 flex-shrink-0" /> : <X className="h-4 w-4 flex-shrink-0" />}
                    {cleanerMessage.text}
                  </div>
                )}
              </div>
            )}

            {cleaners.length === 0 ? (
              <div className="rounded-2xl border border-brand-100 bg-white px-4 py-12 text-center text-sm text-muted-foreground">No cleaners yet. Add your first cleaner above.</div>
            ) : (
              <div className="space-y-3">
                {cleaners.map((cleaner) => (
                  <div key={cleaner.id} className="rounded-3xl border border-brand-100 bg-brand-50/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-accent">{cleaner.name}</p>
                        <span className={`text-xs font-medium rounded-full px-2 py-1 ${cleaner.status === "active" ? "bg-green-100 text-green-700" : cleaner.status === "reset_requested" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}`}>
                          {cleaner.status === "reset_requested" ? "Reset Requested" : cleaner.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{cleaner.createdAt}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{cleaner.email}</span>
                      <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{cleaner.phone ?? "—"}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{cleaner.meta}</p>
                    <div className="mt-3 border-t border-brand-100 pt-3">
                      <ResetButton userId={cleaner.id} userName={cleaner.name} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* HQ Managers Section */}
        <Card className="bg-white">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-accent">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-accent">Managers</h2>
                <p className="text-sm text-muted-foreground">Territory managers with access to their crews, customers, schedule, and payroll.</p>
              </div>
            </div>
            <button
              onClick={() => setShowManagerForm(!showManagerForm)}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Add Manager
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            {showManagerForm && (
              <div className="rounded-2xl border-2 border-brand-100 bg-brand-50/30 p-4 space-y-3">
                <form onSubmit={handleManagerSubmit} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-accent mb-1">Name *</label>
                    <input type="text" name="name" placeholder="First and Last Name" className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" disabled={managerLoading} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-accent mb-1">Email *</label>
                    <input type="email" name="email" placeholder="email@example.com" className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" disabled={managerLoading} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-accent mb-1">Phone</label>
                    <input type="tel" name="phone" placeholder="(555) 123-4567" className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" disabled={managerLoading} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="submit" disabled={managerLoading} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors">
                      {managerLoading ? (<><Loader2 className="h-4 w-4 animate-spin" />Sending...</>) : "Send Invite"}
                    </button>
                    <button type="button" onClick={() => { setShowManagerForm(false); setManagerMessage(null); }} className="rounded-lg border border-brand-100 bg-white px-4 py-2 text-sm font-medium text-accent hover:bg-brand-50 transition-colors">Cancel</button>
                  </div>
                </form>
                {managerMessage && (
                  <div className={`rounded-lg p-3 flex items-center gap-2 text-sm ${managerMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    {managerMessage.type === "success" ? <Check className="h-4 w-4 flex-shrink-0" /> : <X className="h-4 w-4 flex-shrink-0" />}
                    {managerMessage.text}
                  </div>
                )}
              </div>
            )}

            {managers.length === 0 ? (
              <div className="rounded-2xl border border-brand-100 bg-white px-4 py-12 text-center text-sm text-muted-foreground">No HQ managers yet.</div>
            ) : (
              <div className="space-y-3">
                {managers.map((manager) => (
                  <div key={manager.id} className="rounded-3xl border border-brand-100 bg-brand-50/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-accent">{manager.name}</p>
                        <span className={`text-xs font-medium rounded-full px-2 py-1 ${manager.status === "active" ? "bg-green-100 text-green-700" : manager.status === "reset_requested" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}`}>
                          {manager.status === "reset_requested" ? "Reset Requested" : manager.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{manager.createdAt}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{manager.email}</span>
                      <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{manager.phone ?? "—"}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{manager.meta}</p>
                    <div className="mt-3 border-t border-brand-100 pt-3">
                      <ResetButton userId={manager.id} userName={manager.name} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
