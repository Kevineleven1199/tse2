import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PayrollDashboard } from "@/src/components/employee/PayrollDashboard";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ManagerPayrollPage() {
  const session = await getSession();

  if (
    !session ||
    (session.role !== "MANAGER" && session.role !== "HQ")
  ) {
    return (
      <div className="space-y-6">
        <Card className="bg-white">
          <CardHeader>
            <h1 className="text-2xl font-semibold text-accent">Payroll</h1>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You do not have permission to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  try {
    // Get all active cleaners
    const profiles = await prisma.cleanerProfile.findMany({
      where: { active: true, user: { tenantId: session.tenantId } },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { user: { firstName: "asc" } },
    });

    const cleaners = profiles.map((p) => ({
      id: p.id,
      name: `${p.user.firstName} ${p.user.lastName}`,
      hourlyRate: p.hourlyRate,
    }));

    return (
      <div className="space-y-6">
        <Card className="bg-white">
          <CardHeader className="space-y-3">
            <h1 className="text-2xl font-semibold text-accent">Payroll</h1>
            <p className="text-sm text-muted-foreground">
              Manage timesheets, hours, and payments for your team
            </p>
          </CardHeader>
        </Card>

        <PayrollDashboard
          isAdmin={true}
          cleaners={cleaners}
          currentUserId={session.userId}
        />
      </div>
    );
  } catch (error) {
    console.error("Failed to load payroll data:", error);
    return (
      <div className="space-y-6">
        <Card className="bg-white">
          <CardHeader>
            <h1 className="text-2xl font-semibold text-accent">Payroll</h1>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Error loading payroll data. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
}
