import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyPasswordHash } from "@/src/lib/auth/password";
import { checkRateLimit, getClientIp, AUTH_LIMITS } from "@/src/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // Rate limit by IP to prevent token brute-force
    const ip = getClientIp(request);
    const ipLimit = checkRateLimit(AUTH_LIMITS.reset, ip);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSec ?? 60) } }
      );
    }

    const { token, password } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    if (resetToken.usedAt) {
      return NextResponse.json({ error: "This reset link has already been used" }, { status: 400 });
    }

    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "This reset link has expired. Please request a new one." }, { status: 400 });
    }

    // Get the user to access existing avatarUrl
    const user = await prisma.user.findUnique({
      where: { id: resetToken.userId },
      select: { id: true, avatarUrl: true, status: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }

    // Hash the new password and store it
    const newAvatarMeta = await applyPasswordHash(password, user.avatarUrl);

    // Update password but do NOT reactivate disabled/suspended accounts.
    // Only set status to "active" if the user was in "pending" state (first-time setup).
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          avatarUrl: newAvatarMeta,
          // Only activate pending users; do not reactivate suspended/disabled accounts
          ...(user.status === "pending" ? { status: "active" } : {}),
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true, message: "Password reset successfully. You can now log in." });
  } catch (error) {
    console.error("[reset-password] Error:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
