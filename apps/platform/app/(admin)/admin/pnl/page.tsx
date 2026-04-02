import { requireSession } from "@/src/lib/auth/session";
import { redirect } from "next/navigation";
import { PnLDashboard } from "@/src/components/admin/PnLDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPnLPage() {
  const session = await requireSession();

  if (session.role !== "HQ") {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-accent">Profit & Loss</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track revenue, expenses, and profitability — your QuickBooks replacement.
        </p>
      </div>
      <PnLDashboard />
    </div>
  );
}
