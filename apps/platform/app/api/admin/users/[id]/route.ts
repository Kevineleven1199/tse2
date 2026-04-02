import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import { applyPasswordHash } from "@/src/lib/auth/password";
import { sendEmailWithFailsafe } from "@/src/lib/email-failsafe";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  role: z.enum(["HQ", "MANAGER", "CLEANER", "CUSTOMER"]).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
});

/**
 * GET /api/admin/users/[id]
 * Get detailed user profile with activity summary
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession({ roles: ["HQ"] });
  const { id } = await params;

  const user = await prisma.user.findFirst({
    where: { id, tenantId: session.tenantId },
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true,
      role: true, status: true, blocked: true, blockedAt: true, blockedReason: true,
      xp: true, createdAt: true, updatedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Fetch activity summary
  const [activityCount, lastActivity, recentActions] = await Promise.all([
    prisma.auditLog.count({
      where: { tenantId: session.tenantId, actorId: id },
    }),
    prisma.auditLog.findFirst({
      where: { tenantId: session.tenantId, actorId: id },
      orderBy: { createdAt: "desc" },
      select: { action: true, createdAt: true },
    }),
    prisma.auditLog.findMany({
      where: { tenantId: session.tenantId, actorId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, action: true, metadata: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    user: {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      blockedAt: user.blockedAt?.toISOString(),
    },
    activity: {
      totalEvents: activityCount,
      lastSeen: lastActivity?.createdAt.toISOString(),
      lastAction: lastActivity?.action,
      recent: recentActions.map((a) => ({
        id: a.id,
        action: a.action,
        metadata: a.metadata,
        timestamp: a.createdAt.toISOString(),
      })),
    },
  });
}

/**
 * PATCH /api/admin/users/[id]
 * Update user profile, role, or status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession({ roles: ["HQ"] });
  const { id } = await params;

  const existing = await prisma.user.findFirst({
    where: { id, tenantId: session.tenantId },
    select: { id: true, role: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await request.json();
  const data = updateUserSchema.parse(body);

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
      ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, status: true },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "user.updated",
      metadata: { targetUserId: id, changes: Object.keys(data) },
    },
  });

  return NextResponse.json({ user: updated });
}

/**
 * POST /api/admin/users/[id]
 * Special actions: reset-password, block, unblock
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession({ roles: ["HQ"] });
  const { id } = await params;
  const body = await request.json();
  const action = body.action as string;

  const user = await prisma.user.findFirst({
    where: { id, tenantId: session.tenantId },
    select: { id: true, email: true, firstName: true, lastName: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  switch (action) {
    case "reset-password": {
      const tempPassword = crypto.randomBytes(6).toString("hex");
      const newHash = await applyPasswordHash(tempPassword);
      await prisma.user.update({
        where: { id },
        data: { avatarUrl: newHash },
      });

      // Email the temp password
      await sendEmailWithFailsafe({
        to: user.email,
        subject: "Your password has been reset — Tri State Enterprise",
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:500px;">
            <h2>Password Reset</h2>
            <p>Hi ${user.firstName},</p>
            <p>Your password has been reset by an administrator. Your temporary password is:</p>
            <div style="background:#f0f0f0;padding:16px;border-radius:8px;margin:16px 0;">
              <code style="font-size:18px;font-weight:bold;">${tempPassword}</code>
            </div>
            <p>Please log in and change your password immediately.</p>
          </div>
        `,
      });

      await prisma.auditLog.create({
        data: {
          tenantId: session.tenantId,
          actorId: session.userId,
          action: "user.password_reset",
          metadata: { targetUserId: id, targetEmail: user.email },
        },
      });

      return NextResponse.json({ success: true, message: `Temp password sent to ${user.email}` });
    }

    case "block": {
      await prisma.user.update({
        where: { id },
        data: { blocked: true, blockedAt: new Date(), blockedReason: body.reason || "Blocked by admin" },
      });
      await prisma.auditLog.create({
        data: {
          tenantId: session.tenantId,
          actorId: session.userId,
          action: "user.blocked",
          metadata: { targetUserId: id, reason: body.reason },
        },
      });
      return NextResponse.json({ success: true });
    }

    case "unblock": {
      await prisma.user.update({
        where: { id },
        data: { blocked: false, blockedAt: null, blockedReason: null },
      });
      await prisma.auditLog.create({
        data: {
          tenantId: session.tenantId,
          actorId: session.userId,
          action: "user.unblocked",
          metadata: { targetUserId: id },
        },
      });
      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
