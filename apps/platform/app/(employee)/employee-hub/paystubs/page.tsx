import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PaystubList } from "@/src/components/employee/PaystubList";

export const dynamic = "force-dynamic";

export default async function PaystubsPage() {
  const session = await requireSession();

  const isAdmin = session.role === "HQ" || session.role === "MANAGER";

  // Load cleaners list for admin paystub generation
  let cleaners: { id: string; name: string }[] = [];
  if (isAdmin) {
    const profiles = await prisma.cleanerProfile.findMany({
      where: { user: { tenantId: session.tenantId }, active: true },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    cleaners = profiles.map((p) => ({
      id: p.id,
      name: `${p.user.firstName} ${p.user.lastName}`.trim(),
    }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-accent">Earnings Statements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin
            ? "Generate and manage pay statements for all crew members."
            : "View and download your earnings history."}
        </p>
      </div>

      <PaystubList isAdmin={isAdmin} cleaners={cleaners} />
    </div>
  );
}
