import Link from "next/link";
import { formatCurrency } from "@/src/lib/utils";
import { getSession } from "@/src/lib/auth/session";
import { getAdminDashboardData, canAccessFinancials } from "@/src/lib/admin-portal";
import {
  BarChart3, Users, CalendarDays, DollarSign, TrendingUp, TrendingDown,
  Briefcase, Clock, AlertTriangle, Star, ArrowRight, Zap, Settings, Link2,
  UserPlus, LayoutGrid, Receipt, ShieldCheck, Activity,
} from "lucide-react";

const AdminHome = async () => {
  const session = await getSession();
  const userRole = session?.role || "HQ";
  const tenantId = session?.tenantId;
  if (!tenantId) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-400 mb-3" />
        <p className="font-semibold text-red-700">Configuration Error</p>
        <p className="mt-1 text-sm text-red-600">No tenant ID found. Please log out and log back in.</p>
      </div>
    );
  }

  let dashboardData;
  try {
    dashboardData = await getAdminDashboardData(tenantId);
  } catch (error) {
    console.error("[AdminHome] Failed to fetch dashboard data:", error);
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-400 mb-3" />
        <p className="font-semibold text-red-700">Unable to load dashboard</p>
        <p className="mt-1 text-sm text-red-600">Please try refreshing the page.</p>
      </div>
    );
  }

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(date));
  };

  const fin = dashboardData.financials;
  const ops = dashboardData.operational;
  const showFinancials = canAccessFinancials(userRole) && fin;

  const quickActions = [
    { title: "Pipeline", href: "/admin/pipeline", icon: BarChart3, color: "bg-blue-500" },
    { title: "Schedule", href: "/admin/schedule", icon: CalendarDays, color: "bg-brand-500" },
    { title: "Customers", href: "/admin/customers", icon: Users, color: "bg-purple-500" },
    { title: "Invoices", href: "/admin/invoices", icon: Receipt, color: "bg-amber-500" },
    { title: "Team", href: "/admin/team", icon: UserPlus, color: "bg-teal-500" },
    { title: "Insights", href: "/admin/insights", icon: TrendingUp, color: "bg-indigo-500" },
    { title: "Integrations", href: "/admin/settings/api-webhooks", icon: Link2, color: "bg-pink-500" },
    { title: "Settings", href: "/admin/settings", icon: Settings, color: "bg-slate-500" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-700 to-emerald-600 p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djJoLTJ2LTJoMnptMC00djJoLTJ2LTJoMnptLTQgOHYyaC0ydi0yaDJ6bTAgNHYyaC0ydi0yaDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.4em] text-brand-200/80">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Welcome back, {session?.name?.split(" ")[0] || "Admin"}
            </h1>
            <p className="mt-1 text-sm text-brand-100/80">
              {ops?.totalJobsToday ?? 0} jobs today &bull; {ops?.pendingJobs ?? 0} pending
            </p>
          </div>

          {showFinancials && (
            <div className="flex gap-3">
              <MetricPill label="Today" value={formatCurrency(fin.revenue.today)} />
              <MetricPill label="This Week" value={formatCurrency(fin.revenue.thisWeek)} />
              <MetricPill label="YTD" value={formatCurrency(fin.revenue.thisYear)} accent />
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions Grid ── */}
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
        {quickActions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-brand-100 bg-white p-3 text-center transition-all hover:border-brand-200 hover:shadow-lg hover:-translate-y-0.5"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.color} text-white shadow-sm transition-transform group-hover:scale-110`}>
              <action.icon className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-semibold text-accent">{action.title}</span>
          </Link>
        ))}
      </div>

      {/* ── KPI Cards Row ── */}
      {showFinancials && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={DollarSign}
            iconBg="bg-green-100 text-green-600"
            label="Total Revenue"
            value={formatCurrency(fin.revenue.thisMonth)}
            sub="this month"
            change={fin.revenue.mtdGrowth ?? undefined}
          />
          <KpiCard
            icon={TrendingUp}
            iconBg="bg-blue-100 text-blue-600"
            label="Gross Profit"
            value={formatCurrency(fin.grossProfit)}
            sub={`${fin.grossMargin?.toFixed(0) ?? 0}% margin`}
          />
          <KpiCard
            icon={ShieldCheck}
            iconBg="bg-emerald-100 text-emerald-600"
            label="Net Profit"
            value={formatCurrency(fin.netProfit)}
            sub={`${fin.netMargin?.toFixed(0) ?? 0}% margin`}
          />
          <KpiCard
            icon={TrendingUp}
            iconBg="bg-purple-100 text-purple-600"
            label="Year End Forecast"
            value={formatCurrency(fin.projectedYearEnd ?? 0)}
            sub="projected"
          />
        </div>
      )}

      {/* ── Operational Metrics ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Customers" value={String(ops?.totalCustomers ?? 0)} icon={Users} />
        <StatCard label="Active Cleaners" value={String(ops?.activeCleaners ?? 0)} icon={UserPlus} />
        <StatCard label="Avg Rating" value={`${(ops?.avgCleanerRating ?? 5.0).toFixed(1)} ★`} icon={Star} />
        <StatCard label="Jobs / Cleaner" value={(ops?.avgJobsPerCleaner ?? 0).toFixed(1)} icon={Briefcase} />
        <StatCard label="Utilization" value={`${ops?.cleanerUtilization ?? 0}%`} icon={Activity} />
      </div>

      {/* ── Pipeline + Activity ── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Pipeline (wider) */}
        <div className="lg:col-span-3 rounded-3xl border border-brand-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-brand-50 px-6 py-4">
            <h2 className="text-lg font-bold text-accent">Active Pipeline</h2>
            <Link href="/admin/pipeline" className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-600 hover:text-brand-700">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-brand-50">
            {dashboardData.pipeline.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-6 py-3.5 transition hover:bg-brand-50/40">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {item.isUrgent && <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                    <span className="font-semibold text-sm text-accent truncate">{item.customerName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.service} &bull; {item.city}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  item.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                  item.status === "SCHEDULED" ? "bg-brand-100 text-brand-700" :
                  item.status === "PENDING_ASSIGNMENT" ? "bg-amber-100 text-amber-700" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  {item.status.replace(/_/g, " ")}
                </span>
                <span className="shrink-0 text-sm font-bold text-accent w-20 text-right">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
            {dashboardData.pipeline.length === 0 && (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">No active pipeline items</div>
            )}
          </div>
        </div>

        {/* Recent Activity (narrower) */}
        <div className="lg:col-span-2 rounded-3xl border border-brand-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-brand-50 px-6 py-4">
            <h2 className="text-lg font-bold text-accent">Recent Activity</h2>
            <Link href="/admin/activity" className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-600 hover:text-brand-700">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-brand-50">
            {dashboardData.recentActivity.slice(0, 8).map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 px-6 py-3">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs ${
                  activity.type === "payment" ? "bg-green-100 text-green-600" :
                  activity.type === "booking" ? "bg-blue-100 text-blue-600" :
                  activity.type === "review" ? "bg-amber-100 text-amber-600" :
                  activity.type === "cancellation" ? "bg-red-100 text-red-600" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  {activity.type === "payment" ? <DollarSign className="h-3.5 w-3.5" /> :
                   activity.type === "booking" ? <CalendarDays className="h-3.5 w-3.5" /> :
                   activity.type === "review" ? <Star className="h-3.5 w-3.5" /> :
                   activity.type === "cancellation" ? <AlertTriangle className="h-3.5 w-3.5" /> :
                   <Activity className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-accent truncate">{activity.description}</p>
                  <p className="text-[11px] text-muted-foreground">{formatTime(activity.timestamp)}</p>
                </div>
              </div>
            ))}
            {dashboardData.recentActivity.length === 0 && (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">No recent activity</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Team Overview ── */}
      <div className="rounded-3xl border border-brand-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-brand-50 px-6 py-4">
          <h2 className="text-lg font-bold text-accent">Team</h2>
          <Link href="/admin/team" className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-600 hover:text-brand-700">
            Manage <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboardData.team.slice(0, 6).map((member) => (
            <div key={member.id} className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50/20 p-3.5 transition hover:bg-brand-50/40 hover:shadow-sm">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${
                member.status === "active" ? "bg-brand-500" : "bg-slate-400"
              }`}>
                {member.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-accent truncate">{member.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {member.role} &bull; {(member.rating ?? 5).toFixed(1)} ★ &bull; {member.completedJobs} jobs
                </p>
              </div>
              {showFinancials && (
                <span className="text-xs font-bold text-brand-600">{formatCurrency(member.earnings)}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Alerts ── */}
      {dashboardData.alerts.length > 0 && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold text-amber-800 mb-3">
            <AlertTriangle className="h-4 w-4" /> Alerts
          </h3>
          <div className="space-y-2">
            {dashboardData.alerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-amber-700">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                {alert.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Sub-components ──

function MetricPill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl px-5 py-3 backdrop-blur-sm ${accent ? "bg-white/20 ring-1 ring-white/30" : "bg-white/10"}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">{label}</p>
      <p className="mt-0.5 text-xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function KpiCard({ icon: Icon, iconBg, label, value, sub, change }: {
  icon: typeof DollarSign; iconBg: string; label: string; value: string; sub: string; change?: number;
}) {
  return (
    <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
        {change !== undefined && change !== 0 && (
          <span className={`flex items-center gap-0.5 text-xs font-bold ${change >= 0 ? "text-green-600" : "text-red-500"}`}>
            {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {change >= 0 ? "+" : ""}{change.toFixed(0)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-accent tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{label}</p>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Users }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-lg font-bold text-accent">{value}</p>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default AdminHome;
