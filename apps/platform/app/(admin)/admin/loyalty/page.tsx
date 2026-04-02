import { requireSession } from "@/src/lib/auth/session";
import LoyaltyClient from "./loyalty-client";

export default async function LoyaltyPage() {
  await requireSession({ roles: ["HQ"], redirectTo: "/login" });
  return <LoyaltyClient />;
}
