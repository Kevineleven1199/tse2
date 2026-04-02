import { requireSession } from "@/src/lib/auth/session";
import InsightsClient from "./insights-client";

export default async function InsightsPage() {
  await requireSession({ roles: ["HQ"], redirectTo: "/login" });
  return <InsightsClient />;
}
