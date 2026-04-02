import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PayrollDashboard } from "@/src/components/employee/PayrollDashboard";

export const dynamic = "force-dynamic";

const PayrollPage = async () => {
  const session = await getSession();
  const isAdmin = session?.role === "HQ" || session?.role === "MANAGER";

  // Get all active cleaners for admin view
  let cleaners: { id: string; name: string; hourlyRate: number }[] = [];

  if (isAdmin) {
    const profiles = await prisma.cleanerProfile.findMany({
      where: { active: true, user: { tenantId: session.tenantId } },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { user: { firstName: "asc" } },
    });
    cleaners = profiles.map((p) => ({
      id: p.id,
      name: `${p.user.firstName} ${p.user.lastName}`,
      hourlyRate: p.hourlyRate,
    }));
  } else if (session) {
    // CLEANER — just their own profile
    const profile = await prisma.cleanerProfile.findUnique({
      where: { userId: session.userId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    if (profile) {
      cleaners = [{
        id: profile.id,
        name: `${profile.user.firstName} ${profile.user.lastName}`,
        hourlyRate: profile.hourlyRate,
      }];
    }
  }

  return (
    <PayrollDashboard
      isAdmin={isAdmin}
      cleaners={cleaners}
      currentUserId={session?.userId ?? ""}
    />
  );
};

export default PayrollPage;
