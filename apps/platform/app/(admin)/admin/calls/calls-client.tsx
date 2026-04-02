"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneMissed,
  Clock,
  Calendar,
  User,
  BarChart3,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
} from "lucide-react";
import { cn } from "@/src/lib/utils";

type CrmLead = {
  id: string;
  businessName: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  city: string | null;
  industry: string | null;
  sqft: number | null;
  status: string;
  priority: number;
  score: number;
  callCount: number;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  notes: string | null;
  aiInsights: string | null;
  tags: string[];
  metadata: any;
};

type TodoItem = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: "todo" | "in_progress" | "completed";
  category: string;
  relatedLeadId: string | null;
  assignedTo: string | null;
  createdAt: string;
};

type CallStats = {
  callsToday: number;
  callsThisWeek: number;
  conversionRate: number;
  avgCallDuration: string;
};

const CALL_OUTCOMES = [
  { value: "answered", label: "Answered", icon: PhoneCall, color: "text-green-600" },
  { value: "voicemail", label: "Voicemail", icon: Phone, color: "text-blue-600" },
  { value: "no_answer", label: "No Answer", icon: PhoneMissed, color: "text-gray-600" },
  { value: "interested", label: "Interested", icon: CheckCircle, color: "text-emerald-600" },
  { value: "appointment_set", label: "Appointment Set", icon: Calendar, color: "text-purple-600" },
  { value: "not_interested", label: "Not Interested", icon: XCircle, color: "text-red-600" },
  { value: "wrong_number", label: "Wrong Number", icon: AlertCircle, color: "text-orange-600" },
];

const FOLLOW_UP_DAYS: Record<string, number> = {
  answered: 3,
  voicemail: 2,
  no_answer: 1,
  interested: 1,
  appointment_set: 7,
  not_interested: 0,
  wrong_number: 0,
};

interface CallsClientProps {
  userId: string;
  userName: string;
  role: string;
  initialLeads: CrmLead[];
  initialFollowUps: TodoItem[];
  initialStats: CallStats;
}

export default function CallsClient({
  userId,
  userName,
  role,
  initialLeads,
  initialFollowUps,
  initialStats,
}: CallsClientProps) {
  const [activeTab, setActiveTab] = useState<"queue" | "log" | "followups" | "performance">("queue");
  const [callQueue, setCallQueue] = useState<CrmLead[]>(initialLeads);
  const [followUps, setFollowUps] = useState<TodoItem[]>(initialFollowUps);
  const [stats, setStats] = useState<CallStats>(initialStats);
  const [loading, setLoading] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState<string | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState("");
  const [callNotes, setCallNotes] = useState("");
  const [followUpDays, setFollowUpDays] = useState(3);
  const [dateFilter, setDateFilter] = useState<{ from: string; to: string } | null>(null);
  const [outcomeFilter, setOutcomeFilter] = useState<string>("");
  const [callLog, setCallLog] = useState<any[]>([]);
  const [loadingLog, setLoadingLog] = useState(false);

  // Fetch call queue from API
  const fetchCallQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/call-lists?mode=smart&limit=50");
      const data = await res.json();
      setCallQueue(data.callList || []);
      setStats((prev) => ({ ...prev, ...data.stats }));
    } catch (error) {
      console.error("Failed to fetch call queue:", error);
    }
    setLoading(false);
  }, []);

  // Fetch call log (parse from lead notes containing call timestamps)
  const fetchCallLog = useCallback(async () => {
    setLoadingLog(true);
    try {
      const res = await fetch("/api/crm/call-lists?mode=all&limit=100");
      const data = await res.json();

      // Parse call entries from notes
      const logEntries: any[] = [];
      const leads = data.callList || [];

      leads.forEach((lead: CrmLead) => {
        if (lead.notes) {
          // Extract call entries from notes (format: [Date] Call: outcome — notes)
          const callMatches = lead.notes.match(/\[(.+?)\] Call: (\w+) — (.+?)(?=\[|$)/g);
          if (callMatches) {
            callMatches.forEach((match) => {
              const detailMatch = match.match(/\[(.+?)\] Call: (\w+) — (.+)/);
              if (detailMatch) {
                logEntries.push({
                  id: `${lead.id}-${detailMatch[1]}`,
                  leadId: lead.id,
                  leadName: lead.businessName,
                  phone: lead.contactPhone,
                  dateTime: detailMatch[1],
                  outcome: detailMatch[2],
                  notes: detailMatch[3],
                  agent: lead.metadata?.agentName || "Unknown",
                  duration: "N/A",
                });
              }
            });
          }
        }
      });

      setCallLog(logEntries.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()));
    } catch (error) {
      console.error("Failed to fetch call log:", error);
    }
    setLoadingLog(false);
  }, []);

  // Update follow-ups on mount
  useEffect(() => {
    if (activeTab === "queue") {
      fetchCallQueue();
    } else if (activeTab === "log") {
      fetchCallLog();
    }
  }, [activeTab, fetchCallQueue, fetchCallLog]);

  // Log a call outcome
  const handleLogCall = async (leadId: string) => {
    if (!selectedOutcome || !leadId) return;

    try {
      const res = await fetch("/api/crm/call-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "log_call",
          leadId,
          outcome: selectedOutcome,
          notes: callNotes,
          nextFollowUpDays: followUpDays,
        }),
      });

      if (res.ok) {
        // Reset form
        setShowOutcomeModal(null);
        setSelectedOutcome("");
        setCallNotes("");
        setFollowUpDays(3);
        // Refresh queue
        fetchCallQueue();
      }
    } catch (error) {
      console.error("Failed to log call:", error);
    }
  };

  // Filter call log
  const filteredCallLog = useMemo(() => {
    return callLog.filter((entry) => {
      if (outcomeFilter && entry.outcome !== outcomeFilter) return false;
      if (dateFilter) {
        const entryDate = new Date(entry.dateTime);
        const fromDate = new Date(dateFilter.from);
        const toDate = new Date(dateFilter.to);
        if (entryDate < fromDate || entryDate > toDate) return false;
      }
      return true;
    });
  }, [callLog, outcomeFilter, dateFilter]);

  // Calculate overdue follow-ups
  const overdueFollowUps = useMemo(() => {
    const now = new Date();
    return followUps.filter((item) => item.dueDate && new Date(item.dueDate) < now);
  }, [followUps]);

  const todayFollowUps = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return followUps.filter((item) => item.dueDate && new Date(item.dueDate) >= today && new Date(item.dueDate) < tomorrow);
  }, [followUps]);

  const upcomingFollowUps = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    return followUps.filter(
      (item) => item.dueDate && new Date(item.dueDate) >= today && new Date(item.dueDate) <= weekFromNow && !todayFollowUps.includes(item)
    );
  }, [followUps, todayFollowUps]);

  const priorityLabel = (p: number) => (p === 1 ? "🔥 Hot" : p === 2 ? "🟡 Warm" : "🔵 Cold");
  const priorityColor = (p: number) =>
    p === 1 ? "bg-red-100 text-red-700" : p === 2 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700";

  const statusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-slate-100 text-slate-700";
      case "contacted":
        return "bg-blue-100 text-blue-700";
      case "qualified":
        return "bg-emerald-100 text-emerald-700";
      case "won":
        return "bg-green-100 text-green-700";
      case "lost":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-700 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-teal-200">Call Management</p>
            <h1 className="text-3xl font-bold">Call Center</h1>
            <p className="mt-1 text-sm text-teal-100">Manage calls, follow-ups, and call performance</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Phone className="h-4 w-4" />
            Total Calls Today
          </p>
          <p className="mt-2 text-2xl font-bold text-accent">{stats.callsToday}</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Calls This Week
          </p>
          <p className="mt-2 text-2xl font-bold text-accent">{stats.callsThisWeek}</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            Conversion Rate
          </p>
          <p className="mt-2 text-2xl font-bold text-accent">{stats.conversionRate}%</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Clock className="h-4 w-4" />
            Avg Duration
          </p>
          <p className="mt-2 text-2xl font-bold text-accent">{stats.avgCallDuration}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-brand-200">
        {[
          { id: "queue", label: "Call Queue", icon: Phone },
          { id: "log", label: "Call Log", icon: BarChart3 },
          { id: "followups", label: "Follow-ups", icon: Clock },
          { id: "performance", label: "Performance", icon: TrendingUp },
        ].map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition",
                activeTab === tab.id
                  ? "border-teal-600 text-teal-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <TabIcon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {/* Call Queue Tab */}
        {activeTab === "queue" && (
          <div className="space-y-4">
            {loading ? (
              <div className="rounded-2xl border border-brand-100 bg-white p-8 text-center">
                <p className="text-muted-foreground">Loading call queue...</p>
              </div>
            ) : callQueue.length === 0 ? (
              <div className="rounded-2xl border border-brand-100 bg-white p-8 text-center">
                <PhoneMissed className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-4 font-semibold text-foreground">No calls in queue</p>
                <p className="text-sm text-muted-foreground">All leads are up to date or completed.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {callQueue.map((lead, idx) => (
                  <div
                    key={lead.id}
                    className="flex flex-col gap-3 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{lead.businessName}</h3>
                          {lead.contactName && <p className="text-xs text-muted-foreground">{lead.contactName}</p>}
                          <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {lead.contactPhone}
                          </p>
                          {lead.lastContactedAt && (
                            <p className="text-xs text-muted-foreground">
                              Last contact: {new Date(lead.lastContactedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={cn("rounded-full px-2 py-1 text-xs font-medium", priorityColor(lead.priority))}>
                          {priorityLabel(lead.priority)}
                        </span>
                        <span className={cn("rounded-full px-2 py-1 text-xs font-medium", statusColor(lead.status))}>
                          {lead.status}
                        </span>
                        {lead.score > 0 && (
                          <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-medium text-brand-700">
                            Score: {lead.score}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 sm:flex-col">
                      <a
                        href={`tel:${lead.contactPhone}`}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition sm:flex-none"
                      >
                        <Phone className="h-4 w-4" />
                        Call
                      </a>
                      <button
                        onClick={() => setShowOutcomeModal(lead.id)}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-brand-200 px-4 py-2 text-sm font-semibold text-foreground hover:bg-brand-50 transition sm:flex-none"
                      >
                        <Plus className="h-4 w-4" />
                        Log
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Call Log Tab */}
        {activeTab === "log" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-3 rounded-2xl border border-brand-100 bg-white p-4 sm:flex-row sm:items-center">
              <select
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value)}
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
              >
                <option value="">All Outcomes</option>
                {CALL_OUTCOMES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                onChange={(e) =>
                  setDateFilter((prev) => (prev ? { ...prev, from: e.target.value } : { from: e.target.value, to: "" }))
                }
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
                placeholder="From date"
              />
              <input
                type="date"
                onChange={(e) =>
                  setDateFilter((prev) => (prev ? { ...prev, to: e.target.value } : { from: "", to: e.target.value }))
                }
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
                placeholder="To date"
              />
            </div>

            {/* Call Log Table */}
            {loadingLog ? (
              <div className="rounded-2xl border border-brand-100 bg-white p-8 text-center">
                <p className="text-muted-foreground">Loading call log...</p>
              </div>
            ) : filteredCallLog.length === 0 ? (
              <div className="rounded-2xl border border-brand-100 bg-white p-8 text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-4 font-semibold text-foreground">No calls logged</p>
                <p className="text-sm text-muted-foreground">Start logging calls to see them here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-brand-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-brand-100 bg-brand-50">
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Date/Time</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Lead Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Phone</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Outcome</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Duration</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Notes</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Agent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-100">
                    {filteredCallLog.map((entry) => {
                      const outcomeConfig = CALL_OUTCOMES.find((o) => o.value === entry.outcome);
                      const OutcomeIcon = outcomeConfig?.icon || Phone;
                      return (
                        <tr key={entry.id} className="hover:bg-brand-50">
                          <td className="px-4 py-3 text-muted-foreground">{entry.dateTime}</td>
                          <td className="px-4 py-3 font-medium text-foreground">{entry.leadName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{entry.phone}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <OutcomeIcon className={cn("h-4 w-4", outcomeConfig?.color)} />
                              <span className="text-xs font-medium">{outcomeConfig?.label}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{entry.duration}</td>
                          <td className="max-w-sm px-4 py-3 text-muted-foreground truncate">{entry.notes}</td>
                          <td className="px-4 py-3 text-muted-foreground">{entry.agent}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Follow-ups Tab */}
        {activeTab === "followups" && (
          <div className="space-y-6">
            {/* Overdue */}
            {overdueFollowUps.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-foreground">Overdue Follow-ups</h3>
                  <span className="ml-auto rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                    {overdueFollowUps.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {overdueFollowUps.map((todo) => (
                    <div
                      key={todo.id}
                      className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{todo.title}</h4>
                          {todo.description && <p className="text-sm text-muted-foreground">{todo.description}</p>}
                          {todo.dueDate && (
                            <p className="flex items-center gap-2 text-xs text-red-700">
                              <Calendar className="h-3 w-3" />
                              Due: {new Date(todo.dueDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <button className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 transition">
                          Take Action
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Today */}
            {todayFollowUps.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <h3 className="font-semibold text-foreground">Today's Follow-ups</h3>
                  <span className="ml-auto rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">
                    {todayFollowUps.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {todayFollowUps.map((todo) => (
                    <div
                      key={todo.id}
                      className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{todo.title}</h4>
                          {todo.description && <p className="text-sm text-muted-foreground">{todo.description}</p>}
                          {todo.dueDate && (
                            <p className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Due: {new Date(todo.dueDate).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                        <button className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-700 transition">
                          Take Action
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming (Next 7 Days) */}
            {upcomingFollowUps.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-foreground">Upcoming Follow-ups (Next 7 Days)</h3>
                  <span className="ml-auto rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">
                    {upcomingFollowUps.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {upcomingFollowUps.map((todo) => (
                    <div
                      key={todo.id}
                      className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{todo.title}</h4>
                          {todo.description && <p className="text-sm text-muted-foreground">{todo.description}</p>}
                          {todo.dueDate && (
                            <p className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Due: {new Date(todo.dueDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {overdueFollowUps.length === 0 && todayFollowUps.length === 0 && upcomingFollowUps.length === 0 && (
              <div className="rounded-2xl border border-brand-100 bg-white p-8 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-green-300" />
                <p className="mt-4 font-semibold text-foreground">All caught up!</p>
                <p className="text-sm text-muted-foreground">No follow-ups scheduled.</p>
              </div>
            )}
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === "performance" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground">Total Calls</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{stats.callsThisWeek}</p>
                <p className="text-xs text-muted-foreground">This week</p>
              </div>
              <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground">Connected Rate</p>
                <p className="mt-2 text-3xl font-bold text-foreground">68%</p>
                <p className="text-xs text-emerald-600">↑ 5% from last week</p>
              </div>
              <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground">Appointments Set</p>
                <p className="mt-2 text-3xl font-bold text-foreground">12</p>
                <p className="text-xs text-emerald-600">↑ 3 from last week</p>
              </div>
              <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground">Conversion %</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{stats.conversionRate}%</p>
                <p className="text-xs text-muted-foreground">From qualified</p>
              </div>
            </div>

            <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-foreground">Performance Comparison</h3>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-muted-foreground">This Week</span>
                    <span className="text-foreground">{stats.callsThisWeek} calls</span>
                  </div>
                  <div className="h-2 rounded-full bg-brand-100">
                    <div className="h-full bg-teal-600 rounded-full" style={{ width: "65%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-muted-foreground">Last Week</span>
                    <span className="text-foreground">32 calls</span>
                  </div>
                  <div className="h-2 rounded-full bg-brand-100">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: "32%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Call Outcome Modal */}
      {showOutcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-brand-100 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">Log Call Outcome</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {callQueue.find((l) => l.id === showOutcomeModal)?.businessName}
            </p>

            <div className="mt-6 space-y-4">
              {/* Outcome Selection */}
              <div>
                <label className="text-sm font-semibold text-foreground">Call Outcome</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {CALL_OUTCOMES.map((outcome) => {
                    const Icon = outcome.icon;
                    return (
                      <button
                        key={outcome.value}
                        onClick={() => {
                          setSelectedOutcome(outcome.value);
                          setFollowUpDays(FOLLOW_UP_DAYS[outcome.value] || 3);
                        }}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-xs font-medium transition",
                          selectedOutcome === outcome.value
                            ? "border-teal-600 bg-teal-50 text-foreground"
                            : "border-brand-200 bg-white text-muted-foreground hover:border-brand-300"
                        )}
                      >
                        <Icon className={cn("h-4 w-4", selectedOutcome === outcome.value ? outcome.color : "")} />
                        <span className="text-center flex-1">{outcome.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-semibold text-foreground">Call Notes</label>
                <textarea
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Add notes about this call..."
                  className="mt-2 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  rows={3}
                />
              </div>

              {/* Follow-up Days (only for non-negative outcomes) */}
              {selectedOutcome && FOLLOW_UP_DAYS[selectedOutcome] > 0 && (
                <div>
                  <label className="text-sm font-semibold text-foreground">Follow-up in (days)</label>
                  <input
                    type="number"
                    min={1}
                    value={followUpDays}
                    onChange={(e) => setFollowUpDays(parseInt(e.target.value) || 1)}
                    className="mt-2 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowOutcomeModal(null);
                    setSelectedOutcome("");
                    setCallNotes("");
                    setFollowUpDays(3);
                  }}
                  className="flex-1 rounded-lg border border-brand-200 px-4 py-2 text-sm font-semibold text-foreground hover:bg-brand-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleLogCall(showOutcomeModal)}
                  disabled={!selectedOutcome}
                  className="flex-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Outcome
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
