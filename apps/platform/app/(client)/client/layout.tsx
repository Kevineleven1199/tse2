import { requireSession } from "@/src/lib/auth/session";
import { PortalHeader, type PortalNavItem } from "@/src/components/portal/PortalHeader";
import { PortalFooter } from "@/src/components/portal/PortalFooter";
import { PortalBottomNav, type BottomNavItem } from "@/src/components/portal/PortalBottomNav";
import ImpersonationBanner from "@/src/components/admin/ImpersonationBanner";

type ClientLayoutProps = {
  children: React.ReactNode;
};

const navItems: PortalNavItem[] = [
  { label: "Overview", href: "/client", match: "exact" },
  { label: "Upcoming Visits", href: "/client/visits" },
  { label: "Quotes", href: "/client/quotes" },
  { label: "Billing", href: "/client/billing" },
  { label: "Reschedule", href: "/client/reschedule" },
  { label: "Referrals", href: "/client/referrals" },
  { label: "Feedback", href: "/client/feedback" },
  { label: "Settings", href: "/client/settings" }
];

const bottomNavItems: BottomNavItem[] = [
  { label: "Home", href: "/client", icon: "dashboard", match: "exact" },
  { label: "Book", href: "/get-a-quote", icon: "schedule" },
  { label: "Visits", href: "/client/visits", icon: "calls" },
];

const ClientLayout = async ({ children }: ClientLayoutProps) => {
  const session = await requireSession({ roles: ["CUSTOMER", "HQ"], redirectTo: "/login" });

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <ImpersonationBanner />
      <PortalHeader brand="TriState Client Hub" navItems={navItems} userName={session.name} portalRoot="/client" />
      <main className="section-wrapper flex-1 py-12">{children}</main>
      <PortalFooter />
      <PortalBottomNav items={bottomNavItems} />
    </div>
  );
};

export default ClientLayout;
