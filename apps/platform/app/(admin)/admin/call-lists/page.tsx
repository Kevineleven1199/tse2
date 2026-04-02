import { requireSession } from "@/src/lib/auth/session";
import CallListClient from "./call-list-client";

export default async function AdminCallListsPage() {
  const session = await requireSession({ roles: ["HQ"], redirectTo: "/login" });
  return <CallListClient userId={session.userId} userName={session.name} />;
}
