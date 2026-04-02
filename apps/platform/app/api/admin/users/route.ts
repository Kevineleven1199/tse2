import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";


export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["HQ", "MANAGER", "CLEANER"];

const createUserSchema = z.object({
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  email: z.string().email().max(255).toLowerCase(),
  phone: z.string().min(7).max(20).optional(),
  role: z.enum(["HQ", "MANAGER", "CLEANER", "CUSTOMER"]),
  payoutMethod: z.string().max(50).optional(),
  serviceRadius: z.coerce.number().positive().max(100).optional()
});

export const GET = async (request: Request) => {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "HQ") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const viewer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { tenantId: true }
    });

    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = viewer.tenantId;

    // Check if this is for impersonation (include all roles)
    const url = new URL(request.url);
    const includeAll = url.searchParams.get("includeAll") === "true";

    const users = await prisma.user.findMany({
      where: {
        tenantId,
        ...(includeAll ? {} : { role: { in: ALLOWED_ROLES as any } })
      },
      include: {
        cleaner: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({
      users: users.map((user) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        cleaner: user.cleaner
          ? {
              id: user.cleaner.id,
              rating: user.cleaner.rating,
              completedJobs: user.cleaner.completedJobs,
              serviceRadius: user.cleaner.serviceRadius,
              payoutMethod: user.cleaner.payoutMethod
            }
          : null
      }))
    });
  } catch (error) {
    console.error("[admin-users] Failed to list users", error);
    return NextResponse.json({ error: "Unable to load team members." }, { status: 500 });
  }
};

export const POST = async (request: Request) => {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "HQ") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const viewer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { tenantId: true }
    });

    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = viewer.tenantId;

    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const payload = createUserSchema.parse(body);

    if (!ALLOWED_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: "Only cleaners, managers, and HQ admins can be created here." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: payload.email }
    });

    if (existing) {
      return NextResponse.json({ error: "A user with that email already exists." }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        tenantId,
        email: payload.email,
        phone: payload.phone,
        firstName: payload.firstName,
        lastName: payload.lastName,
        role: payload.role
      }
    });

    if (payload.role === "CLEANER") {
      await prisma.cleanerProfile.create({
        data: {
          userId: user.id,
          payoutMethod: payload.payoutMethod ?? "WISE",
          serviceRadius: payload.serviceRadius ?? 15
        }
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin-users] Failed to create user", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid user payload.", details: error.flatten() },
        { status: 422 }
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Unable to create user." }, { status: 500 });
  }
};
