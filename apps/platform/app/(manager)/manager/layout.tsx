import { requireSession } from "@/src/lib/auth/session";
import { PortalHeader, type PortalNavItem } from "@/src/components/portal/PortalHeader";
import { PortalFooter } from "@/src/components/portal/PortalFooter";
import { PortalBottomNav, type BottomNavItem } from "@/src/components/portal/PortalBottomNav";
import ImpersonationBanner from "@/src/components/admin/ImpersonationBanner";

type ManagerLayoutProps = {
  children: React.ReactNode;
};

const navItems: PortalNavItem[] = [
  {
    label: "Operations",
    href: "/manager",
    match: "exact",
    children: [
      { label: "Dashboard", href: "/manager", match: "exact" },
      { label: "Schedule", href: "/manager/schedule" },
      { label: "Team Members", href: "/manager/team" },
      { label: "Inventory", href: "/manager/inventory" },
    ],
  },
  {
    label: "Sales",
    href: "/manager/pipeline",
    children: [
      { label: "Pipeline", href: "/manager/pipeline" },
      { label: "Leads", href: "/manager/leads" },
      { label: "CRM Contacts", href: "/manager/contacts" },
      { label: "Call Lists", href: "/manager/call-lists" },
    ],
  },
  {
    label: "Tools",
    href: "/manager/todos",
    children: [
      { label: "To-Dos", href: "/manager/todos" },
      { label: "Calls", href: "/manager/transcripts" },
      { label: "Activity", href: "/manager/activity" },
      { label: "Integrations", href: "/manager/integrations" },
    ],
  },
];

const bottomNavItems: BottomNavItem[] = [
  { label: "Home", href: "/manager", icon: "dashboard", match: "exact" },
  { label: "Pipeline", href: "/manager/pipeline", icon: "pipeline" },
  { label: "Team", href: "/manager/team", icon: "team" },
  { label: "Todos", href: "/manager/todos", icon: "todos" },
];

const ManagerLayout = async ({ children }: ManagerLayoutProps) => {
  const session = await requireSession({ roles: ["MANAGER", "HQ"], redirectTo: "/manager" });

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <ImpersonationBanner />
      <PortalHeader brand="TriState Manager" navItems={navItems} userName={session.name} portalRoot="/manager" />
      <main className="section-wrapper flex-1 py-12">{children}</main>
      <PortalFooter />
      <PortalBottomNav items={bottomNavItems} />
    </div>
  );
};

export default ManagerLayout;
