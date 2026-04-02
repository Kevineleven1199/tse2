import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { buildSessionCookie } from "@/src/lib/auth/cookies";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().optional()
});

export const GET = async () => {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true
    }
  });

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ profile: user });
};

export const PATCH = async (request: Request) => {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const viewer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, tenantId: true }
    });

    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = updateSchema.parse(await request.json());

    const normalizedPhone = payload.phone?.trim() ? payload.phone.trim().replace(/[^\d+]/g, "") : null;

    const profile = await prisma.user.update({
      where: { id: viewer.id },
      data: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: normalizedPhone
      },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId: viewer.tenantId,
        actorId: viewer.id,
        action: "PROFILE_UPDATED",
        metadata: {
          fields: ["firstName", "lastName", "phone"]
        }
      }
    });

    const sessionCookie = await buildSessionCookie({
      userId: session.userId,
      email: session.email,
      role: session.role,
      name: `${profile.firstName} ${profile.lastName}`.trim(),
      tenantId: session.tenantId
    });

    const response = NextResponse.json({ ok: true, profile });
    response.cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.options);
    return response;
  } catch (error) {
    console.error("[client-profile] Failed to update profile", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid profile payload", details: error.flatten() },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: "Unable to update profile" }, { status: 500 });
  }
};
