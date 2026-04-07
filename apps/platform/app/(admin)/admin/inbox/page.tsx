import { requireSession } from "@/src/lib/auth/session";
import { InboxClient } from "./inbox-client";

export default async function InboxPage() {
  const session = await requireSession({ roles: ["HQ", "MANAGER"], redirectTo: "/login" });
  return <InboxClient userId={session.userId} />;
}
