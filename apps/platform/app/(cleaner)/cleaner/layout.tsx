import { requireSession } from "@/src/lib/auth/session";
import { PortalHeader, type PortalNavItem } from "@/src/components/portal/PortalHeader";
import { PortalFooter } from "@/src/components/portal/PortalFooter";
import { PortalBottomNav, type BottomNavItem } from "@/src/components/portal/PortalBottomNav";
import ImpersonationBanner from "@/src/components/admin/ImpersonationBanner";

type CleanerLayoutProps = {
  children: React.ReactNode;
};

const navItems: PortalNavItem[] = [
  { label: "Home", href: "/cleaner", match: "exact" },
  { label: "Schedule", href: "/cleaner/schedule" },
  { label: "Jobs", href: "/cleaner/jobs" },
  {
    label: "Pay",
    href: "/cleaner/paystubs",
    children: [
      { label: "Pay Center", href: "/cleaner/paystubs" },
      { label: "Payouts", href: "/cleaner/payouts" },
    ],
  },
  {
    label: "More",
    href: "/cleaner/settings",
    children: [
      { label: "Documents", href: "/employee-hub/documents" },
      { label: "Referrals", href: "/cleaner/referrals" },
      { label: "Pipeline", href: "/cleaner/pipeline" },
      { label: "Availability", href: "/cleaner/availability" },
      { label: "Settings", href: "/cleaner/settings" },
    ],
  },
];

const bottomNavItems: BottomNavItem[] = [
  { label: "Home", href: "/cleaner", icon: "home", match: "exact" },
  { label: "Schedule", href: "/cleaner/schedule", icon: "schedule" },
  { label: "Jobs", href: "/cleaner/jobs", icon: "jobs" },
  { label: "Pay", href: "/cleaner/paystubs", icon: "payroll" },
];

const CleanerLayout = async ({ children }: CleanerLayoutProps) => {
  const session = await requireSession({ roles: ["CLEANER", "HQ"], redirectTo: "/cleaner" });

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <ImpersonationBanner />
      <PortalHeader
        brand="TriState Crew Hub"
        navItems={navItems}
        userName={session.name}
        portalRoot="/cleaner"
      />
      <main className="section-wrapper flex-1 py-8 md:py-12">{children}</main>
      <PortalFooter />
      <PortalBottomNav items={bottomNavItems} />
    </div>
  );
};

export default CleanerLayout;
