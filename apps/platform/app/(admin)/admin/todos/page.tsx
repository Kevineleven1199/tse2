import { requireSession } from "@/src/lib/auth/session";
import TodosPageClient from "@/src/components/portal/TodosPageClient";

export default async function AdminTodosPage() {
  const session = await requireSession({ roles: ["HQ"], redirectTo: "/login" });
  return <TodosPageClient userId={session.userId} userName={session.name} role="HQ" />;
}
