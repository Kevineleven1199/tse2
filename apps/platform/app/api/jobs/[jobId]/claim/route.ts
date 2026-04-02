import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const viewer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { tenantId: true }
    });

    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await params;

    const body = (await request.json().catch(() => ({}))) as { cleanerId?: string };

    if (session.role !== "CLEANER" && session.role !== "HQ") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const cleanerProfileId =
      session.role === "CLEANER"
        ? (await prisma.cleanerProfile.findUnique({
            where: { userId: session.userId },
            select: { id: true }
          }))?.id
        : body.cleanerId;

    if (!cleanerProfileId) {
      return NextResponse.json({ error: "cleanerId required", message: "cleanerId required" }, { status: 400 });
    }

    if (session.role === "HQ") {
      const profile = await prisma.cleanerProfile.findUnique({
        where: { id: cleanerProfileId },
        select: { user: { select: { tenantId: true } } }
      });

      if (!profile) {
        return NextResponse.json({ error: "Cleaner profile not found" }, { status: 404 });
      }

      if (profile.user.tenantId !== viewer.tenantId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Verify job exists and belongs to tenant
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, tenantId: true }
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.tenantId !== viewer.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Atomic claim: updateMany with status guard prevents TOCTOU race
    const claimed = await prisma.$transaction(async (tx) => {
      const updated = await tx.job.updateMany({
        where: { id: jobId, status: JobStatus.PENDING },
        data: { status: JobStatus.CLAIMED }
      });
      if (updated.count !== 1) return false;
      await tx.jobAssignment.create({
        data: {
          jobId,
          cleanerId: cleanerProfileId,
          status: "CLAIMED"
        }
      });
      return true;
    });

    if (!claimed) {
      return NextResponse.json({ error: "Job already claimed" }, { status: 409 });
    }

    return NextResponse.json({ jobId, status: "CLAIMED" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to claim job", message: "Unable to claim job" }, { status: 500 });
  }
}
