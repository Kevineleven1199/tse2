"use client";

import { useState } from "react";

type Props = {
  integration: string;
  connected: boolean;
  syncable: boolean;
  oauthConnectable: boolean;
  selfService?: boolean;
};

export function IntegrationActions({
  integration,
  connected,
  syncable,
  oauthConnectable,
  selfService,
}: Props) {
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const configFieldsMap: Record<string, string[]> = {
    "Slack": ["SLACK_WEBHOOK_URL"],
    "Telegram": ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"],
    "SendGrid SMTP": ["SENDGRID_API_KEY"],
    "Gmail / Google Workspace": ["GOOGLE_SMTP_USER", "GOOGLE_SMTP_PASSWORD"],
    "OpenPhone": ["OPENPHONE_API_KEY", "OPENPHONE_DEFAULT_NUMBER"],
    "Stripe": ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY"],
    "PayPal": ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"],
    "Google Calendar": ["GOOGLE_SERVICE_ACCOUNT", "GOOGLE_SERVICE_KEY"],
    "OpenAI": ["OPENAI_API_KEY"],
  };

  const getConfigFields = () => configFieldsMap[integration] || [];

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      let res: Response;
      if (integration === "OpenPhone") {
        res = await fetch("/api/openphone/sync-contacts");
      } else if (integration === "Jobber") {
        res = await fetch("/api/integrations/jobber", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "sync" }),
        });
      } else {
        setResult("Sync not supported for this integration");
        return;
      }

      const data = await res.json();
      if (res.ok) {
        if (integration === "OpenPhone") {
          setResult(
            `✓ Synced ${data.totalContacts || 0} contacts (${data.created || 0} new, ${data.updated || 0} updated)`
          );
        } else {
          setResult(`✓ Synced ${data.synced || 0} clients from Jobber`);
        }
      } else {
        setResult(`✗ Error: ${data.error || "Sync failed"}`);
      }
    } catch (err) {
      setResult(`✗ Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setResult(null);
    try {
      if (integration === "Jobber") {
        const res = await fetch("/api/integrations/jobber");
        const data = await res.json();

        if (data.error) {
          setResult(`✗ Error: ${data.error}`);
          return;
        }

        if (data.authUrl) {
          window.location.href = data.authUrl;
          return;
        }

        if (data.connected) {
          setResult("✓ Already connected!");
          return;
        }

        setResult("No auth URL available. Check environment variables.");
      }
    } catch (err) {
      setResult(`✗ Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setConfiguring(true);
    setResult(null);

    try {
      const formData = new FormData(e.currentTarget);
      const config: Record<string, string> = {};

      getConfigFields().forEach((field) => {
        const value = formData.get(field) as string;
        if (value) {
          config[field] = value;
        }
      });

      const res = await fetch("/api/integrations/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integration: integration.toLowerCase().replace(/\s+/g, "_"),
          config,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult("✓ Configuration saved successfully");
        setShowConfig(false);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setResult(`✗ Error: ${data.error || "Failed to save configuration"}`);
      }
    } catch (err) {
      setResult(`✗ Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setConfiguring(false);
    }
  };

  const configFields = getConfigFields();

  return (
    <div className="mt-auto pt-4">
      <div className="flex flex-wrap gap-2">
        {/* Sync button for connected integrations */}
        {connected && syncable && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex min-h-[36px] items-center rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white transition duration-200 hover:bg-brand-700 disabled:opacity-50"
          >
            {syncing ? "Syncing..." : "Sync Now"}
          </button>
        )}

        {/* Connect button for OAuth integrations */}
        {!connected && oauthConnectable && (
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="inline-flex min-h-[36px] items-center rounded-lg border border-accent bg-white px-3 py-2 text-xs font-semibold text-accent transition duration-200 hover:bg-brand-50 disabled:opacity-50"
          >
            {connecting ? "Connecting..." : "Connect"}
          </button>
        )}

        {/* Configure button for self-service integrations */}
        {selfService && !connected && (
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="inline-flex min-h-[36px] items-center rounded-lg border border-accent bg-white px-3 py-2 text-xs font-semibold text-accent transition duration-200 hover:bg-brand-50"
          >
            Configure
          </button>
        )}

        {/* Test button for OpenPhone */}
        {!connected && integration === "OpenPhone" && !selfService && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex min-h-[36px] items-center rounded-lg border border-accent bg-white px-3 py-2 text-xs font-semibold text-accent transition duration-200 hover:bg-brand-50 disabled:opacity-50"
          >
            {syncing ? "Testing..." : "Test"}
          </button>
        )}
      </div>

      {/* Configuration Form */}
      {selfService && showConfig && (
        <form onSubmit={handleSaveConfig} className="mt-3 space-y-3 rounded-lg bg-brand-50 border border-brand-100 p-4">
          {configFields.map((field) => (
            <div key={field}>
              <label className="block text-xs font-medium text-brand-900 mb-1">
                {field}
              </label>
              <input
                type={field.toLowerCase().includes("password") ? "password" : "text"}
                name={field}
                placeholder={`Enter ${field}`}
                className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-foreground placeholder-muted-foreground transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                required
              />
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={configuring}
              className="flex-1 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white transition duration-200 hover:bg-brand-700 disabled:opacity-50"
            >
              {configuring ? "Saving..." : "Save Configuration"}
            </button>
            <button
              type="button"
              onClick={() => setShowConfig(false)}
              className="flex-1 rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs font-semibold text-brand-700 transition duration-200 hover:bg-brand-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Result message */}
      {result && (
        <p
          className={`mt-2 text-xs font-medium ${
            result.startsWith("✗") || result.startsWith("Error") ? "text-red-600" : "text-green-600"
          }`}
        >
          {result}
        </p>
      )}
    </div>
  );
}
