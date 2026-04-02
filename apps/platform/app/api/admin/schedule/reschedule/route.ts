import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

const rescheduleJobSchema = z.object({
  jobId: z.string().min(1),
  newScheduledStart: z.string().datetime(),
  newScheduledEnd: z.string().datetime(),
});

type RescheduleJobInput = z.infer<typeof rescheduleJobSchema>;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !["HQ", "MANAGER"].includes(session.role || "")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { jobId, newScheduledStart, newScheduledEnd } =
      rescheduleJobSchema.parse(body);

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        request: true,
        assignments: { include: { cleaner: true } },
        notifications: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Validate new times
    const newStart = new Date(newScheduledStart);
    const newEnd = new Date(newScheduledEnd);

    if (newStart >= newEnd) {
      return NextResponse.json(
        { error: "Start time must be before end time" },
        { status: 400 }
      );
    }

    // Check for conflicts with other jobs for assigned cleaners
    const assignedCleanerIds = job.assignments.map((a) => a.cleanerId);

    if (assignedCleanerIds.length > 0) {
      const conflicts = await prisma.job.findMany({
        where: {
          id: { not: jobId },
          status: { in: ["CLAIMED", "SCHEDULED", "COMPLETED"] },
          assignments: {
            some: {
              cleanerId: { in: assignedCleanerIds },
            },
          },
          OR: [
            {
              scheduledStart: { lt: newEnd },
              scheduledEnd: { gt: newStart },
            },
          ],
        },
      });

      if (conflicts.length > 0) {
        return NextResponse.json(
          {
            error: "Scheduling conflict: assigned cleaners have overlapping jobs",
            conflictingJobIds: conflicts.map((j) => j.id),
          },
          { status: 409 }
        );
      }
    }

    // Update job
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        scheduledStart: newStart,
        scheduledEnd: newEnd,
      },
      include: {
        request: true,
        assignments: { include: { cleaner: { include: { user: { select: { id: true, firstName: true, lastName: true } } } } } },
      },
    });

    return NextResponse.json({
      success: true,
      job: {
        id: updatedJob.id,
        scheduledStart: updatedJob.scheduledStart,
        scheduledEnd: updatedJob.scheduledEnd,
        status: updatedJob.status,
        customerName: updatedJob.request?.customerName,
        assignedCleaners: updatedJob.assignments.map((a) => ({
          id: a.cleaner.id,
          name: `${a.cleaner.user.firstName} ${a.cleaner.user.lastName}`,
        })),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Reschedule job error:", error);
    return NextResponse.json(
      { error: "Failed to reschedule job" },
      { status: 500 }
    );
  }
}
