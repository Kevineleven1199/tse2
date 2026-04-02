import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/src/lib/auth/cookies";
import { SESSION_COOKIE, type SessionPayload, createSessionToken, verifySessionToken } from "@/src/lib/auth/token";

export const dynamic = "force-dynamic";

const ADMIN_SESSION_COOKIE = "gg_admin_session";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7 // 7 days
};

const startImpersonateSchema = z.object({
  action: z.literal("start"),
  targetUserId: z.string().min(1)
});

const stopImpersonateSchema = z.object({
  action: z.literal("stop")
});

/**
 * GET /api/admin/impersonate
 * Returns current impersonation status
 */
export const GET = async () => {
  try {
    const store = await cookies();
    const currentSession = await getSessionFromCookies();

    if (!currentSession || currentSession.role !== "HQ") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if there's an admin session cookie (indicating we're impersonating)
    const adminSessionCookie = store.get(ADMIN_SESSION_COOKIE)?.value;

    if (!adminSessionCookie) {
      // Not impersonating
      return NextResponse.json({
        isImpersonating: false
      });
    }

    // We're impersonating, parse the admin session to get the admin's ID
    const adminSession = await verifySessionToken(adminSessionCookie);

    if (!adminSession) {
      // Invalid admin session, clear it
      const response = NextResponse.json({
        isImpersonating: false
      });
      response.cookies.set(ADMIN_SESSION_COOKIE, "", {
        ...cookieOptions,
        maxAge: 0
      });
      return response;
    }

    // Fetch both users
    const [adminUser, targetUser] = await Promise.all([
      prisma.user.findUnique({
        where: { id: adminSession.userId },
        select: { id: true, email: true, firstName: true, lastName: true, role: true }
      }),
      prisma.user.findUnique({
        where: { id: currentSession.userId },
        select: { id: true, email: true, firstName: true, lastName: true, role: true }
      })
    ]);

    return NextResponse.json({
      isImpersonating: true,
      adminInfo: adminUser ? {
        id: adminUser.id,
        email: adminUser.email,
        name: `${adminUser.firstName} ${adminUser.lastName}`.trim(),
        role: adminUser.role
      } : null,
      targetInfo: targetUser ? {
        id: targetUser.id,
        email: targetUser.email,
        name: `${targetUser.firstName} ${targetUser.lastName}`.trim(),
        role: targetUser.role
      } : null
    });
  } catch (error) {
    console.error("[impersonate] GET failed", error);
    return NextResponse.json({ error: "Unable to check impersonation status" }, { status: 500 });
  }
};

/**
 * POST /api/admin/impersonate
 * Start or stop impersonation
 */
export const POST = async (request: Request) => {
  try {
    const currentSession = await getSessionFromCookies();

    if (!currentSession || currentSession.role !== "HQ") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    // Determine action
    const actionResult = z.union([startImpersonateSchema, stopImpersonateSchema]).safeParse(body);

    if (!actionResult.success) {
      return NextResponse.json(
        { error: "Invalid action", details: actionResult.error.flatten() },
        { status: 422 }
      );
    }

    const payload = actionResult.data;

    if (payload.action === "start") {
      // Start impersonation
      const targetUserId = payload.targetUserId;

      // Prevent self-impersonation
      if (targetUserId === currentSession.userId) {
        return NextResponse.json(
          { error: "Cannot impersonate yourself" },
          { status: 400 }
        );
      }

      // Verify target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, tenantId: true }
      });

      if (!targetUser) {
        return NextResponse.json(
          { error: "Target user not found" },
          { status: 404 }
        );
      }

      // Verify target user is in same tenant as admin
      const adminUser = await prisma.user.findUnique({
        where: { id: currentSession.userId },
        select: { tenantId: true }
      });

      if (!adminUser || adminUser.tenantId !== targetUser.tenantId) {
        return NextResponse.json(
          { error: "Cannot impersonate users from other tenants" },
          { status: 403 }
        );
      }

      // Create session token for target user
      const targetSessionToken = await createSessionToken({
        userId: targetUser.id,
        email: targetUser.email,
        role: targetUser.role as SessionPayload["role"],
        name: `${targetUser.firstName} ${targetUser.lastName}`.trim(),
        tenantId: targetUser.tenantId
      });

      // Save current admin session to backup cookie
      const adminSessionToken = await createSessionToken(currentSession);

      // Audit log: record impersonation start
      await prisma.auditLog.create({
        data: {
          tenantId: adminUser.tenantId,
          actorId: currentSession.userId,
          action: "impersonation.started",
          metadata: {
            targetUserId: targetUser.id,
            targetEmail: targetUser.email,
            targetRole: targetUser.role,
          },
        },
      }).catch(() => {}); // Non-blocking

      const response = NextResponse.json({
        ok: true,
        message: `Now viewing as ${targetUser.firstName} ${targetUser.lastName}`
      });

      // Set the target user's session
      response.cookies.set(SESSION_COOKIE, targetSessionToken, cookieOptions);

      // Save admin session for restoration
      response.cookies.set(ADMIN_SESSION_COOKIE, adminSessionToken, cookieOptions);

      return response;
    } else if (payload.action === "stop") {
      // Stop impersonation - restore admin session
      const store = await cookies();
      const adminSessionCookie = store.get(ADMIN_SESSION_COOKIE)?.value;

      if (!adminSessionCookie) {
        return NextResponse.json(
          { error: "No impersonation session to restore" },
          { status: 400 }
        );
      }

      const response = NextResponse.json({
        ok: true,
        message: "Impersonation ended, session restored"
      });

      // Restore admin session
      response.cookies.set(SESSION_COOKIE, adminSessionCookie, cookieOptions);

      // Clear admin backup cookie
      response.cookies.set(ADMIN_SESSION_COOKIE, "", {
        ...cookieOptions,
        maxAge: 0
      });

      return response;
    }

    return NextResponse.json(
      { error: "Unknown action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[impersonate] POST failed", error);
    return NextResponse.json({ error: "Unable to process impersonation request" }, { status: 500 });
  }
};
