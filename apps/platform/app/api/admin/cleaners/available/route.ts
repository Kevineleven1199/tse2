import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const startTime = searchParams.get("start");
    const endTime = searchParams.get("end");

    if (!date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Missing required params: date, start, end" },
        { status: 400 }
      );
    }

    // Build the requested time window
    const slotStart = new Date(`${date}T${startTime}:00`);
    const slotEnd = new Date(`${date}T${endTime}:00`);

    // Get all active cleaners
    const cleaners = await prisma.cleanerProfile.findMany({
      where: { active: true },
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Get all job assignments that overlap the requested time window
    const conflictingAssignments = await prisma.jobAssignment.findMany({
      where: {
        job: {
          scheduledStart: { lt: slotEnd },
          scheduledEnd: { gt: slotStart },
          status: { in: ["SCHEDULED", "CLAIMED"] },
        },
      },
      select: {
        cleanerId: true,
      },
    });

    // Count conflicts per cleaner
    const conflictCounts = new Map<string, number>();
    for (const a of conflictingAssignments) {
      conflictCounts.set(a.cleanerId, (conflictCounts.get(a.cleanerId) || 0) + 1);
    }

    // Build response
    const result = cleaners.map((c) => {
      const conflicts = conflictCounts.get(c.id) || 0;
      return {
        id: c.id,
        name: `${c.user.firstName} ${c.user.lastName}`.trim(),
        rating: c.rating,
        completedJobs: c.completedJobs,
        available: conflicts === 0,
        conflictCount: conflicts,
      };
    });

    // Sort: available first, then by rating desc
    result.sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      return b.rating - a.rating;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[available cleaners] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch available cleaners" },
      { status: 500 }
    );
  }
}
