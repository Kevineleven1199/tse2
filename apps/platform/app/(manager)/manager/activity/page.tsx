import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { ActivityFeed, ActivityStats } from "@/src/components/admin";
import { getActivities, getActivitySummary } from "@/src/lib/activity-tracking";
import { requireSession } from "@/src/lib/auth/session";

export default async function ManagerActivityPage() {
  await requireSession({ roles: ["MANAGER", "HQ"], redirectTo: "/manager" });

  let activities;
  let summary;
  try {
    [activities, summary] = await Promise.all([
      getActivities({ limit: 100 }),
      getActivitySummary(),
    ]);
  } catch (error) {
    console.error("[manager/activity] Failed to fetch activity data:", error);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-accent">Activity Tracking</h1>
          <p className="mt-1 text-sm text-muted-foreground">Monitor customer and cleaner engagement.</p>
        </div>
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-semibold text-red-700">Unable to load activity data</p>
          <p className="mt-1 text-sm text-red-600">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  const stats = {
    totalViews:
      (summary.byType.invoice_viewed || 0) +
      (summary.byType.quote_viewed || 0) +
      (summary.byType.job_details_viewed || 0),
    uniqueViewers: summary.byActor.length,
    lastViewedAt: summary.lastActivityAt,
    emailOpens: summary.byType.email_opened || 0,
    portalLogins: summary.byType.portal_login || 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-accent">Activity Tracking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor customer and cleaner engagement across invoices, quotes, emails, and portals.
        </p>
      </div>

      <Card className="bg-white">
        <CardHeader className="pb-2">
          <h2 className="text-lg font-semibold text-accent">Engagement Overview</h2>
        </CardHeader>
        <CardContent>
          <ActivityStats stats={stats} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityFeed activities={activities} title="All Activity" showFilters={true} />
        </div>

        <div className="space-y-4">
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <h2 className="text-lg font-semibold text-accent">Most Active Users</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary.byActor.slice(0, 5).map((actor: { actorId: string; actorName: string; count: number }, index: number) => (
                  <div key={actor.actorId} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-accent">{actor.actorName}</p>
                      <p className="text-xs text-muted-foreground">{actor.count} activities</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader className="pb-2">
              <h2 className="text-lg font-semibold text-accent">Activity Breakdown</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(summary.byType)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 8)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground capitalize">
                        {type.replace(/_/g, " ")}
                      </span>
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
                        {count as number}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
