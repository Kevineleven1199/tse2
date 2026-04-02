import { requireSession } from "@/src/lib/auth/session";
import { PortalHeader, type PortalNavItem } from "@/src/components/portal/PortalHeader";
import { PortalFooter } from "@/src/components/portal/PortalFooter";
import { PortalBottomNav, type BottomNavItem } from "@/src/components/portal/PortalBottomNav";
import ImpersonationBanner from "@/src/components/admin/ImpersonationBanner";
import { AdminHeaderBar } from "@/src/components/admin/AdminHeaderBar";

type AdminLayoutProps = {
  children: React.ReactNode;
};

const navItems: PortalNavItem[] = [
  {
    label: "Operations",
    href: "/admin",
    match: "exact",
    children: [
      { label: "Dashboard", href: "/admin", match: "exact" },
      { label: "Estimates", href: "/admin/estimates" },
      { label: "Unassigned Jobs", href: "/admin/unassigned" },
      { label: "Schedule", href: "/admin/schedule" },
      { label: "Recurring", href: "/admin/recurring" },
      { label: "Team", href: "/admin/team" },
      { label: "Teams", href: "/admin/teams" },
      { label: "Locations", href: "/admin/locations" },
      { label: "Routes", href: "/admin/routes" },
      { label: "Inventory", href: "/admin/inventory" },
      { label: "Approvals", href: "/admin/approvals" },
    ],
  },
  {
    label: "Sales",
    href: "/admin/pipeline",
    children: [
      { label: "CRM", href: "/admin/crm" },
      { label: "Pipeline", href: "/admin/pipeline" },
      { label: "Leads", href: "/admin/leads" },
      { label: "Prospects", href: "/admin/prospects" },
      { label: "Call Lists", href: "/admin/call-lists" },
      { label: "Import", href: "/admin/import" },
      { label: "Coupons", href: "/admin/coupons" },
      { label: "Campaigns", href: "/admin/campaigns" },
      { label: "Gift Cards", href: "/admin/gift-cards" },
      { label: "Reviews", href: "/admin/google-reviews" },
      { label: "Referrals", href: "/admin/referrals" },
      { label: "Loyalty", href: "/admin/loyalty" },
    ],
  },
  {
    label: "Finance",
    href: "/admin/payroll",
    children: [
      { label: "Payroll", href: "/admin/payroll" },
      { label: "P&L", href: "/admin/pnl" },
      { label: "Invoices", href: "/admin/invoices" },
      { label: "Job Costing", href: "/admin/job-costing" },
      { label: "Refunds", href: "/admin/refunds" },
      { label: "Expenses", href: "/admin/expenses" },
      { label: "Signatures", href: "/admin/signatures" },
    ],
  },
  {
    label: "Tools",
    href: "/admin/todos",
    children: [
      { label: "To-Dos", href: "/admin/todos" },
      { label: "Calls", href: "/admin/transcripts" },
      { label: "Messages", href: "/admin/messages" },
      { label: "Activity", href: "/admin/activity" },
      { label: "Automations", href: "/admin/automations" },
      { label: "Workflow Map", href: "/admin/workflow" },
      { label: "Insights", href: "/admin/insights" },
      { label: "Leaderboard", href: "/admin/leaderboard" },
      { label: "Achievements", href: "/admin/achievements" },
      { label: "Integrations", href: "/admin/integrations" },
      { label: "Switch User", href: "/admin/impersonate" },
    ],
  },
  {
    label: "Settings",
    href: "/admin/settings",
    children: [
      { label: "Settings", href: "/admin/settings" },
      { label: "Users & Roles", href: "/admin/team" },
      { label: "API & Webhooks", href: "/admin/settings/api-webhooks" },
      { label: "Custom Fields", href: "/admin/settings/custom-fields" },
    ],
  },
];

const bottomNavItems: BottomNavItem[] = [
  { label: "Home", href: "/admin", icon: "dashboard", match: "exact" },
  { label: "Pipeline", href: "/admin/pipeline", icon: "pipeline" },
  { label: "Team", href: "/admin/team", icon: "team" },
  { label: "Todos", href: "/admin/todos", icon: "todos" },
];

const AdminLayout = async ({ children }: AdminLayoutProps) => {
  const session = await requireSession({ roles: ["HQ"], redirectTo: "/admin" });

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <ImpersonationBanner />
      <PortalHeader
        brand="TriState Admin"
        navItems={navItems}
        userName={session.name}
        portalRoot="/admin"
      />
      <main className="section-wrapper flex-1 py-8">
        <AdminHeaderBar userName={session.name} />
        {children}
      </main>
      <PortalFooter />
      <PortalBottomNav items={bottomNavItems} />
    </div>
  );
};

export default AdminLayout;
