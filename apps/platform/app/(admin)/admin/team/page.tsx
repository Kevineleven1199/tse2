import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { TeamManagement } from "@/src/components/admin/TeamManagement";

export default async function AdminTeamPage() {
  const session = await requireSession({ roles: ["HQ"], redirectTo: "/login" });

  try {
    const cleaners = await prisma.user.findMany({
      where: { role: "CLEANER", tenantId: session.tenantId },
      include: {
        cleaner: {
          include: {
            payouts: {
              select: { amount: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const cleanerData = cleaners.map((user) => {
      const profile = user.cleaner;
      const totalEarnings = profile?.payouts?.reduce((sum, p) => sum + p.amount, 0) ?? 0;

      return {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        phone: user.phone || undefined,
        hourlyRate: profile?.hourlyRate ?? 0,
        rating: profile?.rating ?? 5.0,
        completedJobs: profile?.completedJobs ?? 0,
        totalEarnings,
        status: user.status === "reset_requested" ? ("reset_requested" as const) : profile?.active ? ("active" as const) : ("inactive" as const),
        meta: `Rating: ${(profile?.rating ?? 5.0).toFixed(1)} | Jobs: ${profile?.completedJobs ?? 0} | Earnings: $${totalEarnings.toFixed(2)}`,
        createdAt: new Date(user.createdAt).toLocaleDateString(),
      };
    });

    const managers = await prisma.user.findMany({
      where: { role: { in: ["HQ", "MANAGER"] }, tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
    });

    const managerData = managers.map((manager) => ({
      id: manager.id,
      name: `${manager.firstName} ${manager.lastName}`.trim(),
      email: manager.email,
      phone: manager.phone || undefined,
      role: manager.role,
      meta: `${manager.role === "MANAGER" ? "Manager" : "HQ Admin"} · Joined ${new Date(manager.createdAt).toLocaleDateString()}`,
      createdAt: new Date(manager.createdAt).toLocaleDateString(),
      status: manager.status === "reset_requested" ? ("reset_requested" as const) : ("active" as const),
    }));

    return (
      <div className="space-y-6">
        <Card className="bg-white">
          <CardHeader className="space-y-3">
            <h1 className="text-2xl font-semibold text-accent">
              Team Management
            </h1>
            <p className="text-sm text-muted-foreground">
              View and manage your team members. Cleaners can see their assigned jobs
              and earnings. HQ managers have full platform access.
            </p>
          </CardHeader>
        </Card>

        <TeamManagement initialCleaners={cleanerData} initialManagers={managerData} />
      </div>
    );
  } catch (error) {
    console.error("Failed to fetch team data:", error);
    return (
      <div className="space-y-6">
        <Card className="bg-white">
          <CardHeader className="space-y-3">
            <h1 className="text-2xl font-semibold text-accent">
              Team Management
            </h1>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Error loading team data. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
}
