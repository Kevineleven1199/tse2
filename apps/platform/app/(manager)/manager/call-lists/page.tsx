import { requireSession } from "@/src/lib/auth/session";
import CallListClient from "@/app/(admin)/admin/call-lists/call-list-client";

export default async function ManagerCallListsPage() {
  const session = await requireSession({ roles: ["MANAGER", "HQ"], redirectTo: "/login" });
  return <CallListClient userId={session.userId} userName={session.name} />;
}
