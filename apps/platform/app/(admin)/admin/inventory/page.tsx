import { requireSession } from "@/src/lib/auth/session";
import InventoryDashboard from "@/src/components/admin/InventoryDashboard";

export default async function InventoryPage() {
  await requireSession({ roles: ["HQ"], redirectTo: "/login" });

  return <InventoryDashboard />;
}
