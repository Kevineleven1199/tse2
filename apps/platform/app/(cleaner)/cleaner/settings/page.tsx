import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { getSession, requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import StripeConnectSection from "./StripeConnectSection";

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function CleanerSettingsPage() {
  await requireSession({ roles: ["CLEANER", "HQ"], redirectTo: "/login" });
  const session = await getSession();

  const cleanerName = session?.name || "Cleaner";
  const cleanerEmail = session?.email || "Not configured";

  const cleanerProfile = session?.userId
    ? await prisma.cleanerProfile.findUnique({
        where: { userId: session.userId },
        include: {
          user: {
            select: {
              phone: true,
            },
          },
          availability: {
            orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
          },
        },
      })
    : null;

  const recentCoverage = cleanerProfile
    ? await prisma.jobAssignment.findMany({
        where: {
          cleanerId: cleanerProfile.id,
        },
        select: {
          job: {
            select: {
              request: {
                select: {
                  city: true,
                },
              },
            },
          },
        },
        take: 24,
        orderBy: {
          claimedAt: "desc",
        },
      })
    : [];

  const availableDays = new Set(
    cleanerProfile?.availability.map((slot) => dayLabels[slot.weekday] ?? String(slot.weekday)) ?? []
  );
  const availabilityWindows = cleanerProfile?.availability.length
    ? cleanerProfile.availability.map((slot) => ({
        day: dayLabels[slot.weekday] ?? `Day ${slot.weekday}`,
        hours: `${slot.startTime} - ${slot.endTime}`,
      }))
    : [];
  const coverageCities = Array.from(
    new Set(
      recentCoverage
        .map((assignment) => assignment.job.request.city)
        .filter(Boolean)
    )
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
            {cleanerName.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{cleanerName}</h1>
            <p className="text-sm text-brand-100">{cleanerEmail}</p>
            <p className="mt-1 text-xs text-brand-200">
              {cleanerProfile?.active ? "Active cleaner profile" : "Cleaner profile pending"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-semibold text-accent">Personal Information</h2>
            <p className="text-xs text-muted-foreground">Live account details on file</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl bg-brand-50 p-3">
              <div>
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="font-medium text-accent">{cleanerName}</p>
              </div>
              <span className="text-xs text-muted-foreground">From login profile</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-brand-50 p-3">
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium text-accent">{cleanerEmail}</p>
              </div>
              <span className="text-xs text-muted-foreground">From login profile</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-brand-50 p-3">
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium text-accent">{cleanerProfile?.user.phone || "Not configured"}</p>
              </div>
              <span className="text-xs text-muted-foreground">Edit via HQ</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-semibold text-accent">Availability</h2>
            <p className="text-xs text-muted-foreground">Working days pulled from your saved availability</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {dayLabels.map((day) => (
                <span
                  key={day}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    availableDays.has(day)
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {day}
                </span>
              ))}
            </div>
            {availabilityWindows.length > 0 ? (
              <div className="mt-4 space-y-2">
                {availabilityWindows.map((slot) => (
                  <div key={`${slot.day}-${slot.hours}`} className="rounded-xl border border-brand-100 bg-brand-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{slot.day}</p>
                    <p className="mt-1 text-sm font-medium text-accent">{slot.hours}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Availability has not been configured yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-semibold text-accent">Coverage</h2>
            <p className="text-xs text-muted-foreground">Service radius and recent cities from your real job history</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-brand-50 p-4">
              <p className="text-xs text-muted-foreground">Service Radius</p>
              <p className="mt-1 font-medium text-accent">
                {cleanerProfile ? `${cleanerProfile.serviceRadius} miles` : "Not configured"}
              </p>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recent Cities Served
              </p>
              {coverageCities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No completed or claimed cities are on record yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {coverageCities.map((city) => (
                    <span
                      key={city}
                      className="rounded-2xl border border-brand-200 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700"
                    >
                      {city}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-semibold text-accent">Work Profile</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-brand-100 p-3">
              <p className="text-xs text-muted-foreground">Hourly Rate</p>
              <p className="mt-1 font-medium text-accent">
                {cleanerProfile ? `$${cleanerProfile.hourlyRate.toFixed(2)}` : "Not configured"}
              </p>
            </div>
            <div className="rounded-2xl border border-brand-100 p-3">
              <p className="text-xs text-muted-foreground">Completed Jobs</p>
              <p className="mt-1 font-medium text-accent">
                {cleanerProfile?.completedJobs ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-brand-100 p-3">
              <p className="text-xs text-muted-foreground">Rating</p>
              <p className="mt-1 font-medium text-accent">
                {cleanerProfile ? cleanerProfile.rating.toFixed(1) : "Not configured"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-semibold text-accent">Payout Settings</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-brand-50 p-4">
              <p className="text-xs text-muted-foreground">Payout Method</p>
              <p className="mt-1 font-medium text-accent">
                {cleanerProfile?.payoutMethod || "Not configured"}
              </p>
            </div>
            <div className="rounded-2xl bg-brand-50 p-4">
              <p className="text-xs text-muted-foreground">Payout Schedule</p>
              <p className="mt-1 font-medium text-accent">Not tracked in the current schema</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Banking account details are intentionally not stored or shown in this app.
            </p>

            <StripeConnectSection
              initialConnected={Boolean(cleanerProfile?.stripeAccountId)}
            />
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-semibold text-accent">Notifications</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Email Reachable", enabled: Boolean(session?.email) },
                { label: "SMS Reachable", enabled: Boolean(cleanerProfile?.user.phone) },
                { label: "Preference Center", enabled: false, note: "Not tracked yet" },
              ].map((pref) => (
                <div key={pref.label} className="flex items-center justify-between rounded-xl border border-brand-50 p-3">
                  <div>
                    <span className="text-sm font-medium text-accent">{pref.label}</span>
                    {pref.note && (
                      <p className="text-xs text-muted-foreground">{pref.note}</p>
                    )}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    pref.enabled
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}>
                    {pref.enabled ? "Ready" : "Off"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
