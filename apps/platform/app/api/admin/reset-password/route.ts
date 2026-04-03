/**
 * POST /api/admin/reset-password
 * Admin can reset any user's password directly
 * Body: { userId: string, newPassword?: string }
 * If no newPassword provided, generates a random one
 *
 * GET /api/admin/reset-password
 * Lists pending password reset requests from users
 *
 * PUT /api/admin/reset-password
 * Approve or deny a password reset request
 * Body: { requestId: string, action: "approve" | "deny", newPassword?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { applyPasswordHash } from "@/src/lib/auth/password";
import { sendEmailWithFailsafe } from "@/src/lib/email-failsafe";

export const dynamic = "force-dynamic";

function generatePassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  let pw = "";
  for (let i = 0; i < length; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
}

// POST — Admin resets a user's password directly
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "HQ") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, newPassword } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true, tenantId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const password = newPassword || generatePassword();
    const avatarMeta = await applyPasswordHash(password, user.avatarUrl);

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: avatarMeta },
    });

    // Send email with new password
    const loginUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tristateenterprise264-production.up.railway.app";
    await sendEmailWithFailsafe({
      to: user.email,
      subject: "Your TriState Password Has Been Reset",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0d5e3b; color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Tri State Enterprise</h1>
            <p style="margin: 4px 0 0; opacity: 0.8;">Password Reset</p>
          </div>
          <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p>Hi ${user.firstName},</p>
            <p>Your password has been reset by an administrator.</p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <p style="color: #16a34a; font-weight: 600; margin: 0 0 8px;">New Login Details</p>
              <p style="margin: 4px 0;"><strong>Email:</strong> ${user.email}</p>
              <p style="margin: 4px 0;"><strong>New Password:</strong> <code style="background: white; padding: 4px 8px; border-radius: 4px;">${password}</code></p>
            </div>
            <p style="font-size: 13px; color: #6b7280;">Please change your password after logging in.</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${loginUrl}/login" style="display: inline-block; background: #0d5e3b; color: white; padding: 12px 32px; border-radius: 999px; text-decoration: none; font-weight: 600;">Login Now</a>
            </div>
          </div>
        </div>
      `,
    });

    return NextResponse.json({
      ok: true,
      message: `Password reset for ${user.firstName} ${user.lastName}. Email sent to ${user.email}.`,
      tempPassword: password,
    });
  } catch (error) {
    console.error("[reset-password] Error:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}

// GET — List pending password reset requests
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "HQ") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Reset requests stored as JSON in a simple approach
    // Using User status field pattern: "reset_requested" status
    const requests = await prisma.user.findMany({
      where: { status: "reset_requested" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      requests: requests.map((u) => ({
        userId: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        email: u.email,
        role: u.role,
        requestedAt: u.updatedAt,
      })),
    });
  } catch (error) {
    console.error("[reset-password] Error listing requests:", error);
    return NextResponse.json({ error: "Failed to list requests" }, { status: 500 });
  }
}

// PUT — Approve or deny a password reset request
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "HQ") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, action, newPassword } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: "userId and action are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true, status: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === "deny") {
      await prisma.user.update({
        where: { id: userId },
        data: { status: "active" },
      });
      return NextResponse.json({ ok: true, message: "Reset request denied." });
    }

    if (action === "approve") {
      const password = newPassword || generatePassword();
      const avatarMeta = await applyPasswordHash(password, user.avatarUrl);

      await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: avatarMeta, status: "active" },
      });

      const loginUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tristateenterprise264-production.up.railway.app";
      await sendEmailWithFailsafe({
        to: user.email,
        subject: "Your TriState Password Reset Has Been Approved",
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0d5e3b; color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">Tri State Enterprise</h1>
            </div>
            <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p>Hi ${user.firstName},</p>
              <p>Your password reset request has been approved!</p>
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="margin: 4px 0;"><strong>Email:</strong> ${user.email}</p>
                <p style="margin: 4px 0;"><strong>New Password:</strong> <code style="background: white; padding: 4px 8px; border-radius: 4px;">${password}</code></p>
              </div>
              <div style="text-align: center; margin: 20px 0;">
                <a href="${loginUrl}/login" style="display: inline-block; background: #0d5e3b; color: white; padding: 12px 32px; border-radius: 999px; text-decoration: none; font-weight: 600;">Login Now</a>
              </div>
            </div>
          </div>
        `,
      });

      return NextResponse.json({
        ok: true,
        message: `Password reset approved for ${user.firstName}. Email sent.`,
        tempPassword: password,
      });
    }

    return NextResponse.json({ error: "Invalid action. Use 'approve' or 'deny'." }, { status: 400 });
  } catch (error) {
    console.error("[reset-password] Error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
