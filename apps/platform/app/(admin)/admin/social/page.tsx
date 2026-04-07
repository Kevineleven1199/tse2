import { requireSession } from "@/src/lib/auth/session";
import { SocialClient } from "./social-client";

export default async function SocialPage() {
  const session = await requireSession({ roles: ["HQ", "MANAGER"], redirectTo: "/login" });
  return <SocialClient />;
}
