import { requireSession } from "@/src/lib/auth/session";
import LeadsPageClient from "@/app/(admin)/admin/leads/leads-client";

export default async function ManagerLeadsPage() {
  const session = await requireSession({ roles: ["MANAGER", "HQ"], redirectTo: "/login" });
  return <LeadsPageClient userId={session.userId} userName={session.name} role="MANAGER" />;
}
