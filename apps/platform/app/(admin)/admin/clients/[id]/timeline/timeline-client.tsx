"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";

interface TimelineEvent {
  id: string;
  type: "email" | "sms" | "call" | "activity" | "payment" | "job";
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface ClientInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  memberSince: string;
}

interface TimelineClientProps {
  client: ClientInfo;
}

export default function TimelineClient({ client }: TimelineClientProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [driveFolderUrl, setDriveFolderUrl] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);

  useEffect(() => {
    fetchTimeline();
  }, [client.id]);

  const fetchTimeline = async () => {
    try {
      const res = await fetch(`/api/admin/clients/${client.id}/timeline`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.timeline);
        const jobWithFolder = data.timeline.find(
          (e: TimelineEvent) => e.type === "job" && e.metadata?.driveFolderUrl
        );
        if (jobWithFolder) setDriveFolderUrl(jobWithFolder.metadata.driveFolderUrl);
      }
    } catch (err) {
      console.error("Failed to load timeline:", err);
    } finally {
      setLoading(false);
    }
  };

  const createDriveFolder = async () => {
    setCreatingFolder(true);
    try {
      const jobEvent = events.find((e) => e.type === "job");
      if (!jobEvent?.metadata?.requestId) return;

      const res = await fetch("/api/admin/drive-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: jobEvent.metadata.requestId }),
      });

      if (res.ok) {
        const data = await res.json();
        setDriveFolderUrl(data.folderUrl);
        await fetchTimeline();
      }
    } catch (err) {
      console.error("Failed to create Drive folder:", err);
    } finally {
      setCreatingFolder(false);
    }
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "call":
        return "☎️";
      case "email":
        return "✉️";
      case "sms":
        return "💬";
      case "payment":
        return "💳";
      case "job":
        return "🧹";
      default:
        return "🔵";
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "call":
        return "bg-blue-100 text-blue-800";
      case "email":
        return "bg-purple-100 text-purple-800";
      case "sms":
        return "bg-green-100 text-green-800";
      case "payment":
        return "bg-yellow-100 text-yellow-800";
      case "job":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filtered =
    filter === "all" ? events : events.filter((e) => e.type === filter);

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.round(diff / 86400000)}d ago`;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="p-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Client Header */}
      <div className="mb-6">
        <Link
          href="/admin/contacts"
          className="text-sm text-green-600 hover:underline mb-2 inline-block"
        >
          &larr; Back to Contacts
        </Link>
        <div className="flex items-start justify-between mt-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            <div className="flex gap-4 text-sm text-gray-500 mt-1">
              <span>{client.email}</span>
              {client.phone && <span>{client.phone}</span>}
              <span>
                Client since{" "}
                {new Date(client.memberSince).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {driveFolderUrl ? (
              <a
                href={driveFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8.267 14.68c-.184 0-.308.018-.372.036v1.178c.076.018.164.023.372.023.479 0 .776-.246.776-.626 0-.404-.276-.611-.776-.611zm3.487.012c-.2 0-.33.018-.407.036v2.61c.077.018.164.018.407.018.58 0 .91-.306.91-.865v-.942c0-.537-.306-.857-.91-.857z" />
                  <path d="M7.5 3C6.12 3 5 4.12 5 5.5v13C5 19.88 6.12 21 7.5 21h9c1.38 0 2.5-1.12 2.5-2.5v-13C19 4.12 17.88 3 16.5 3h-9z" />
                </svg>
                Open Drive Folder
              </a>
            ) : (
              <button
                onClick={createDriveFolder}
                disabled={creatingFolder}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50"
              >
                {creatingFolder ? "Creating..." : "Create Drive Folder"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {["all", "call", "sms", "email", "payment", "job", "activity"].map(
          (t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === t
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t === "all"
                ? `All (${events.length})`
                : `${t.charAt(0).toUpperCase() + t.slice(1)}s (${
                    events.filter((e) => e.type === t).length
                  })`}
            </button>
          )
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-1">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No activity found
              {filter !== "all" ? ` for "${filter}"` : ""}
            </CardContent>
          </Card>
        ) : (
          filtered.map((event) => (
            <div
              key={event.id}
              className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border-l-4 border-transparent hover:border-green-500"
              onClick={() => toggleExpand(event.id)}
            >
              <div className="text-xl flex-shrink-0 mt-0.5">
                {typeIcon(event.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 text-sm">
                    {event.title}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${typeColor(
                      event.type
                    )}`}
                  >
                    {event.type}
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {event.description}
                </p>

                {expanded.has(event.id) && event.metadata && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm space-y-1">
                    {event.type === "call" && event.metadata.transcript && (
                      <div>
                        <span className="font-medium">Transcript excerpt:</span>
                        <p className="text-gray-600 mt-1 whitespace-pre-wrap">
                          {event.metadata.transcript}
                        </p>
                        {event.metadata.sentiment && (
                          <p className="mt-1">
                            <span className="font-medium">Sentiment:</span>{" "}
                            {event.metadata.sentiment}
                          </p>
                        )}
                        {event.metadata.duration && (
                          <p>
                            <span className="font-medium">Duration:</span>{" "}
                            {Math.round(event.metadata.duration / 60)}min
                          </p>
                        )}
                      </div>
                    )}
                    {event.type === "job" && (
                      <div>
                        <p>
                          <span className="font-medium">Service:</span>{" "}
                          {event.metadata.serviceType}
                        </p>
                        <p>
                          <span className="font-medium">Address:</span>{" "}
                          {event.metadata.address}
                        </p>
                        <p>
                          <span className="font-medium">Status:</span>{" "}
                          {event.metadata.status}
                        </p>
                        {event.metadata.driveFolderUrl && (
                          <a
                            href={event.metadata.driveFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline inline-block mt-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Open Drive Folder &rarr;
                          </a>
                        )}
                      </div>
                    )}
                    {event.type === "payment" && (
                      <div>
                        <p>
                          <span className="font-medium">Amount:</span> $
                          {((event.metadata.amount || 0) / 100).toFixed(2)}
                        </p>
                        <p>
                          <span className="font-medium">Status:</span>{" "}
                          {event.metadata.status}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                {formatDate(event.timestamp)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
