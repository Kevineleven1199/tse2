import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTenantFromRequest } from "@/lib/tenant";
import { Role } from "@prisma/client";
import { applyPasswordHash, extractPasswordHash } from "@/src/lib/auth/password";
import { buildSessionCookie } from "@/src/lib/auth/cookies";
import { checkRateLimit, getClientIp, AUTH_LIMITS } from "@/src/lib/rate-limit";

export const dynamic = "force-dynamic";

const registerSchema = z.object({
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  email: z.string().email().max(255).toLowerCase(),
  phone: z.string().min(7).max(20),
  password: z.string().min(8).max(255),
  referralCode: z.string().optional()
});

export const POST = async (request: Request) => {
  try {
    // Rate limit by IP
    const ip = getClientIp(request);
    const ipLimit = checkRateLimit(AUTH_LIMITS.register, ip);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSec ?? 60) } }
      );
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

    const payload = registerSchema.parse(body);
    const tenant = await getTenantFromRequest();
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not configured." }, { status: 503 });
    }

    const tenantId = tenant.id;

    const normalizedPhone = payload.phone.replace(/[^\d+]/g, "");

    let user = await prisma.user.findUnique({
      where: { email: payload.email }
    });

    if (user && user.role !== Role.CUSTOMER) {
      // Normalized: don't reveal that the email belongs to an internal user
      return NextResponse.json({ error: "An account with this email already exists. Please log in." }, { status: 409 });
    }

    if (user && extractPasswordHash(user.avatarUrl)) {
      return NextResponse.json({ error: "An account with this email already exists. Please log in." }, { status: 409 });
    }

    const avatarPayload = await applyPasswordHash(payload.password, user?.avatarUrl ?? undefined);

    if (!user) {
      user = await prisma.user.create({
        data: {
          tenantId,
          email: payload.email,
          phone: normalizedPhone,
          firstName: payload.firstName,
          lastName: payload.lastName,
          role: Role.CUSTOMER,
          avatarUrl: avatarPayload
        }
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: payload.firstName,
          lastName: payload.lastName,
          phone: normalizedPhone,
          avatarUrl: avatarPayload,
          role: Role.CUSTOMER
        }
      });
    }

    // If a referral code was provided, link this new user to the referral
    if (payload.referralCode) {
      try {
        const referral = await prisma.referral.findUnique({
          where: { referralCode: payload.referralCode }
        });
        if (referral && referral.referrerEmail !== payload.email) {
          await prisma.referral.update({
            where: { id: referral.id },
            data: {
              referreeName: `${payload.firstName} ${payload.lastName}`.trim(),
              referreeEmail: payload.email
            }
          });
        }
      } catch (err) {
        // Non-blocking: referral linking failure should not block registration
        console.warn("[auth/register] Failed to link referral code:", err);
      }
    }

    const sessionCookie = await buildSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: `${user.firstName} ${user.lastName}`.trim(),
      tenantId: user.tenantId
    });

    const response = NextResponse.json({ ok: true, redirectTo: "/client" });
    response.cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.options);
    return response;
  } catch (error) {
    console.error("[auth] register error", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid registration payload", details: error.flatten() },
        { status: 422 }
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Unable to register." }, { status: 500 });
  }
};
