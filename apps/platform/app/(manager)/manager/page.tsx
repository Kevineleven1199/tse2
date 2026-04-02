import Link from "next/link";
import { formatCurrency } from "@/src/lib/utils";
import { getSession } from "@/src/lib/auth/session";
import { getManagerDashboardData } from "@/src/lib/admin-portal";
import {
  BarChart3, Users, CalendarDays, DollarSign, TrendingUp,
  Briefcase, Clock, AlertTriangle, Star, ArrowRight, Activity,
  UserCheck, MapPin,
} from "lucide-react";

const ManagerHome = async () => {
  const session = await getSession();
  const tenantId = session?.tenantId;
  if (!tenantId) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-400 mb-3" />
        <p className="font-semibold text-red-700">Please log out and log back in.</p>
      </div>
    );
  }

  const dashboardData = await getManagerDashboardData(tenantId);
  const ops = dashboardData.operational;
  const rev = dashboardData.revenueSnapshot;

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(date));
  };

  const quickActions = [
    { title: "Schedule", href: "/manager/schedule", icon: CalendarDays, color: "bg-brand-500" },
    { title: "Customers", href: "/manager/customers", icon: Users, color: "bg-purple-500" },
    { title: "Team", href: "/manager/team", icon: UserCheck, color: "bg-teal-500" },
    { title: "Pipeline", href: "/manager/pipeline", icon: BarChart3, color: "bg-blue-500" },
    { title: "Leads", href: "/manager/leads", icon: TrendingUp, color: "bg-amber-500" },
    { title: "Payroll", href: "/manager/payroll", icon: DollarSign, color: "bg-green-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-700 via-brand-700 to-emerald-600 p-8 text-white shadow-xl">
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.4em] text-teal-200/80">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              {session?.name?.split(" ")[0] || "Manager"}&apos;s Territory
            </h1>
            <p className="mt-1 text-sm text-teal-100/80">
              {ops?.totalJobsToday ?? 0} jobs today &bull; {ops?.activeCleaners ?? 0} cleaners active
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl bg-white/10 px-5 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Today</p>
              <p className="mt-0.5 text-xl font-bold">{formatCurrency(rev.today)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">This Week</p>
              <p className="mt-0.5 text-xl font-bold">{formatCurrency(rev.thisWeek)}</p>
            </div>
            <div className="rounded-2xl bg-white/20 px-5 py-3 backdrop-blur-sm ring-1 ring-white/30">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">MTD</p>
              <p className="mt-0.5 text-xl font-bold">{formatCurrency(rev.thisMonth)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {quickActions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-brand-100 bg-white p-3.5 text-center transition-all hover:border-brand-200 hover:shadow-lg hover:-translate-y-0.5"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.color} text-white shadow-sm transition-transform group-hover:scale-110`}>
              <action.icon className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-semibold text-accent">{action.title}</span>
          </Link>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Customers", value: String(ops?.totalCustomers ?? 0), icon: Users },
          { label: "Active Cleaners", value: String(ops?.activeCleaners ?? 0), icon: UserCheck },
          { label: "Avg Rating", value: `${(ops?.avgCleanerRating ?? 5).toFixed(1)} ★`, icon: Star },
          { label: "Jobs / Cleaner", value: (ops?.avgJobsPerCleaner ?? 0).toFixed(1), icon: Briefcase },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold text-accent">{stat.value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline + Activity */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-3xl border border-brand-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-brand-50 px-6 py-4">
            <h2 className="text-lg font-bold text-accent">Active Pipeline</h2>
            <Link href="/manager/pipeline" className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-600 hover:text-brand-700">
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
                }`}>{item.status.replace(/_/g, " ")}</span>
                <span className="shrink-0 text-sm font-bold text-accent w-20 text-right">{formatCurrency(item.amount)}</span>
              </div>
            ))}
            {dashboardData.pipeline.length === 0 && (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">No active pipeline items</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-3xl border border-brand-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-brand-50 px-6 py-4">
            <h2 className="text-lg font-bold text-accent">Recent Activity</h2>
            <Link href="/manager/activity" className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-600 hover:text-brand-700">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-brand-50">
            {dashboardData.recentActivity.slice(0, 8).map((act) => (
              <div key={act.id} className="flex items-start gap-3 px-6 py-3">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs ${
                  act.type === "payment" ? "bg-green-100 text-green-600" :
                  act.type === "booking" ? "bg-blue-100 text-blue-600" :
                  act.type === "review" ? "bg-amber-100 text-amber-600" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  {act.type === "payment" ? <DollarSign className="h-3.5 w-3.5" /> :
                   act.type === "booking" ? <CalendarDays className="h-3.5 w-3.5" /> :
                   act.type === "review" ? <Star className="h-3.5 w-3.5" /> :
                   <Activity className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-accent truncate">{act.description}</p>
                  <p className="text-[11px] text-muted-foreground">{formatTime(act.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="rounded-3xl border border-brand-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-brand-50 px-6 py-4">
          <h2 className="text-lg font-bold text-accent">My Team</h2>
          <Link href="/manager/team" className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-600 hover:text-brand-700">
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboardData.team.slice(0, 6).map((member) => (
            <div key={member.id} className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50/20 p-3.5 transition hover:bg-brand-50/40 hover:shadow-sm">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${
                member.status === "active" ? "bg-teal-500" : "bg-slate-400"
              }`}>
                {member.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-accent truncate">{member.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {(member.rating ?? 5).toFixed(1)} ★ &bull; {member.completedJobs} jobs
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
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

export default ManagerHome;
