import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session || !["HQ"].includes(session.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data: any = {};
    if (body.customerName !== undefined) data.customerName = body.customerName;
    if (body.frequency !== undefined) data.frequency = body.frequency;
    if (body.basePrice !== undefined) data.basePrice = Number(body.basePrice);
    if (body.active !== undefined) data.active = Boolean(body.active);
    if (body.nextRunDate !== undefined) data.nextRunDate = new Date(body.nextRunDate);

    const updated = await prisma.recurringSchedule.update({
      where: { id: id },
      data: data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session || !["HQ"].includes(session.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.recurringSchedule.delete({
      where: { id: id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
