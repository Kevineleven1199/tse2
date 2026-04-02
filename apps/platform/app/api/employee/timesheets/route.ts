import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/employee/timesheets
 * List timesheets. CLEANERs see only their own; HQ/MANAGER see all or filtered by cleanerId.
 * Query params: ?cleanerId=xxx&from=2025-01-01&to=2025-01-31
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = ["HQ", "MANAGER"].includes(session.role);
  const url = new URL(request.url);
  const queryCleanerId = url.searchParams.get("cleanerId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let cleanerId: string | null = queryCleanerId;

  // CLEANERs can only see their own timesheets
  if (!isAdmin) {
    const profile = await prisma.cleanerProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });
    if (!profile) {
      return NextResponse.json({ error: "Cleaner profile not found" }, { status: 404 });
    }
    cleanerId = profile.id;
  }

  // If admin specified a cleanerId, verify it belongs to their tenant
  if (isAdmin && cleanerId) {
    const cleanerOwnership = await prisma.cleanerProfile.findFirst({
      where: { id: cleanerId, user: { tenantId: session.tenantId } },
      select: { id: true },
    });
    if (!cleanerOwnership) {
      return NextResponse.json({ error: "Cleaner not found" }, { status: 404 });
    }
  }

  // Build WHERE clause — always tenant-scoped for admins via cleaner->user->tenantId
  const where: Record<string, unknown> = {
    cleaner: { user: { tenantId: session.tenantId } },
  };
  if (cleanerId) where.cleanerId = cleanerId;
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const timesheets = await prisma.timesheet.findMany({
    where,
    include: {
      cleaner: {
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { date: "desc" },
    take: 200,
  });

  return NextResponse.json({
    timesheets: timesheets.map((t) => ({
      id: t.id,
      cleanerId: t.cleanerId,
      cleanerName: `${t.cleaner.user.firstName} ${t.cleaner.user.lastName}`,
      jobId: t.jobId,
      date: t.date.toISOString(),
      clockIn: t.clockIn.toISOString(),
      clockOut: t.clockOut?.toISOString() ?? null,
      hoursWorked: t.hoursWorked,
      source: t.source,
      notes: t.notes,
      approved: t.approved,
      approvedBy: t.approvedBy,
    })),
  });
}

/**
 * POST /api/employee/timesheets
 * Create a manual timesheet entry. HQ/MANAGER only.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["HQ", "MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    cleanerId: string;
    jobId?: string;
    date: string;
    clockIn: string;
    clockOut?: string;
    notes?: string;
  };

  if (!body.cleanerId || !body.date || !body.clockIn) {
    return NextResponse.json(
      { error: "cleanerId, date, and clockIn are required" },
      { status: 400 }
    );
  }

  // Verify the target cleaner belongs to the same tenant
  const cleanerOwnership = await prisma.cleanerProfile.findFirst({
    where: { id: body.cleanerId, user: { tenantId: session.tenantId } },
    select: { id: true },
  });
  if (!cleanerOwnership) {
    return NextResponse.json({ error: "Cleaner not found" }, { status: 404 });
  }

  const clockIn = new Date(body.clockIn);
  const clockOut = body.clockOut ? new Date(body.clockOut) : null;
  const hoursWorked = clockOut
    ? Math.round(((clockOut.getTime() - clockIn.getTime()) / 3600000) * 100) / 100
    : null;

  const timesheet = await prisma.timesheet.create({
    data: {
      cleanerId: body.cleanerId,
      jobId: body.jobId ?? null,
      date: new Date(body.date),
      clockIn,
      clockOut,
      hoursWorked,
      source: "manual",
      notes: body.notes ?? null,
      approved: false,
    },
  });

  return NextResponse.json({ success: true, timesheet }, { status: 201 });
}
