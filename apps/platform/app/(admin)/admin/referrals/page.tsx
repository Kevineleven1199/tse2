import { requireSession } from "@/src/lib/auth/session";
import ReferralsClient from "./referrals-client";

export default async function ReferralsPage() {
  await requireSession({ roles: ["HQ"], redirectTo: "/login" });
  return <ReferralsClient />;
}
