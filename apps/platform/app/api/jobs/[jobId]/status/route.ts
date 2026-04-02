import { NextResponse } from "next/server";
import { JobStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { sendOperationalSms, sendSms } from "@/src/lib/notifications";
import { awardXp, checkAchievements } from "@/src/lib/achievements";

export const dynamic = "force-dynamic";

const statusSchema = z.object({
  status: z.enum(["EN_ROUTE", "ON_SITE", "DONE"]),
  assignmentId: z.string().optional()
});

type CleanerStatus = z.infer<typeof statusSchema>["status"];

const formatCleanerName = (assignment: {
  cleaner: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
}) => {
  const { firstName, lastName } = assignment.cleaner.user;
  const full = `${firstName} ${lastName}`.trim();
  return full || "Your cleaner";
};

type LoadedJob = NonNullable<Awaited<ReturnType<typeof fetchJob>>>;

const notifyStakeholders = async ({
  status,
  job,
  assignment
}: {
  status: CleanerStatus;
  job: LoadedJob;
  assignment: LoadedJob["assignments"][number];
}) => {
  const cleanerName = formatCleanerName(assignment as any);
  const customerPhone = job.request.customerPhone;
  const addressLabel = `${job.request.addressLine1}, ${job.request.city}`;

  if (status === "EN_ROUTE") {
    if (customerPhone) {
      await sendSms({
        to: customerPhone,
        text: `${cleanerName} is on the way for your Tri State clean at ${addressLabel}.`
      });
    }
    await sendOperationalSms(`[Dispatch] ${cleanerName} is en route to ${job.request.customerName} (${addressLabel}).`);
  } else if (status === "DONE") {
    if (customerPhone) {
      await sendSms({
        to: customerPhone,
        text: `${cleanerName} just wrapped up your Tri State visit. Let us know if anything needs extra love.`
      });
    }
    await sendOperationalSms(`[Dispatch] ${cleanerName} completed ${job.request.customerName}'s clean (${addressLabel}).`);
  }
};

const fetchJob = async (jobId: string) =>
  prisma.job.findUnique({
    where: { id: jobId },
    include: {
      tenant: true,
      request: true,
      assignments: {
        include: {
          cleaner: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } }
            }
          }
        }
      }
    }
  });

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) => {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "CLEANER" && session.role !== "HQ") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const viewer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { tenantId: true }
    });

    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await request.json();
    const payload = statusSchema.parse(raw);
    const { jobId } = await params;
    const job = await fetchJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.tenantId !== viewer.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!job.assignments.length) {
      return NextResponse.json({ error: "No cleaner assigned yet" }, { status: 409 });
    }

    const assignment =
      (payload.assignmentId ? job.assignments.find((item) => item.id === payload.assignmentId) : undefined) ??
      (session.role === "CLEANER"
        ? job.assignments.find((item) => item.cleaner.userId === session.userId)
        : job.assignments[0]);

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    if (session.role === "CLEANER" && assignment.cleaner.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const assignmentUpdate: Prisma.JobAssignmentUpdateInput = {};
    const jobUpdate: Prisma.JobUpdateInput = {};
    let shouldNotify = false;

    switch (payload.status) {
      case "EN_ROUTE":
        if (!assignment.enRouteAt) {
          assignmentUpdate.enRouteAt = now;
          shouldNotify = true;
        }
        if (job.status === JobStatus.CLAIMED) {
          jobUpdate.status = JobStatus.SCHEDULED;
        }
        break;
      case "ON_SITE":
        if (!assignment.clockInAt) {
          assignmentUpdate.clockInAt = now;
        }
        if (job.status === JobStatus.CLAIMED) {
          jobUpdate.status = JobStatus.SCHEDULED;
        }
        break;
      case "DONE":
        if (!assignment.clockOutAt) {
          assignmentUpdate.clockOutAt = now;
          shouldNotify = true;
        }
        jobUpdate.status = JobStatus.COMPLETED;
        if (!job.scheduledEnd) {
          jobUpdate.scheduledEnd = now;
        }
        break;
      default:
        break;
    }

    const operations: Prisma.PrismaPromise<unknown>[] = [];

    if (Object.keys(assignmentUpdate).length > 0) {
      operations.push(
        prisma.jobAssignment.update({
          where: { id: assignment.id },
          data: assignmentUpdate
        })
      );
    }

    if (Object.keys(jobUpdate).length > 0) {
      operations.push(
        prisma.job.update({
          where: { id: job.id },
          data: jobUpdate
        })
      );
    }

    if (operations.length > 0) {
      await prisma.$transaction(operations);
    }

    if (shouldNotify) {
      await notifyStakeholders({ status: payload.status, job, assignment });
    }

    // Hook: Award XP to cleaners when job is completed
    if (payload.status === "DONE") {
      try {
        for (const jobAssignment of job.assignments) {
          const cleanerProfile = await prisma.cleanerProfile.findUnique({
            where: { id: jobAssignment.cleanerId },
            select: { userId: true }
          });
          if (cleanerProfile) {
            await awardXp(cleanerProfile.userId, "job_complete", 10, job.id, "job");
            await checkAchievements(cleanerProfile.userId);
          }
        }
      } catch (err) {
        console.error("[jobs] XP award failed:", err);
        // Don't fail the status update if XP award fails
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[jobs] status update failed", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 422 });
    }
    return NextResponse.json({ error: "Unable to update job status" }, { status: 500 });
  }
};
