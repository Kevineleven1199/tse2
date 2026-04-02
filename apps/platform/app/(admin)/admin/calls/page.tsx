import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import CallsClient from "./calls-client";

export default async function CallsPage() {
  const session = await requireSession({ roles: ["HQ", "MANAGER"], redirectTo: "/login" });
  const tenantId = session?.tenantId || process.env.DEFAULT_TENANT_ID || "ten_tse";

  // Fetch recent leads that have been called
  const calledLeads = await prisma.crmLead.findMany({
    where: {
      tenantId,
      callCount: { gt: 0 },
    },
    orderBy: { lastContactedAt: "desc" },
    take: 100,
  });

  // Fetch follow-up TodoItems
  const followUpTodos = await prisma.todoItem.findMany({
    where: {
      tenantId,
      category: "follow_up",
      completed: false,
    },
    orderBy: { dueDate: "asc" },
    take: 50,
  });

  // Calculate statistics
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const callsToday = await prisma.crmLead.count({
    where: {
      tenantId,
      lastContactedAt: { gte: today },
    },
  });

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const callsThisWeek = await prisma.crmLead.count({
    where: {
      tenantId,
      lastContactedAt: { gte: weekStart },
    },
  });

  // Calculate conversion rate (leads with status "won" out of leads with callCount > 0)
  const totalCalledLeads = await prisma.crmLead.count({
    where: { tenantId, callCount: { gt: 0 } },
  });

  const convertedLeads = await prisma.crmLead.count({
    where: { tenantId, callCount: { gt: 0 }, status: "won" },
  });

  const conversionRate = totalCalledLeads > 0 ? Math.round((convertedLeads / totalCalledLeads) * 100) : 0;

  const stats = {
    callsToday,
    callsThisWeek,
    conversionRate,
    avgCallDuration: "4m 30s", // Placeholder - would need call recording data
  };

  return (
    <CallsClient
      userId={session.userId}
      userName={session.name}
      role={session.role}
      initialLeads={JSON.parse(JSON.stringify(calledLeads))}
      initialFollowUps={JSON.parse(JSON.stringify(followUpTodos))}
      initialStats={stats}
    />
  );
}
