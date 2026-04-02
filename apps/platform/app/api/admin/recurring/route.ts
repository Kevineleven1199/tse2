import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !["HQ"].includes(session.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenantId = session.tenantId;
    const schedules = await prisma.recurringSchedule.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(schedules);
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !["HQ"].includes(session.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const tenantId = session.tenantId;
    
    const schedule = await prisma.recurringSchedule.create({
      data: {
        tenantId,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone,
        address: body.address,
        serviceType: body.serviceType,
        frequency: body.frequency,
        dayOfWeek: body.dayOfWeek,
        dayOfMonth: body.dayOfMonth,
        startDate: new Date(body.startDate),
        nextRunDate: new Date(body.nextRunDate),
        basePrice: body.basePrice,
        notes: body.notes,
        active: true,
      },
    });
    return NextResponse.json(schedule);
  } catch (error) {
    return NextResponse.json({ error: "Creation failed" }, { status: 500 });
  }
}
