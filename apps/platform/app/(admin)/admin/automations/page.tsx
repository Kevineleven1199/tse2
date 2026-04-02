import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

const AutomationsPage = async () => {
  const session = await getSession();
  const tenantId = session?.tenantId || process.env.DEFAULT_TENANT_ID || "";

  let automations: Awaited<ReturnType<typeof prisma.automation.findMany>> = [];
  try {
    automations = await prisma.automation.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
    });
  } catch (error) {
    console.error("[automations] Failed to fetch automations:", error);
  }

  // Built-in automations that always exist in the engine
  const builtInAutomations = [
    {
      name: "Auto-Quote on Request",
      trigger: "service_request.created",
      description: "Generates an AI quote and sends SMS + email to the customer when a new request comes in.",
      status: "active",
      builtIn: true,
    },
    {
      name: "Smart Cleaner Assignment",
      trigger: "quote.accepted",
      description: "Scores available cleaners by rating, skills, distance, and availability. Auto-assigns if score >= 80, otherwise broadcasts to top 10 matches.",
      status: "active",
      builtIn: true,
    },
    {
      name: "Schedule Confirmation",
      trigger: "job.scheduled",
      description: "Sends SMS confirmations to both customer and cleaner with address, time, and payout details. Syncs to Google Calendar.",
      status: "active",
      builtIn: true,
    },
    {
      name: "24-Hour Reminder",
      trigger: "cron.daily",
      description: "Sends appointment reminders via SMS to customers and cleaners 24 hours before scheduled jobs.",
      status: "active",
      builtIn: true,
    },
    {
      name: "Call Transcript Summarizer",
      trigger: "webhook.openphone.call.transcript.completed",
      description: "AI analyzes call transcripts to extract customer details, generate estimates, and flag follow-ups.",
      status: process.env.OPENAI_API_KEY ? "active" : "inactive",
      builtIn: true,
    },
    {
      name: "Payment Capture Notification",
      trigger: "webhook.stripe.payment_intent.succeeded",
      description: "Confirms payment to customer via SMS and alerts HQ when a deposit or full payment is captured.",
      status: process.env.STRIPE_SECRET_KEY ? "active" : "inactive",
      builtIn: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Automations</h1>
        <p className="text-sm text-muted">
          {builtInAutomations.filter((a) => a.status === "active").length + automations.filter((a) => a.status === "active").length} active automations running
        </p>
      </div>

      {/* Built-in automations */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Core Engine</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {builtInAutomations.map((automation) => (
            <Card key={automation.name} className="transition hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{automation.name}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          automation.status === "active"
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {automation.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted">{automation.description}</p>
                    <p className="mt-2 font-mono text-xs text-muted/60">{automation.trigger}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom automations from DB */}
      {automations.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Custom Rules</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {automations.map((automation) => {
              const def = automation.definition as Record<string, unknown>;
              return (
                <Card key={automation.id} className="transition hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{automation.name}</h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              automation.status === "active"
                                ? "bg-green-50 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {automation.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted">
                          Trigger: {automation.trigger}
                        </p>
                        {typeof def.description === "string" && def.description && (
                          <p className="mt-1 text-sm text-muted">{def.description}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationsPage;
