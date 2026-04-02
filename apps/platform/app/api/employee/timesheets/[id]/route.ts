import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PUT /api/employee/timesheets/[id]
 * Edit a timesheet entry or approve it. HQ/MANAGER only.
 */
export async function PUT(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session || !["HQ", "MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const body = (await request.json()) as {
    clockIn?: string;
    clockOut?: string;
    notes?: string;
    approved?: boolean;
  };

  const existing = await prisma.timesheet.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
  }

  const clockIn = body.clockIn ? new Date(body.clockIn) : existing.clockIn;
  const clockOut = body.clockOut ? new Date(body.clockOut) : existing.clockOut;
  const hoursWorked = clockOut
    ? Math.round(((clockOut.getTime() - clockIn.getTime()) / 3600000) * 100) / 100
    : existing.hoursWorked;

  const updated = await prisma.timesheet.update({
    where: { id },
    data: {
      clockIn,
      clockOut,
      hoursWorked,
      notes: body.notes !== undefined ? body.notes : existing.notes,
      approved: body.approved !== undefined ? body.approved : existing.approved,
      approvedBy: body.approved === true ? session.userId : existing.approvedBy,
    },
  });

  return NextResponse.json({ success: true, timesheet: updated });
}

/**
 * DELETE /api/employee/timesheets/[id]
 * Delete a timesheet entry. HQ/MANAGER only.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session || !["HQ", "MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const existing = await prisma.timesheet.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
  }

  await prisma.timesheet.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
