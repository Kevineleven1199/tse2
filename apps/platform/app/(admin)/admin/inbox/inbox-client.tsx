"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Filter, Send, MessageCircle, Phone, Mail, X, ChevronDown } from "lucide-react";

const CHANNEL_META: Record<string, { label: string; icon: string; color: string }> = {
  SMS: { label: "SMS", icon: "\uD83D\uDCF1", color: "bg-green-100 text-green-700" },
  EMAIL: { label: "Email", icon: "\u2709\uFE0F", color: "bg-blue-100 text-blue-700" },
  WHATSAPP: { label: "WhatsApp", icon: "\uD83D\uDFE2", color: "bg-emerald-100 text-emerald-700" },
  FACEBOOK_MESSENGER: { label: "Facebook", icon: "\uD83D\uDFE6", color: "bg-indigo-100 text-indigo-700" },
  INSTAGRAM_DM: { label: "Instagram", icon: "\uD83D\uDFEA", color: "bg-pink-100 text-pink-700" },
  TWITTER_DM: { label: "X", icon: "\u2B1B", color: "bg-gray-100 text-gray-700" },
  GOOGLE_BUSINESS: { label: "Google", icon: "\uD83D\uDD35", color: "bg-red-100 text-red-700" },
  NEXTDOOR: { label: "Nextdoor", icon: "\uD83C\uDFE1", color: "bg-lime-100 text-lime-700" },
  WEB_FORM: { label: "Website", icon: "\uD83C\uDF10", color: "bg-purple-100 text-purple-700" },
  TELEGRAM: { label: "Telegram", icon: "\u2708\uFE0F", color: "bg-sky-100 text-sky-700" },
};

type Conversation = {
  id: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  channel: string;
  status: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  crmLeadId: string | null;
};

type Message = {
  id: string;
  direction: string;
  channel: string;
  content: string;
  senderName: string | null;
  createdAt: string;
  status: string;
};

export function InboxClient({ userId }: { userId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    const params = new URLSearchParams();
    if (channelFilter !== "all") params.set("channel", channelFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);
    const res = await fetch(`/api/admin/inbox?${params}`);
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations || []);
    }
    setLoading(false);
  }, [channelFilter, statusFilter, search]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Poll every 15 seconds
  useEffect(() => {
    const interval = setInterval(fetchConversations, 15000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const selectConversation = async (id: string) => {
    setSelectedId(id);
    const res = await fetch(`/api/admin/inbox/${id}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages || []);
      // Update local unread count
      setConversations((prev) => prev.map((c) => c.id === id ? { ...c, unreadCount: 0 } : c));
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedId || sending) return;
    setSending(true);
    const res = await fetch(`/api/admin/inbox/${selectedId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: replyText.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      setReplyText("");
      fetchConversations();
    }
    setSending(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/inbox/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchConversations();
  };

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div className="flex h-[calc(100vh-80px)] bg-white rounded-2xl border border-brand-100 overflow-hidden">
      {/* Left panel — conversation list */}
      <div className="w-96 flex-shrink-0 border-r border-brand-100 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-brand-100 space-y-3">
          <h1 className="text-lg font-bold text-accent flex items-center gap-2">
            <MessageCircle className="h-5 w-5" /> Unified Inbox
          </h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-brand-100 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="flex-1 text-xs rounded-lg border border-brand-100 px-2 py-1.5"
            >
              <option value="all">All Channels</option>
              {Object.entries(CHANNEL_META).map(([key, meta]) => (
                <option key={key} value={key}>{meta.icon} {meta.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 text-xs rounded-lg border border-brand-100 px-2 py-1.5"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="snoozed">Snoozed</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No conversations yet. Leads from SMS, email, Facebook, Instagram, WhatsApp, and other channels will appear here.
            </div>
          ) : (
            conversations.map((conv) => {
              const meta = CHANNEL_META[conv.channel] || { label: conv.channel, icon: "\uD83D\uDCAC", color: "bg-gray-100 text-gray-700" };
              return (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={`w-full text-left px-4 py-3 border-b border-brand-50 hover:bg-brand-50/50 transition ${selectedId === conv.id ? "bg-brand-50" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 inline-flex items-center justify-center h-8 w-8 rounded-full text-sm ${meta.color}`}>
                      {meta.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {conv.contactName || conv.contactPhone || conv.contactEmail || "Unknown"}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white px-1.5">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] font-medium text-muted-foreground">{meta.label}</span>
                        <span className="text-muted-foreground/40">&middot;</span>
                        <span className="text-[10px] text-muted-foreground">
                          {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {conv.lastMessagePreview || "No messages yet"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel — message thread */}
      <div className="flex-1 flex flex-col">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <MessageCircle className="h-12 w-12 mx-auto text-brand-200" />
              <p className="text-sm">Select a conversation to view messages</p>
              <p className="text-xs text-muted-foreground">
                All leads from Facebook, Instagram, SMS, WhatsApp, X, email, and more appear here
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-brand-100 bg-brand-50/30">
              <div>
                <h2 className="font-semibold text-accent">
                  {selected.contactName || selected.contactPhone || selected.contactEmail || "Unknown"}
                </h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${CHANNEL_META[selected.channel]?.color || ""}`}>
                    {CHANNEL_META[selected.channel]?.icon} {CHANNEL_META[selected.channel]?.label}
                  </span>
                  {selected.contactPhone && <span><Phone className="inline h-3 w-3" /> {selected.contactPhone}</span>}
                  {selected.contactEmail && <span><Mail className="inline h-3 w-3" /> {selected.contactEmail}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selected.status === "open" && (
                  <button onClick={() => updateStatus(selected.id, "closed")} className="text-xs px-3 py-1 rounded-full border border-brand-200 hover:bg-brand-50">
                    Close
                  </button>
                )}
                {selected.status === "closed" && (
                  <button onClick={() => updateStatus(selected.id, "open")} className="text-xs px-3 py-1 rounded-full border border-brand-200 hover:bg-brand-50">
                    Reopen
                  </button>
                )}
                {selected.crmLeadId ? (
                  <span className="text-xs px-3 py-1 rounded-full bg-brand-100 text-accent font-medium">CRM Linked</span>
                ) : (
                  <span className="text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">No CRM Link</span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                    msg.direction === "outbound"
                      ? "bg-accent text-white rounded-br-sm"
                      : "bg-brand-50 text-foreground rounded-bl-sm"
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${msg.direction === "outbound" ? "text-white/60" : "text-muted-foreground"}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {msg.direction === "outbound" && msg.status === "failed" && " \u274C Failed"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply composer */}
            <div className="border-t border-brand-100 px-6 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                  placeholder={`Reply via ${CHANNEL_META[selected.channel]?.label || selected.channel}...`}
                  rows={2}
                  className="flex-1 resize-none rounded-xl border border-brand-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                <button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sending}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white transition hover:bg-brand-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Press Enter to send, Shift+Enter for new line. Reply goes via {CHANNEL_META[selected.channel]?.label}.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
