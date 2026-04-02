import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

type SlotInput = {
  weekday: number;  // 0=Sunday
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
};

// GET — return current cleaner's availability slots
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !["CLEANER", "HQ"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const cleaner = await prisma.cleanerProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!cleaner) {
      return NextResponse.json([]);
    }

    const slots = await prisma.availabilitySlot.findMany({
      where: { cleanerId: cleaner.id },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json(slots);
  } catch (error) {
    console.error("[availability] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}

// PUT — replace all slots in a transaction
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["CLEANER", "HQ"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const cleaner = await prisma.cleanerProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!cleaner) {
      return NextResponse.json({ error: "Cleaner profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const slots: SlotInput[] = body.slots;

    if (!Array.isArray(slots)) {
      return NextResponse.json({ error: "slots must be an array" }, { status: 400 });
    }

    // Validate slots
    for (const slot of slots) {
      if (
        typeof slot.weekday !== "number" ||
        slot.weekday < 0 ||
        slot.weekday > 6 ||
        !slot.startTime ||
        !slot.endTime
      ) {
        return NextResponse.json({ error: "Invalid slot data" }, { status: 400 });
      }
    }

    // Transaction: delete all existing, create new
    await prisma.$transaction([
      prisma.availabilitySlot.deleteMany({ where: { cleanerId: cleaner.id } }),
      ...slots.map((slot) =>
        prisma.availabilitySlot.create({
          data: {
            cleanerId: cleaner.id,
            weekday: slot.weekday,
            startTime: slot.startTime,
            endTime: slot.endTime,
          },
        })
      ),
    ]);

    // Return updated slots
    const updated = await prisma.availabilitySlot.findMany({
      where: { cleanerId: cleaner.id },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[availability] PUT error:", error);
    return NextResponse.json({ error: "Failed to update availability" }, { status: 500 });
  }
}
