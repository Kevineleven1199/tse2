"use client";

import { useState, useTransition } from "react";
import {
  Settings2, Zap, Cloud, CreditCard, Globe, Shield, AlertTriangle, CheckCircle2, XCircle,
  Loader2, Plus, Trash2, Send, HardDrive, Database, ImageIcon,
} from "lucide-react";

// ── Types ──

type ConfigMap = Record<string, string | boolean | number | null | undefined>;

type IntegrationRecord = {
  id: string;
  type: string;
  status: string;
  config: ConfigMap;
  createdAt: string;
  updatedAt: string;
};

type WebhookRecord = {
  id: string;
  label: string;
  targetUrl: string;
  signingSecret: string | null;
  events: string[];
  enabled: boolean;
  lastStatus: number | null;
  lastError: string | null;
  lastDeliveredAt: string | null;
  createdAt: string;
};

type AuditEntry = {
  id: string;
  action: string;
  actorId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type StorageStats = {
  photosInDrive: number;
  photosInDb: number;
  estimatePhotosInDb: number;
  totalPhotos: number;
};

// ── Provider definitions ──

type ProviderDef = {
  type: string;
  label: string;
  category: "ai" | "comms" | "storage" | "ops" | "payments";
  fields: { key: string; label: string; type: "text" | "secret" | "toggle" | "select"; options?: string[] }[];
  wired: boolean; // true = test action works; false = scaffold only
  description: string;
};

const PROVIDERS: ProviderDef[] = [
  // AI
  { type: "OPENAI", label: "OpenAI", category: "ai", wired: true, description: "GPT models for quotes and transcripts",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "apiKey", label: "API Key", type: "secret" },
      { key: "baseUrl", label: "Base URL", type: "text" },
      { key: "model", label: "Default Model", type: "text" },
    ]},
  { type: "ANTHROPIC", label: "Anthropic / Claude", category: "ai", wired: true, description: "Claude models via Messages API",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "apiKey", label: "API Key", type: "secret" },
      { key: "model", label: "Default Model", type: "text" },
    ]},
  { type: "XAI", label: "xAI (Grok)", category: "ai", wired: true, description: "xAI models, OpenAI-compatible endpoint",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "apiKey", label: "API Key", type: "secret" },
      { key: "baseUrl", label: "Base URL", type: "text" },
      { key: "model", label: "Default Model", type: "text" },
    ]},
  { type: "OPENROUTER", label: "OpenRouter", category: "ai", wired: true, description: "Unified AI routing with provider fallbacks",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "apiKey", label: "API Key", type: "secret" },
      { key: "model", label: "Default Model", type: "text" },
    ]},
  // Communications
  { type: "OPENPHONE", label: "OpenPhone", category: "comms", wired: true, description: "SMS, calls, and contact sync",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "apiKey", label: "API Key", type: "secret" },
      { key: "fromNumber", label: "From Number", type: "text" },
      { key: "hqNumbers", label: "HQ Alert Numbers", type: "text" },
      { key: "webhookSecret", label: "Webhook Secret", type: "secret" },
    ]},
  { type: "SENDGRID", label: "SendGrid", category: "comms", wired: true, description: "Transactional and campaign email",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "apiKey", label: "API Key", type: "secret" },
      { key: "fromEmail", label: "From Email", type: "text" },
    ]},
  { type: "SLACK", label: "Slack", category: "comms", wired: true, description: "Operational notifications via incoming webhooks",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "webhookUrl", label: "Webhook URL", type: "secret" },
    ]},
  { type: "GMAIL", label: "Gmail / Google Workspace", category: "comms", wired: true, description: "OAuth or service-account email via Gmail API",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "serviceAccountEmail", label: "Service Account Email", type: "text" },
      { key: "privateKey", label: "Private Key", type: "secret" },
      { key: "delegatedUser", label: "Send-As Email", type: "text" },
      { key: "alertRecipients", label: "Alert Recipients (comma-separated)", type: "text" },
    ]},
  { type: "TELEGRAM", label: "Telegram", category: "comms", wired: true, description: "Clock-in/out alerts and notifications via Telegram Bot",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "botToken", label: "Bot Token (from @BotFather)", type: "secret" },
      { key: "chatId", label: "Chat ID (group or user)", type: "text" },
    ]},
  { type: "WHATSAPP", label: "WhatsApp Business", category: "comms", wired: true, description: "Clock-in/out alerts via WhatsApp Business Cloud API",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "accessToken", label: "Access Token (Meta Business)", type: "secret" },
      { key: "phoneNumberId", label: "Phone Number ID", type: "text" },
      { key: "recipientNumbers", label: "Recipient Numbers (comma-separated)", type: "text" },
    ]},
  // Storage
  { type: "GOOGLE_DRIVE", label: "Google Drive", category: "storage", wired: true, description: "Before/after photo storage, client folders",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "serviceAccountKey", label: "Service Account Key (JSON)", type: "secret" },
      { key: "parentFolderId", label: "Parent Folder ID", type: "text" },
      { key: "mediaUploadEnabled", label: "Media Upload Enabled", type: "toggle" },
    ]},
  // Operations
  { type: "GOOGLE_CALENDAR", label: "Google Calendar", category: "ops", wired: true, description: "Job scheduling and calendar sync",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "serviceAccountEmail", label: "Service Account Email", type: "text" },
      { key: "privateKey", label: "Private Key", type: "secret" },
      { key: "calendarId", label: "Calendar ID", type: "text" },
    ]},
  { type: "JOBBER", label: "Jobber", category: "ops", wired: true, description: "CRM, jobs, quotes, and timesheet sync (OAuth)",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
    ]},
  { type: "PABBLY", label: "Pabbly Connect", category: "ops", wired: true, description: "Automation workflows and triggers",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "apiKey", label: "API Key", type: "secret" },
      { key: "webhookUrl", label: "Webhook URL", type: "text" },
    ]},
  { type: "BOOKINGKOALA", label: "BookingKoala", category: "ops", wired: true, description: "Booking platform integration",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "apiKey", label: "API Key", type: "secret" },
      { key: "webhookUrl", label: "Webhook URL", type: "text" },
    ]},
  { type: "GOOGLE_SHEETS", label: "Google Sheets", category: "ops", wired: true, description: "Payroll/reconciliation sync to spreadsheets",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "serviceAccountKey", label: "Service Account Key (JSON)", type: "secret" },
      { key: "spreadsheetId", label: "Spreadsheet ID", type: "text" },
    ]},
  { type: "GOOGLE_MAPS", label: "Google Maps / Places", category: "ops", wired: true, description: "Address autocomplete, geocoding, and reviews",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "apiKey", label: "API Key", type: "secret" },
    ]},
  // HR / Payroll
  { type: "GUSTO", label: "Gusto", category: "ops", wired: true, description: "Automated payroll and HR sync",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "apiToken", label: "API Token", type: "secret" },
    ]},
  // Observability
  { type: "POSTHOG", label: "PostHog", category: "ops", wired: true, description: "Product analytics and feature flags",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "apiKey", label: "API Key", type: "secret" },
      { key: "host", label: "Host URL", type: "text" },
    ]},
  { type: "SENTRY", label: "Sentry", category: "ops", wired: true, description: "Error tracking and performance monitoring",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "authToken", label: "Auth Token", type: "secret" },
      { key: "dsn", label: "DSN", type: "text" },
    ]},
  // Social Media
  { type: "FACEBOOK", label: "Facebook / Meta", category: "comms", wired: true, description: "Auto-post updates, reviews, and promotions to Facebook page",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "pageAccessToken", label: "Page Access Token", type: "secret" },
      { key: "pageId", label: "Page ID", type: "text" },
    ]},
  { type: "INSTAGRAM", label: "Instagram", category: "comms", wired: true, description: "Auto-post before/after photos and business updates",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "accessToken", label: "Access Token", type: "secret" },
      { key: "accountId", label: "Business Account ID", type: "text" },
    ]},
  { type: "TWITTER_X", label: "X (Twitter)", category: "comms", wired: true, description: "Auto-post updates and engage with local community",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "apiKey", label: "API Key", type: "secret" },
      { key: "apiSecret", label: "API Secret", type: "secret" },
      { key: "accessToken", label: "Access Token", type: "secret" },
      { key: "accessSecret", label: "Access Token Secret", type: "secret" },
    ]},
  { type: "TIKTOK", label: "TikTok", category: "comms", wired: true, description: "Content sharing and local business promotion",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "accessToken", label: "Access Token", type: "secret" },
    ]},
  // Payments
  { type: "STRIPE", label: "Stripe", category: "payments", wired: true, description: "Payment processing, Connect payouts, and webhooks",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "secretKey", label: "Secret Key", type: "secret" },
      { key: "publishableKey", label: "Publishable Key", type: "text" },
      { key: "webhookSecret", label: "Webhook Secret", type: "secret" },
    ]},
  { type: "PAYPAL", label: "PayPal", category: "payments", wired: true, description: "PayPal payments and cleaner payouts",
    fields: [
      { key: "enabled", label: "Enabled", type: "toggle" },
      { key: "clientId", label: "Client ID", type: "text" },
      { key: "clientSecret", label: "Client Secret", type: "secret" },
    ]},
];

const CATEGORY_LABELS: Record<string, { label: string; icon: typeof Settings2 }> = {
  ai: { label: "AI Providers", icon: Zap },
  comms: { label: "Communications", icon: Send },
  storage: { label: "Storage & Media", icon: HardDrive },
  ops: { label: "Operations", icon: Globe },
  payments: { label: "Payments", icon: CreditCard },
};

const STATUS_BADGES: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  disabled: { label: "Disabled", className: "bg-slate-100 text-slate-600", icon: XCircle },
  configured_unverified: { label: "Unverified", className: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  healthy: { label: "Healthy", className: "bg-green-100 text-green-700", icon: CheckCircle2 },
  failing: { label: "Failing", className: "bg-red-100 text-red-700", icon: XCircle },
  connected: { label: "Connected", className: "bg-green-100 text-green-700", icon: CheckCircle2 },
  expired: { label: "Expired", className: "bg-red-100 text-red-700", icon: AlertTriangle },
};

// ── Main Component ──

export function ApiWebhooksClient({
  integrations,
  webhooks: initialWebhooks,
  recentAudit,
  envStatus,
  storageStats,
}: {
  integrations: IntegrationRecord[];
  webhooks: WebhookRecord[];
  recentAudit: AuditEntry[];
  envStatus: Record<string, boolean>;
  storageStats: StorageStats;
}) {
  const [tab, setTab] = useState<string>("ai");
  const [configs, setConfigs] = useState<Record<string, ConfigMap>>(() => {
    const m: Record<string, ConfigMap> = {};
    integrations.forEach((i) => { m[i.type] = i.config; });
    return m;
  });
  const [statuses, setStatuses] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    integrations.forEach((i) => { m[i.type] = i.status; });
    return m;
  });
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; detail?: string; error?: string; latencyMs?: number }>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [webhooks, setWebhooks] = useState(initialWebhooks);
  const [showNewWebhook, setShowNewWebhook] = useState(false);
  const [pending, startTransition] = useTransition();

  // ── Helpers ──

  const getConfig = (type: string): ConfigMap => configs[type] ?? {};

  const setField = (type: string, key: string, value: string | boolean) => {
    setConfigs((prev) => ({
      ...prev,
      [type]: { ...(prev[type] ?? {}), [key]: value },
    }));
  };

  const getStatus = (type: string): string => {
    const s = statuses[type];
    if (s) return s;
    if (envStatus[type]) return "configured_unverified";
    return "disabled";
  };

  // ── Save config ──

  const saveConfig = async (type: string) => {
    setSaving((p) => ({ ...p, [type]: true }));
    try {
      const res = await fetch("/api/admin/integrations/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, config: configs[type] ?? {} }),
      });
      const data = await res.json();
      if (res.ok) {
        setConfigs((p) => ({ ...p, [type]: data.config as ConfigMap }));
        setStatuses((p) => ({ ...p, [type]: data.status }));
      }
    } finally {
      setSaving((p) => ({ ...p, [type]: false }));
    }
  };

  // ── Test connection ──

  const testConnection = async (type: string) => {
    setTesting((p) => ({ ...p, [type]: true }));
    setTestResults((p) => ({ ...p, [type]: undefined as any }));
    try {
      const res = await fetch("/api/admin/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      setTestResults((p) => ({ ...p, [type]: data }));
      if (data.ok) {
        setStatuses((p) => ({ ...p, [type]: "healthy" }));
      } else {
        setStatuses((p) => ({ ...p, [type]: "failing" }));
      }
    } finally {
      setTesting((p) => ({ ...p, [type]: false }));
    }
  };

  // ── Webhook CRUD ──

  const createWebhook = async (data: { label: string; targetUrl: string; events: string[] }) => {
    const res = await fetch("/api/admin/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const wh = await res.json();
      setWebhooks((p) => [wh, ...p]);
      setShowNewWebhook(false);
    }
  };

  const deleteWebhook = async (id: string) => {
    const res = await fetch(`/api/admin/webhooks?id=${id}`, { method: "DELETE" });
    if (res.ok) setWebhooks((p) => p.filter((w) => w.id !== id));
  };

  const testWebhook = async (id: string) => {
    await fetch("/api/admin/webhooks/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  };

  // ── Render helpers ──

  const tabs = [
    { key: "ai", label: "AI Providers" },
    { key: "comms", label: "Communications" },
    { key: "storage", label: "Storage & Media" },
    { key: "ops", label: "Operations" },
    { key: "payments", label: "Payments" },
    { key: "webhooks", label: "Outbound Webhooks" },
    { key: "health", label: "Health & Audit" },
  ];

  const providersForTab = PROVIDERS.filter((p) => p.category === tab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-accent">API & Webhooks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage integrations, API credentials, webhooks, and connection health.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-brand-100 bg-brand-50/30 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              tab === t.key
                ? "bg-white text-accent shadow-sm"
                : "text-muted-foreground hover:text-accent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Provider cards */}
      {tab !== "webhooks" && tab !== "health" && (
        <div className="space-y-4">
          {/* Drive storage health banner */}
          {tab === "storage" && (
            <DriveHealthBanner stats={storageStats} driveStatus={getStatus("GOOGLE_DRIVE")} />
          )}

          {providersForTab.length === 0 && (
            <p className="text-sm text-muted-foreground">No providers in this category.</p>
          )}

          {providersForTab.map((provider) => (
            <ProviderCard
              key={provider.type}
              provider={provider}
              config={getConfig(provider.type)}
              status={getStatus(provider.type)}
              testResult={testResults[provider.type]}
              isSaving={!!saving[provider.type]}
              isTesting={!!testing[provider.type]}
              envConfigured={!!envStatus[provider.type]}
              onFieldChange={(key, value) => setField(provider.type, key, value)}
              onSave={() => saveConfig(provider.type)}
              onTest={() => testConnection(provider.type)}
            />
          ))}
        </div>
      )}

      {/* Webhooks tab */}
      {tab === "webhooks" && (
        <WebhooksTab
          webhooks={webhooks}
          showNew={showNewWebhook}
          onToggleNew={() => setShowNewWebhook(!showNewWebhook)}
          onCreate={createWebhook}
          onDelete={deleteWebhook}
          onTest={testWebhook}
        />
      )}

      {/* Health & Audit tab */}
      {tab === "health" && (
        <HealthTab
          integrations={integrations}
          statuses={statuses}
          envStatus={envStatus}
          storageStats={storageStats}
          audit={recentAudit}
        />
      )}
    </div>
  );
}

// ── Drive Health Banner ──

function DriveHealthBanner({ stats, driveStatus }: { stats: StorageStats; driveStatus: string }) {
  const dbFallbackActive = stats.photosInDb > 0;
  const driveHealthy = driveStatus === "healthy";

  return (
    <div className={`rounded-2xl border p-5 ${
      dbFallbackActive
        ? "border-amber-200 bg-amber-50"
        : driveHealthy
        ? "border-green-200 bg-green-50"
        : "border-brand-100 bg-brand-50/30"
    }`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          dbFallbackActive ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"
        }`}>
          {dbFallbackActive ? <AlertTriangle className="h-5 w-5" /> : <HardDrive className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-accent">Photo Storage Health</h3>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat icon={HardDrive} label="In Drive" value={stats.photosInDrive} good />
            <Stat icon={Database} label="DB Fallback" value={stats.photosInDb} bad={stats.photosInDb > 0} />
            <Stat icon={ImageIcon} label="Estimate (DB)" value={stats.estimatePhotosInDb} />
            <Stat icon={ImageIcon} label="Total Photos" value={stats.totalPhotos} />
          </div>
          {dbFallbackActive && (
            <p className="mt-2 text-xs text-amber-700">
              {stats.photosInDb} photo(s) stored in database instead of Drive.
              This increases DB size and slows performance.
              Verify Drive configuration below.
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Access mode: direct Drive link (anyone with link)
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, good, bad }: { icon: typeof Database; label: string; value: number; good?: boolean; bad?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${bad ? "text-amber-500" : good ? "text-green-500" : "text-muted-foreground"}`} />
      <div>
        <p className={`text-lg font-bold ${bad ? "text-amber-700" : good ? "text-green-700" : "text-accent"}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ── Provider Card ──

function ProviderCard({
  provider, config, status, testResult, isSaving, isTesting, envConfigured,
  onFieldChange, onSave, onTest,
}: {
  provider: ProviderDef;
  config: ConfigMap;
  status: string;
  testResult?: { ok: boolean; detail?: string; error?: string; latencyMs?: number };
  isSaving: boolean;
  isTesting: boolean;
  envConfigured: boolean;
  onFieldChange: (key: string, value: string | boolean) => void;
  onSave: () => void;
  onTest: () => void;
}) {
  const badge = STATUS_BADGES[status] ?? STATUS_BADGES.disabled;
  const BadgeIcon = badge.icon;

  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-accent">{provider.label}</h3>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.className}`}>
              <BadgeIcon className="h-3 w-3" /> {badge.label}
            </span>
            {!provider.wired && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                settings only
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{provider.description}</p>
          {envConfigured && status === "disabled" && (
            <p className="text-xs text-blue-600 mt-1">Environment variable detected</p>
          )}
        </div>
      </div>

      {/* Config fields */}
      <div className="mt-4 space-y-3">
        {provider.fields.map((field) => {
          const val = config[field.key];
          return (
            <div key={field.key}>
              {field.type === "toggle" ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={val === true}
                    onChange={(e) => onFieldChange(field.key, e.target.checked)}
                    className="h-4 w-4 rounded border-brand-200 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="font-medium text-accent">{field.label}</span>
                </label>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{field.label}</label>
                  <input
                    type={field.type === "secret" ? "password" : "text"}
                    value={typeof val === "string" ? val : ""}
                    onChange={(e) => onFieldChange(field.key, e.target.value)}
                    placeholder={field.type === "secret" ? "Enter to update, leave blank to keep existing" : ""}
                    className="w-full rounded-xl border border-brand-100 bg-brand-50/30 px-3 py-2 text-sm text-accent placeholder:text-muted-foreground/50 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Settings2 className="h-3 w-3" />}
          Save
        </button>

        {provider.wired && (
          <button
            onClick={onTest}
            disabled={isTesting}
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-accent transition hover:bg-brand-50 disabled:opacity-60"
          >
            {isTesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
            Test Connection
          </button>
        )}

        {/* Test result */}
        {testResult && (
          <span className={`text-xs font-medium ${testResult.ok ? "text-green-600" : "text-red-600"}`}>
            {testResult.ok ? "Connected" : testResult.error}
            {testResult.latencyMs ? ` (${testResult.latencyMs}ms)` : ""}
            {testResult.detail ? ` — ${testResult.detail}` : ""}
          </span>
        )}
      </div>

      {/* Last tested */}
      {config.lastTestedAt && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Last tested: {new Date(config.lastTestedAt as string).toLocaleString()}
          {config.lastTestResult === "ok" ? " — passed" : config.lastTestError ? ` — ${String(config.lastTestError)}` : ""}
        </p>
      )}
    </div>
  );
}

// ── Webhooks Tab ──

function WebhooksTab({
  webhooks, showNew, onToggleNew, onCreate, onDelete, onTest,
}: {
  webhooks: WebhookRecord[];
  showNew: boolean;
  onToggleNew: () => void;
  onCreate: (data: { label: string; targetUrl: string; events: string[] }) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);

  const allEvents = [
    "lead.created", "quote.created", "quote.approved",
    "job.created", "job.assigned", "job.completed", "job.cancelled",
    "invoice.created", "invoice.sent", "invoice.paid",
    "payment.captured", "payment.failed",
    "timesheet.approved", "payroll.processed",
    "customer.created", "cleaner.onboarded",
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-accent">Outbound Webhook Endpoints</h2>
        <button
          onClick={onToggleNew}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-brand-700"
        >
          <Plus className="h-3 w-3" /> Add Webhook
        </button>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold">Manual / test delivery only</p>
        <p className="text-xs mt-1">
          Webhook endpoints can be registered and tested via the send-test button.
          Automatic event delivery (e.g., when a job is completed) is not yet wired into app events.
          Use Pabbly Connect or manual triggers for now.
        </p>
      </div>

      {showNew && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50/30 p-5 space-y-3">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (e.g., Pabbly CRM sync)"
            className="w-full rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hooks.pabbly.com/..."
            className="w-full rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm" />
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Events</p>
            <div className="flex flex-wrap gap-2">
              {allEvents.map((ev) => (
                <label key={ev} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={events.includes(ev)}
                    onChange={(e) => setEvents(e.target.checked ? [...events, ev] : events.filter((x) => x !== ev))}
                    className="h-3 w-3 rounded border-brand-200"
                  />
                  {ev}
                </label>
              ))}
            </div>
          </div>
          <button
            onClick={() => { if (label && url && events.length) onCreate({ label, targetUrl: url, events }); }}
            disabled={!label || !url || !events.length}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-50"
          >
            Create Webhook
          </button>
        </div>
      )}

      {webhooks.length === 0 && !showNew && (
        <p className="text-sm text-muted-foreground">No outbound webhooks configured.</p>
      )}

      {webhooks.map((wh) => (
        <div key={wh.id} className="rounded-2xl border border-brand-100 bg-white p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-accent">{wh.label}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{wh.targetUrl}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {wh.events.map((ev) => (
                  <span key={ev} className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">{ev}</span>
                ))}
              </div>
              {wh.lastDeliveredAt && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Last delivery: {new Date(wh.lastDeliveredAt).toLocaleString()}
                  {wh.lastStatus ? ` — HTTP ${wh.lastStatus}` : ""}
                  {wh.lastError ? ` — ${wh.lastError}` : ""}
                </p>
              )}
            </div>
            <div className="flex gap-1">
              <button onClick={() => onTest(wh.id)} title="Send test event"
                className="rounded-lg border border-brand-100 p-2 text-muted-foreground hover:text-accent hover:bg-brand-50">
                <Send className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onDelete(wh.id)} title="Delete"
                className="rounded-lg border border-red-100 p-2 text-red-400 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Health & Audit Tab ──

function HealthTab({
  integrations, statuses, envStatus, storageStats, audit,
}: {
  integrations: IntegrationRecord[];
  statuses: Record<string, string>;
  envStatus: Record<string, boolean>;
  storageStats: StorageStats;
  audit: AuditEntry[];
}) {
  return (
    <div className="space-y-6">
      {/* Drive storage summary */}
      <DriveHealthBanner stats={storageStats} driveStatus={statuses["GOOGLE_DRIVE"] ?? "disabled"} />

      {/* All providers health */}
      <div className="rounded-2xl border border-brand-100 bg-white overflow-hidden">
        <div className="px-5 py-3 bg-brand-50/30 border-b border-brand-100">
          <h3 className="font-semibold text-accent text-sm">Integration Health</h3>
        </div>
        <div className="divide-y divide-brand-50">
          {PROVIDERS.map((p) => {
            const status = statuses[p.type] ?? (envStatus[p.type] ? "configured_unverified" : "disabled");
            const badge = STATUS_BADGES[status] ?? STATUS_BADGES.disabled;
            const BadgeIcon = badge.icon;
            const cfg = integrations.find((i) => i.type === p.type)?.config ?? {};
            return (
              <div key={p.type} className="flex items-center justify-between px-5 py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-accent">{p.label}</span>
                  {!p.wired && <span className="text-[10px] text-slate-400">(scaffold)</span>}
                </div>
                <div className="flex items-center gap-3">
                  {(cfg as any).lastTestedAt && (
                    <span className="text-[10px] text-muted-foreground">
                      {new Date((cfg as any).lastTestedAt).toLocaleDateString()}
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.className}`}>
                    <BadgeIcon className="h-3 w-3" /> {badge.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent audit */}
      <div className="rounded-2xl border border-brand-100 bg-white overflow-hidden">
        <div className="px-5 py-3 bg-brand-50/30 border-b border-brand-100">
          <h3 className="font-semibold text-accent text-sm">Recent Configuration Changes</h3>
        </div>
        {audit.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">No recent changes.</p>
        ) : (
          <div className="divide-y divide-brand-50">
            {audit.map((a) => (
              <div key={a.id} className="px-5 py-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-accent">{a.action}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {a.metadata.type ? `Provider: ${String(a.metadata.type)}` : ""}
                  {(a.metadata.keysChanged as string[])?.length ? ` — Keys: ${(a.metadata.keysChanged as string[]).join(", ")}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
