import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { confirmScheduleWithParties } from "@/lib/automation-engine";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

const scheduleSchema = z.object({
  start: z.string().refine((s) => !isNaN(Date.parse(s)), "Invalid start date"),
  end: z.string().refine((s) => !isNaN(Date.parse(s)), "Invalid end date"),
  payoutAmount: z.number().min(0).max(50000).optional()
}).refine((data) => new Date(data.end) > new Date(data.start), {
  message: "End must be after start",
  path: ["end"]
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
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

    const { jobId } = await params;

    const existingJob = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, tenantId: true }
    });

    if (!existingJob) {
      return NextResponse.json({ error: "Job not found", message: "Job not found" }, { status: 404 });
    }

    if (existingJob.tenantId !== viewer.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = scheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid schedule payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { start, end, payoutAmount } = parsed.data;

    const job = await prisma.job.update({
      where: { id: existingJob.id },
      data: {
        scheduledStart: new Date(start),
        scheduledEnd: new Date(end),
        payoutAmount: payoutAmount ?? null,
        status: "SCHEDULED"
      }
    });

    await confirmScheduleWithParties(job.id);

    return NextResponse.json({ jobId: job.id, status: job.status });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to schedule job", message: "Unable to schedule job" },
      { status: 500 }
    );
  }
}
