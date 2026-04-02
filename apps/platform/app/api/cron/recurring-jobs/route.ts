import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ServiceType } from "@prisma/client";
import { calculateNextJobDate } from "@/src/lib/recurring-jobs";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    const dueSchedules = await prisma.recurringSchedule.findMany({
      where: {
        active: true,
        nextRunDate: { lte: now },
      },
    });

    let created = 0;

    for (const schedule of dueSchedules) {
      try {
        // Parse address into components (stored as single string in schedule)
        const addressParts = schedule.address.split(",").map((s: string) => s.trim());

        const serviceRequest = await prisma.serviceRequest.create({
          data: {
            tenantId: schedule.tenantId,
            customerName: schedule.customerName,
            customerEmail: schedule.customerEmail,
            customerPhone: schedule.customerPhone || "",
            addressLine1: addressParts[0] || schedule.address,
            city: addressParts[1] || "",
            state: addressParts[2] || "",
            postalCode: addressParts[3] || "",
            serviceType: (schedule.serviceType as ServiceType) || "HOME_CLEAN",
            status: "SCHEDULED",
            notes: schedule.notes || `Recurring ${schedule.frequency} service`,
          },
        });

        const newJob = await prisma.job.create({
          data: {
            tenantId: schedule.tenantId,
            requestId: serviceRequest.id,
            status: "PENDING",
            scheduledStart: schedule.nextRunDate,
            crewSize: 2,
            payoutAmount: schedule.basePrice,
            currency: "USD",
          },
        });

        // Auto-assign cleaners from the most recent completed job for this recurring schedule
        const previousJob = await prisma.job.findFirst({
          where: {
            tenantId: schedule.tenantId,
            request: { customerEmail: schedule.customerEmail },
            status: "COMPLETED",
            id: { not: newJob.id },
          },
          orderBy: { scheduledStart: "desc" },
          include: {
            assignments: {
              select: { cleanerId: true },
            },
          },
        });

        if (previousJob?.assignments?.length) {
          for (const assignment of previousJob.assignments) {
            await prisma.jobAssignment.create({
              data: {
                jobId: newJob.id,
                cleanerId: assignment.cleanerId,
                status: "ASSIGNED",
              },
            });
          }
          // Update status to SCHEDULED since we have assigned cleaners
          await prisma.job.update({
            where: { id: newJob.id },
            data: { status: "SCHEDULED" },
          });
        }

        const nextRunDate = calculateNextJobDate(
          schedule.frequency,
          schedule.nextRunDate
        );

        await prisma.recurringSchedule.update({
          where: { id: schedule.id },
          data: { nextRunDate, lastRunDate: now },
        });

        created++;
      } catch (scheduleError) {
        console.error(`Failed to process schedule ${schedule.id}:`, scheduleError);
      }
    }

    return NextResponse.json({ processed: dueSchedules.length, created, success: true });
  } catch (error) {
    console.error("Recurring jobs cron error:", error);
    return NextResponse.json({ error: "Failed to process recurring jobs" }, { status: 500 });
  }
}
