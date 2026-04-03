import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { IntegrationActions } from "./IntegrationActions";

type IntegrationConfig = {
  connected: boolean;
  status: string;
  label: string;
  description: string;
  envKeys: string[];
  configKeys?: string[];
  icon: string;
  category: "communication" | "payments" | "calendar" | "crm" | "hr";
  syncable?: boolean;
  oauthConnectable?: boolean;
  selfService?: boolean;
};

const INTEGRATION_DEFS: IntegrationConfig[] = [
  {
    connected: false,
    status: "disconnected",
    label: "Slack",
    description: "Operational notifications and alerts to your team channel",
    envKeys: ["SLACK_WEBHOOK_URL"],
    configKeys: ["SLACK_WEBHOOK_URL"],
    icon: "💬",
    category: "communication",
    selfService: true,
  },
  {
    connected: false,
    status: "disconnected",
    label: "Telegram",
    description: "Send job updates and alerts via Telegram bot",
    envKeys: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"],
    configKeys: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"],
    icon: "✈️",
    category: "communication",
    selfService: true,
  },
  {
    connected: false,
    status: "disconnected",
    label: "SendGrid SMTP",
    description: "Transactional emails via SMTP relay (works with free tier). Enter your SendGrid API key for secure relay configuration.",
    envKeys: ["SENDGRID_API_KEY"],
    configKeys: ["SENDGRID_API_KEY"],
    icon: "📧",
    category: "communication",
    selfService: true,
  },
  {
    connected: false,
    status: "disconnected",
    label: "Gmail / Google Workspace",
    description: "Send emails via Gmail or Google Workspace account with SMTP authentication",
    envKeys: ["GOOGLE_SMTP_USER", "GOOGLE_SMTP_PASSWORD"],
    configKeys: ["GOOGLE_SMTP_USER", "GOOGLE_SMTP_PASSWORD"],
    icon: "📨",
    category: "communication",
    selfService: true,
  },
  {
    connected: false,
    status: "disconnected",
    label: "OpenPhone",
    description: "SMS/voice notifications, call transcripts, and webhook events",
    envKeys: ["OPENPHONE_API_KEY", "OPENPHONE_DEFAULT_NUMBER"],
    configKeys: ["OPENPHONE_API_KEY", "OPENPHONE_DEFAULT_NUMBER"],
    icon: "📞",
    category: "communication",
    syncable: true,
    selfService: true,
  },
  {
    connected: false,
    status: "disconnected",
    label: "Jobber",
    description: "Client & job sync via GraphQL API with OAuth 2.0",
    envKeys: ["JOBBER_CLIENT_ID", "JOBBER_CLIENT_SECRET"],
    icon: "📋",
    category: "crm",
    oauthConnectable: true,
    syncable: true,
  },
  {
    connected: false,
    status: "disconnected",
    label: "Stripe",
    description: "Payment processing, deposits, and cleaner payouts",
    envKeys: ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY"],
    configKeys: ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY"],
    icon: "💳",
    category: "payments",
    selfService: true,
  },
  {
    connected: false,
    status: "disconnected",
    label: "PayPal",
    description: "Customer checkout and mass cleaner payouts",
    envKeys: ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"],
    configKeys: ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"],
    icon: "🅿️",
    category: "payments",
    selfService: true,
  },
  {
    connected: false,
    status: "disconnected",
    label: "Google Calendar",
    description: "Automatic calendar events for scheduled jobs",
    envKeys: ["GOOGLE_SERVICE_ACCOUNT", "GOOGLE_SERVICE_KEY"],
    configKeys: ["GOOGLE_SERVICE_ACCOUNT", "GOOGLE_SERVICE_KEY"],
    icon: "📅",
    category: "calendar",
    selfService: true,
  },
  {
    connected: false,
    status: "disconnected",
    label: "OpenAI",
    description: "AI-powered call summaries, quote narratives, and estimates",
    envKeys: ["OPENAI_API_KEY"],
    configKeys: ["OPENAI_API_KEY"],
    icon: "🤖",
    category: "crm",
    selfService: true,
  },
];

function checkEnvConnected(envKeys: string[]): boolean {
  return envKeys.every((key) => !!process.env[key]);
}

export default async function AdminIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const tenantId = session?.tenantId || process.env.DEFAULT_TENANT_ID || "";

  // Check DB integrations
  let dbIntegrations: Awaited<ReturnType<typeof prisma.integration.findMany>> = [];
  try {
    dbIntegrations = await prisma.integration.findMany({
      where: { tenantId },
    });
  } catch (error) {
    console.error("[integrations] Failed to fetch integrations:", error);
  }

  // Build status for each integration
  const integrations = INTEGRATION_DEFS.map((def) => {
    const dbRecord = dbIntegrations.find(
      (i) => i.type.toLowerCase() === def.label.toLowerCase().replace(/\s+/g, "_")
    );

    const envConnected = checkEnvConnected(def.envKeys);
    const isConnected = dbRecord?.status === "connected" || envConnected;

    return {
      ...def,
      connected: isConnected,
      status: dbRecord?.status ?? (envConnected ? "connected" : "not configured"),
    };
  });

  const connectedCount = integrations.filter((i) => i.connected).length;

  // Check for Jobber OAuth callback result
  const jobberResult = params?.jobber as string | undefined;
  const jobberSynced = params?.synced as string | undefined;

  const categories = [
    { key: "communication", label: "Communication" },
    { key: "payments", label: "Payments" },
    { key: "calendar", label: "Calendar" },
    { key: "crm", label: "CRM & AI" },
    { key: "hr", label: "HR & Payroll" },
  ] as const;

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://tristateenterprise264-production.up.railway.app";

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Integrations</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {connectedCount} of {integrations.length} integrations configured
        </p>
      </div>

      {/* Notification Messages */}
      {jobberResult === "connected" && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="font-medium text-green-800">
            ✓ Jobber connected successfully!
            {jobberSynced && ` ${jobberSynced} clients synced.`}
          </p>
        </div>
      )}
      {jobberResult === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-800">
            Failed to connect Jobber. Please try again or check your credentials.
          </p>
        </div>
      )}

      {/* Integration Categories */}
      {categories.map(({ key, label }) => {
        const items = integrations.filter((i) => i.category === key);
        if (items.length === 0) return null;

        return (
          <div key={key} className="space-y-4">
            <h2 className="text-lg font-semibold uppercase tracking-wide text-accent">
              {label}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((integration) => (
                <Card
                  key={integration.label}
                  className="rounded-xl border border-brand-100 bg-white shadow-sm transition duration-200 hover:border-brand-200 hover:shadow-md"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col h-full">
                      {/* Header with icon and status */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-4xl">{integration.icon}</span>
                          <div>
                            <h3 className="font-semibold text-foreground leading-tight">
                              {integration.label}
                            </h3>
                          </div>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                            integration.connected
                              ? "bg-green-100 text-green-700"
                              : integration.status === "expired"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {integration.connected
                            ? "✓ Connected"
                            : integration.status === "expired"
                            ? "⚠ Expired"
                            : "○ Not set"}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="mb-4 text-sm text-muted-foreground leading-relaxed flex-1">
                        {integration.description}
                      </p>

                      {/* Config Instructions */}
                      {!integration.connected && integration.configKeys && (
                        <div className="mb-4 rounded-lg bg-brand-50 p-3">
                          <p className="text-xs font-medium text-brand-900 mb-2">Required credentials:</p>
                          <div className="flex flex-wrap gap-2">
                            {integration.configKeys.map((k) => (
                              <code
                                key={k}
                                className="rounded bg-white px-2 py-1 text-xs text-brand-700 border border-brand-100"
                              >
                                {k}
                              </code>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <IntegrationActions
                        integration={integration.label}
                        connected={integration.connected}
                        syncable={!!integration.syncable}
                        oauthConnectable={!!integration.oauthConnectable}
                        selfService={!!integration.selfService}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {/* Webhook URLs */}
      <Card className="rounded-xl border border-brand-100 bg-white shadow-sm">
        <CardHeader className="border-b border-brand-50 p-6 pb-4">
          <h2 className="text-lg font-semibold text-foreground">Webhook Configuration</h2>
        </CardHeader>
        <CardContent className="space-y-4 p-6 text-sm">
          <div className="rounded-lg bg-brand-50 border border-brand-100 p-4">
            <p className="font-medium text-brand-900 mb-2">OpenPhone Webhooks</p>
            <p className="text-xs text-muted-foreground mb-3">
              Configure in OpenPhone settings: call.completed, call.transcript.completed, message.received
            </p>
            <code className="block rounded bg-white px-3 py-2 text-xs text-foreground border border-brand-100 break-all font-mono">
              {baseUrl}/api/webhooks/openphone
            </code>
          </div>

          <div className="rounded-lg bg-brand-50 border border-brand-100 p-4">
            <p className="font-medium text-brand-900 mb-2">Stripe Webhooks</p>
            <p className="text-xs text-muted-foreground mb-3">
              Configure in Stripe Dashboard: payment_intent.succeeded, payment_intent.payment_failed
            </p>
            <code className="block rounded bg-white px-3 py-2 text-xs text-foreground border border-brand-100 break-all font-mono">
              {baseUrl}/api/webhooks/stripe
            </code>
          </div>

          <div className="rounded-lg bg-brand-50 border border-brand-100 p-4">
            <p className="font-medium text-brand-900 mb-2">Jobber OAuth Callback</p>
            <p className="text-xs text-muted-foreground mb-3">
              Set as redirect URI in Jobber Developer Center
            </p>
            <code className="block rounded bg-white px-3 py-2 text-xs text-foreground border border-brand-100 break-all font-mono">
              {baseUrl}/api/integrations/jobber
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
