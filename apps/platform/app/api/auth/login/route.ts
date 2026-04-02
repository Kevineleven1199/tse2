import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { buildSessionCookie } from "@/src/lib/auth/cookies";
import { applyPasswordHash, extractPasswordHash, verifyPassword } from "@/src/lib/auth/password";
import { checkRateLimit, getClientIp, AUTH_LIMITS } from "@/src/lib/rate-limit";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const ROLE_REDIRECT: Record<Role, string> = {
  [Role.HQ]: "/admin",
  [Role.MANAGER]: "/manager",
  [Role.CLEANER]: "/cleaner",
  [Role.CUSTOMER]: "/client"
};

const masterAdminEmail = process.env.MASTER_ADMIN_EMAIL;
const masterAdminPassword = process.env.MASTER_ADMIN_PASSWORD;

const ensureTenant = async (tenantId: string) => {
  const slug = process.env.DEFAULT_TENANT_SLUG ?? "tse";
  const existing = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (existing) return;

  // Also check by slug in case tenant was created with a different id
  const bySlug = await prisma.tenant.findUnique({ where: { slug } });
  if (bySlug) return;

  console.log(`[auth] Tenant '${tenantId}' not found — auto-creating.`);
  await prisma.tenant.create({
    data: {
      id: tenantId,
      name: process.env.DEFAULT_TENANT_NAME ?? "TriState HQ",
      slug
    }
  });
};

const ensureMasterAdmin = async () => {
  let tenantId = process.env.DEFAULT_TENANT_ID;

  // If DEFAULT_TENANT_ID is not set, try to find any existing tenant
  if (!tenantId) {
    const anyTenant = await prisma.tenant.findFirst({ select: { id: true } });
    if (anyTenant) {
      tenantId = anyTenant.id;
      console.log(`[auth] DEFAULT_TENANT_ID not set — using existing tenant ${tenantId}`);
    } else {
      console.warn("[auth] No tenant found and DEFAULT_TENANT_ID not set. Unable to seed master admin.");
      return;
    }
  }

  if (!masterAdminEmail || !masterAdminPassword) {
    console.warn("[auth] MASTER_ADMIN_EMAIL or MASTER_ADMIN_PASSWORD not set. Skipping admin seed.");
    return;
  }

  // Ensure the tenant exists before creating the admin user
  await ensureTenant(tenantId);

  const existing = await prisma.user.findUnique({
    where: { email: masterAdminEmail }
  });

  if (!existing) {
    const hashed = await applyPasswordHash(masterAdminPassword);
    await prisma.user.create({
      data: {
        tenantId,
        email: masterAdminEmail,
        firstName: "Kevin",
        lastName: "Admin",
        phone: "+1 (555) 555-5555",
        role: Role.HQ,
        avatarUrl: hashed
      }
    });
    return;
  }

  const existingHash = extractPasswordHash(existing.avatarUrl);
  let updatedAvatarUrl: string | null = null;

  if (!existingHash) {
    updatedAvatarUrl = await applyPasswordHash(masterAdminPassword, existing.avatarUrl ?? undefined);
  } else {
    const passwordMatches = await verifyPassword(masterAdminPassword, existing.avatarUrl);
    if (!passwordMatches) {
      updatedAvatarUrl = await applyPasswordHash(masterAdminPassword, existing.avatarUrl ?? undefined);
    }
  }

  if (updatedAvatarUrl || existing.role !== Role.HQ) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        ...(updatedAvatarUrl ? { avatarUrl: updatedAvatarUrl } : {}),
        ...(existing.role !== Role.HQ ? { role: Role.HQ } : {})
      }
    });
  }
};

export const POST = async (request: Request) => {
  try {
    // Rate limit by IP
    const ip = getClientIp(request);
    const ipLimit = checkRateLimit(AUTH_LIMITS.login, ip);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSec ?? 60) } }
      );
    }

    const payload = loginSchema.parse(await request.json());

    // Rate limit by email (tighter per-account limit)
    const emailLimit = checkRateLimit(AUTH_LIMITS.loginByEmail, payload.email.toLowerCase());
    if (!emailLimit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts for this account. Please try again later." },
        { status: 429, headers: { "Retry-After": String(emailLimit.retryAfterSec ?? 60) } }
      );
    }

    // Sync master admin credentials from env vars on every login attempt.
    // This ensures the admin can always log in with the password from MASTER_ADMIN_PASSWORD,
    // even if the DB hash drifted or was never seeded.
    if (masterAdminEmail && masterAdminPassword) {
      await ensureMasterAdmin();
    }

    const user = await prisma.user.findUnique({
      where: { email: payload.email }
    });

    // Normalized error message — same for invalid email and invalid password
    // to prevent account enumeration
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const validPassword = await verifyPassword(payload.password, user.avatarUrl);
    if (!validPassword) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const sessionCookie = await buildSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: `${user.firstName} ${user.lastName}`.trim(),
      tenantId: user.tenantId
    });

    const response = NextResponse.json({
      ok: true,
      redirectTo: ROLE_REDIRECT[user.role]
    });
    response.cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.options);
    return response;
  } catch (error) {
    console.error("[auth] login error", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid login payload", details: error.flatten() }, { status: 422 });
    }
    // Surface Prisma constraint errors for debugging
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("Foreign key constraint") || msg.includes("violates foreign key")) {
      console.error("[auth] Tenant likely missing in database. Run prisma:bootstrap or set DEFAULT_TENANT_ID.");
      return NextResponse.json({ error: "System configuration error. Please contact support." }, { status: 500 });
    }
    return NextResponse.json({ error: "Unable to log in. Please try again." }, { status: 500 });
  }
};
