import { requireSession } from "@/src/lib/auth/session";
import TodosPageClient from "@/src/components/portal/TodosPageClient";

export default async function ManagerTodosPage() {
  const session = await requireSession({ roles: ["MANAGER", "HQ"], redirectTo: "/login" });
  return <TodosPageClient userId={session.userId} userName={session.name} role="MANAGER" />;
}
