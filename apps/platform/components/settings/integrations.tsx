"use client";

const integrations = [
  {
    name: "OpenPhone",
    description: "SMS, voice drops, and shared inbox automations.",
    status: "Connected",
    action: "Manage webhooks"
  },
  {
    name: "Wise",
    description: "Automatic 65/35 payouts and ACH vendor payments.",
    status: "Connected",
    action: "View payout rules"
  },
  {
    name: "PayPal",
    description: "Backup payment rails for international contractors.",
    status: "Ready",
    action: "Connect PayPal"
  },
  {
    name: "Google Workspace",
    description: "Calendar sync, email templates, and Drive knowledge base.",
    status: "Syncing",
    action: "Review sync logs"
  },
  {
    name: "ADP 1099",
    description: "Contractor onboarding, compliance, and tax forms.",
    status: "Pending",
    action: "Complete setup"
  }
];

const statusChip: Record<string, string> = {
  Connected: "bg-emerald-500/20 text-emerald-200",
  Ready: "bg-sky-500/20 text-sky-200",
  Syncing: "bg-amber-500/20 text-amber-200",
  Pending: "bg-rose-500/20 text-rose-200"
};

const IntegrationList = () => (
  <section className="glass rounded-3xl p-6 text-white">
    <header>
      <h2 className="font-display text-2xl">Integrations</h2>
      <p className="text-sm text-white/70">
        Connect communication, payments, and HR systems. Railway deploys
        environment variables automatically.
      </p>
    </header>
    <div className="mt-6 space-y-3">
      {integrations.map((integration) => (
        <div
          key={integration.name}
          className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <p className="text-base font-semibold text-white">
              {integration.name}
            </p>
            <p className="mt-1 text-xs text-white/60">{integration.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusChip[integration.status]}`}
            >
              {integration.status}
            </span>
            <button className="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/70 transition hover:border-white hover:text-white">
              {integration.action}
            </button>
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default IntegrationList;
