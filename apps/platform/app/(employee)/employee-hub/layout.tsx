import { requireSession } from "@/src/lib/auth/session";
import { PortalHeader, type PortalNavItem } from "@/src/components/portal/PortalHeader";
import { PortalFooter } from "@/src/components/portal/PortalFooter";
import { PortalBottomNav, type BottomNavItem } from "@/src/components/portal/PortalBottomNav";
import ImpersonationBanner from "@/src/components/admin/ImpersonationBanner";

type EmployeeLayoutProps = {
  children: React.ReactNode;
};

const navItems: PortalNavItem[] = [
  { label: "Feed", href: "/employee-hub", match: "exact" },
  { label: "Open Jobs", href: "/employee-hub/jobs" },
  { label: "My Schedule", href: "/employee-hub/schedule" },
  {
    label: "Pay",
    href: "/employee-hub/payroll",
    children: [
      { label: "Payroll", href: "/employee-hub/payroll" },
      { label: "Paystubs", href: "/employee-hub/paystubs" },
      { label: "Payouts", href: "/employee-hub/payouts" },
    ],
  },
  { label: "Documents", href: "/employee-hub/documents" },
];

const bottomNavItems: BottomNavItem[] = [
  { label: "Home", href: "/employee-hub", icon: "home", match: "exact" },
  { label: "Jobs", href: "/employee-hub/jobs", icon: "jobs" },
  { label: "Schedule", href: "/employee-hub/schedule", icon: "schedule" },
  { label: "Pay", href: "/employee-hub/payroll", icon: "payroll" },
];

const EmployeeLayout = async ({ children }: EmployeeLayoutProps) => {
  const session = await requireSession({
    roles: ["CLEANER", "HQ", "MANAGER"],
    redirectTo: "/employee-hub",
  });

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <ImpersonationBanner />
      <PortalHeader
        brand="Crew Hub"
        navItems={navItems}
        userName={session.name}
        portalRoot="/employee-hub"
      />
      <main className="section-wrapper flex-1 py-12">{children}</main>
      <PortalFooter />
      <PortalBottomNav items={bottomNavItems} />
    </div>
  );
};

export default EmployeeLayout;
