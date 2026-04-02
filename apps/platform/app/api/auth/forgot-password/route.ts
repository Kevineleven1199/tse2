import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/src/lib/auth/token";
import { sendEmailWithFailsafe } from "@/src/lib/email-failsafe";
import { checkRateLimit, getClientIp, AUTH_LIMITS } from "@/src/lib/rate-limit";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    // Rate limit by IP
    const ipLimit = checkRateLimit(AUTH_LIMITS.forgotByIp, ip);
    if (!ipLimit.allowed) {
      // Still return the standard success message to avoid leaking whether
      // the IP has been hitting this endpoint hard
      return NextResponse.json({ ok: true, message: "If an account exists, a reset link has been sent." });
    }

    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Rate limit by email (prevents flooding one recipient)
    const emailLimit = checkRateLimit(AUTH_LIMITS.forgotByEmail, email.toLowerCase().trim());
    if (!emailLimit.allowed) {
      // Same normalized response
      return NextResponse.json({ ok: true, message: "If an account exists, a reset link has been sent." });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, firstName: true, email: true },
    });

    // Always return success to avoid email enumeration
    if (!user) {
      return NextResponse.json({ ok: true, message: "If an account exists, a reset link has been sent." });
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Create new token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://tseorganicclean264-production.up.railway.app";
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    await sendEmailWithFailsafe({
      to: user.email,
      subject: "Reset Your Password — Tri State Enterprise",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0d5e3b; color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Tri State Enterprise</h1>
          </div>
          <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p>Hi ${user.firstName},</p>
            <p>We received a request to reset your password. Click the button below to create a new one:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${resetLink}" style="display: inline-block; background: #0d5e3b; color: white; padding: 14px 36px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Reset Password
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ ok: true, message: "If an account exists, a reset link has been sent." });
  } catch (error) {
    console.error("[forgot-password] Error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
