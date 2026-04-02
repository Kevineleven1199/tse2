import { requireSession } from "@/src/lib/auth/session";
import LeadsPageClient from "./leads-client";

export default async function AdminLeadsPage() {
  const session = await requireSession({ roles: ["HQ"], redirectTo: "/login" });
  return <LeadsPageClient userId={session.userId} userName={session.name} role="HQ" />;
}
