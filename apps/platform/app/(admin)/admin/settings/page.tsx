import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";

const DEFAULT_HOURS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
].map((day) => ({
  day,
  hours: "Not tracked in TriState yet",
}));

const labelValueClass = "mt-1 text-sm font-medium text-accent";

const formatPlanName = (plan: string) =>
  plan
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export default async function BusinessSettingsPage() {
  const session = await requireSession({ roles: ["HQ"] });

  const [tenant, primaryContact, servedCities, integrationCount] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: {
        id: true,
        name: true,
        plan: true,
        timezone: true,
        customDomain: true,
        primaryColor: true,
        createdAt: true,
      },
    }),
    prisma.user.findFirst({
      where: {
        tenantId: session.tenantId,
        role: "HQ",
        status: "active",
      },
      orderBy: { createdAt: "asc" },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    }),
    prisma.serviceRequest.groupBy({
      by: ["city"],
      where: { tenantId: session.tenantId },
      _count: true,
      orderBy: { _count: { city: "desc" } },
      take: 8,
    }),
    prisma.integration.count({
      where: {
        tenantId: session.tenantId,
        status: "connected",
      },
    }),
  ]);

  if (!tenant) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-semibold text-red-700">Tenant not found</p>
        <p className="mt-1 text-sm text-red-600">
          This account is missing a tenant record, so settings cannot be loaded.
        </p>
      </div>
    );
  }

  const cities = servedCities.map((entry) => entry.city).filter(Boolean);
  const contactName = primaryContact
    ? `${primaryContact.firstName} ${primaryContact.lastName}`.trim()
    : "Not configured";
  const website = tenant.customDomain
    ? `https://${tenant.customDomain}`
    : "Not configured";

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-accent to-brand-700 p-6 text-white shadow-lg">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
            Configuration
          </p>
          <h1 className="text-2xl font-semibold">Business Settings</h1>
          <p className="mt-1 text-sm text-brand-100">
            Live tenant configuration and readiness status
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-white">
          <CardHeader className="border-b border-brand-100">
            <h2 className="text-lg font-semibold text-accent">Business Information</h2>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Business Name
              </label>
              <p className={labelValueClass}>{tenant.name}</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Primary Contact
              </label>
              <p className={labelValueClass}>{contactName}</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Phone
              </label>
              <p className={labelValueClass}>{primaryContact?.phone || "Not configured"}</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email
              </label>
              <p className={labelValueClass}>{primaryContact?.email || "Not configured"}</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Website
              </label>
              <p className={labelValueClass}>{website}</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Brand Color
              </label>
              <div className="mt-2 flex items-center gap-3">
                <span
                  className="h-4 w-4 rounded-full border border-brand-200"
                  style={{ backgroundColor: tenant.primaryColor ?? "#0fb77a" }}
                />
                <span className="text-sm font-medium text-accent">{tenant.primaryColor ?? "#0fb77a"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="border-b border-brand-100">
            <h2 className="text-lg font-semibold text-accent">Service Area</h2>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cities with real requests on record
            </p>
            {cities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No serviced cities have been recorded yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {cities.map((city) => (
                  <span
                    key={city}
                    className="rounded-2xl border border-brand-200 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700"
                  >
                    {city}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white">
        <CardHeader className="border-b border-brand-100">
          <h2 className="text-lg font-semibold text-accent">Operating Hours</h2>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Operating hours are not stored in the current database schema yet, so this page now shows configuration status instead of fake hours.
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {DEFAULT_HOURS.map((item) => (
              <div
                key={item.day}
                className="rounded-2xl border border-brand-100 bg-brand-50 p-3"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {item.day}
                </p>
                <p className="mt-1 text-sm font-medium text-accent">
                  {item.hours}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-white">
          <CardHeader className="border-b border-brand-100">
            <h2 className="text-lg font-semibold text-accent">Notification Readiness</h2>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-accent">Email Contact On File</span>
              <span
                className={`rounded-2xl px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                  primaryContact?.email
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {primaryContact?.email ? "Ready" : "Missing"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-accent">SMS Contact On File</span>
              <span
                className={`rounded-2xl px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                  primaryContact?.phone
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {primaryContact?.phone ? "Ready" : "Missing"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-accent">Connected Integrations</span>
              <span className="rounded-2xl bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
                {integrationCount}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="border-b border-brand-100">
            <h2 className="text-lg font-semibold text-accent">Billing</h2>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Current Plan
              </label>
              <p className={labelValueClass}>{formatPlanName(tenant.plan)}</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Billing System
              </label>
              <p className={labelValueClass}>Managed outside the app</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Next Billing Date
              </label>
              <p className={labelValueClass}>Not tracked in database</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tenant Created
              </label>
              <p className={labelValueClass}>
                {new Intl.DateTimeFormat("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }).format(tenant.createdAt)}
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Timezone
              </label>
              <p className={labelValueClass}>{tenant.timezone}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-l-4 border-l-brand-500 bg-brand-50">
        <CardContent className="pt-4">
          <p className="text-sm text-accent">
            <span className="font-medium">Note:</span> This screen now reflects live tenant, contact,
            service-area, and integration data. Fields that are not modeled in the current schema are marked as
            not configured or not tracked instead of showing template content.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
