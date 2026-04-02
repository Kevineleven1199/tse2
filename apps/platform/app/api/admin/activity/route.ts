import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/activity
 * Comprehensive activity surveillance dashboard data.
 * Returns: recent logins, page views, user activity, system events.
 */
export async function GET(request: Request) {
  const session = await requireSession({ roles: ["HQ"] });
  const tenantId = session.tenantId;

  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "7");
  const since = new Date(Date.now() - days * 86400000);

  const [
    recentActivity,
    activityByAction,
    activityByUser,
    userCount,
    activeUsersToday,
    analyticsEvents,
    recentLogins,
  ] = await Promise.all([
    // Recent audit log entries
    prisma.auditLog.findMany({
      where: { tenantId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),

    // Activity breakdown by action type
    prisma.auditLog.groupBy({
      by: ["action"],
      where: { tenantId, createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    }),

    // Activity breakdown by user
    prisma.auditLog.groupBy({
      by: ["actorId"],
      where: { tenantId, createdAt: { gte: since }, actorId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 15,
    }),

    // Total users
    prisma.user.count({ where: { tenantId } }),

    // Users active today (had any audit event)
    prisma.auditLog.groupBy({
      by: ["actorId"],
      where: {
        tenantId,
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        actorId: { not: null },
      },
      _count: { id: true },
    }).then((r) => r.length),

    // Web analytics events (page views, clicks)
    prisma.analyticsEvent.count({
      where: { tenantId, createdAt: { gte: since } },
    }).catch(() => 0),

    // Recent auth events (logins)
    prisma.auditLog.findMany({
      where: {
        tenantId,
        action: { in: ["login", "auth.login", "impersonation.started", "integration.configured", "integration.tested"] },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  // Resolve user names for activity-by-user
  const userIds = activityByUser
    .map((a) => a.actorId)
    .filter((id): id is string => id !== null);

  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      })
    : [];

  const userMap = new Map(users.map((u) => [u.id, u]));

  return NextResponse.json({
    period: { days, since: since.toISOString() },
    summary: {
      totalUsers: userCount,
      activeUsersToday,
      totalEvents: recentActivity.length,
      pageViews: analyticsEvents,
    },
    activityByAction: activityByAction.map((a) => ({
      action: a.action,
      count: a._count.id,
    })),
    activityByUser: activityByUser.map((a) => {
      const user = a.actorId ? userMap.get(a.actorId) : null;
      return {
        userId: a.actorId,
        name: user ? `${user.firstName} ${user.lastName}`.trim() : "System",
        email: user?.email,
        role: user?.role,
        eventCount: a._count.id,
      };
    }),
    recentLogins: recentLogins.map((a) => ({
      id: a.id,
      action: a.action,
      actorId: a.actorId,
      metadata: a.metadata,
      timestamp: a.createdAt.toISOString(),
    })),
    timeline: recentActivity.map((a) => ({
      id: a.id,
      action: a.action,
      actorId: a.actorId,
      metadata: a.metadata,
      timestamp: a.createdAt.toISOString(),
    })),
  });
}
