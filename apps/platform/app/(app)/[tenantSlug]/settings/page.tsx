import IntegrationList from "@/components/settings/integrations";
import { resolveTenantParams, type TenantPageProps } from "@/src/lib/tenant";

const SettingsPage = async ({ params }: TenantPageProps) => {
  const { tenantSlug } = await resolveTenantParams(params);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
        <h1 className="font-display text-3xl">Settings & integrations</h1>
        <p className="mt-2 max-w-3xl text-sm text-white/70">
          Manage branding, tenant domains, SLA rules, and connected services for{" "}
          <strong className="font-semibold text-white">{tenantSlug}</strong>. WordPress lives in reference-only mode; all live traffic routes to this
          Railway-deployed Next.js app.
        </p>
      </header>
      <IntegrationList />
    </div>
  );
};

export default SettingsPage;
