/**
 * POST /api/auth/request-reset
 * Any logged-in user can request a password reset
 * This sets their status to "reset_requested" which shows up for admin approval
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { sendEmailWithFailsafe } from "@/src/lib/email-failsafe";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Mark user as requesting a reset
    await prisma.user.update({
      where: { id: session.userId },
      data: { status: "reset_requested" },
    });

    // Notify admin (find HQ users in same tenant)
    const admins = await prisma.user.findMany({
      where: { tenantId: session.tenantId, role: "HQ" },
      select: { email: true, firstName: true },
    });

    const adminUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tseorganicclean264-production.up.railway.app";

    for (const admin of admins) {
      await sendEmailWithFailsafe({
        to: admin.email,
        subject: `Password Reset Request from ${session.name}`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0d5e3b; color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">Tri State Enterprise</h1>
            </div>
            <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p>Hi ${admin.firstName},</p>
              <p><strong>${session.name}</strong> (${session.email}) has requested a password reset.</p>
              <div style="text-align: center; margin: 20px 0;">
                <a href="${adminUrl}/admin/team" style="display: inline-block; background: #0d5e3b; color: white; padding: 12px 32px; border-radius: 999px; text-decoration: none; font-weight: 600;">Review in Team Management</a>
              </div>
            </div>
          </div>
        `,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Password reset request sent to your administrator. You'll receive an email when it's approved.",
    });
  } catch (error) {
    console.error("[request-reset] Error:", error);
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }
}
