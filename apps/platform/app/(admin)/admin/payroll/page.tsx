import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PayrollDashboard } from "@/src/components/employee/PayrollDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPayrollPage() {
  const session = await requireSession({ roles: ["HQ"], redirectTo: "/login" });

  try {
    // Get all active cleaners for admin view
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
      <PayrollDashboard
        isAdmin={true}
        cleaners={cleaners}
        currentUserId={session.userId}
      />
    );
  } catch (error) {
    console.error("Failed to load payroll data:", error);
    return (
      <div className="space-y-6 px-6 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-900">Error Loading Payroll</h2>
          <p className="mt-2 text-sm text-red-700">
            Failed to load payroll data. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}
