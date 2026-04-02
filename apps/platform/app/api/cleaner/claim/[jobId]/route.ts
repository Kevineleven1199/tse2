import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { smsCleanerClaimedToCustomer } from "@/src/lib/openphone";

export const dynamic = "force-dynamic";

export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) => {
  try {
    // Validate session
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user role
    if (session.role !== "CLEANER" && session.role !== "HQ") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get job ID from params
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Missing job ID" },
        { status: 400 }
      );
    }

    // Get cleaner profile
    const cleanerProfile = await prisma.cleanerProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });

    if (!cleanerProfile) {
      return NextResponse.json(
        { error: "Cleaner profile not found" },
        { status: 404 }
      );
    }

    // Atomic claim: check + assign + update in a single transaction
    // Prevents race condition where two cleaners claim the same job
    let assignment;
    let updatedJob;
    try {
      const result = await prisma.$transaction(async (tx) => {
        const job = await tx.job.findUnique({
          where: { id: jobId },
          select: {
            id: true,
            status: true,
            assignments: { select: { id: true } },
          },
        });

        if (!job) {
          throw new Error("JOB_NOT_FOUND");
        }
        if (job.status !== "PENDING") {
          throw new Error("JOB_NOT_AVAILABLE");
        }
        if (job.assignments.length > 0) {
          throw new Error("JOB_ALREADY_CLAIMED");
        }

        const newAssignment = await tx.jobAssignment.create({
          data: {
            jobId: job.id,
            cleanerId: cleanerProfile.id,
            status: "CLAIMED",
          },
        });

        const newJob = await tx.job.update({
          where: { id: job.id },
          data: { status: "CLAIMED" },
        });

        return { assignment: newAssignment, job: newJob };
      });

      assignment = result.assignment;
      updatedJob = result.job;
    } catch (txError: unknown) {
      const msg = txError instanceof Error ? txError.message : "";
      if (msg === "JOB_NOT_FOUND") {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      if (msg === "JOB_NOT_AVAILABLE") {
        return NextResponse.json({ error: "Job is no longer available" }, { status: 409 });
      }
      if (msg === "JOB_ALREADY_CLAIMED") {
        return NextResponse.json({ error: "This job has already been claimed" }, { status: 409 });
      }
      throw txError; // re-throw unexpected errors
    }

    // Notify customer via SMS (fire-and-forget)
    try {
      const jobWithDetails = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          request: { select: { customerName: true, customerPhone: true } },
        },
      });
      const cleanerUser = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { firstName: true, lastName: true },
      });

      if (jobWithDetails?.request && cleanerUser) {
        smsCleanerClaimedToCustomer({
          customerName: jobWithDetails.request.customerName,
          customerPhone: jobWithDetails.request.customerPhone,
          cleanerName: `${cleanerUser.firstName} ${cleanerUser.lastName}`.trim(),
        }).catch(console.error);
      }
    } catch {
      // SMS should never block the claim response
    }

    // ─── DUAL-CONFIRMATION CHECK: if a DraftEstimate is linked, check if both sides confirmed ───
    try {
      const linkedDraft = await prisma.draftEstimate.findFirst({
        where: { jobId: updatedJob.id, customerConfirmed: true, cleanerConfirmed: false },
      });
      if (linkedDraft) {
        await prisma.draftEstimate.update({
          where: { id: linkedDraft.id },
          data: {
            cleanerConfirmed: true,
            confirmedCleanerId: cleanerProfile.id,
            status: "cleaner_confirmed",
          },
        });
        // Both confirmed → finalize booking (Calendar + Jobber + notifications)
        const { finalizeBooking } = await import("@/src/lib/booking-finalizer");
        finalizeBooking(linkedDraft.id).catch((e: unknown) =>
          console.error("[cleaner/claim] finalizeBooking failed:", e)
        );
      }
    } catch (e) {
      console.warn("[cleaner/claim] Dual-confirm check failed (non-blocking):", e);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Job claimed successfully",
        assignment: {
          id: assignment.id,
          jobId: assignment.jobId,
          claimedAt: assignment.claimedAt,
        },
        job: {
          id: updatedJob.id,
          status: updatedJob.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[cleaner/claim] Failed to claim job", error);
    return NextResponse.json(
      { error: "Failed to claim job" },
      { status: 500 }
    );
  }
};

// Optional: Handle GET request to redirect to the job claim page
export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) => {
  try {
    // Validate session
    const session = await getSession();
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Check user role
    if (session.role !== "CLEANER" && session.role !== "HQ") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Get job ID from params
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Missing job ID" },
        { status: 400 }
      );
    }

    // Get cleaner profile
    const cleanerProfile = await prisma.cleanerProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });

    if (!cleanerProfile) {
      return NextResponse.json(
        { error: "Cleaner profile not found" },
        { status: 404 }
      );
    }

    // Atomic claim via transaction (same as POST handler)
    try {
      await prisma.$transaction(async (tx) => {
        const job = await tx.job.findUnique({
          where: { id: jobId },
          select: { id: true, status: true, assignments: { select: { id: true } } },
        });
        if (!job || job.status !== "PENDING" || job.assignments.length > 0) {
          throw new Error("JOB_UNAVAILABLE");
        }
        await tx.jobAssignment.create({
          data: { jobId: job.id, cleanerId: cleanerProfile.id, status: "CLAIMED" },
        });
        await tx.job.update({ where: { id: job.id }, data: { status: "CLAIMED" } });
      });
    } catch {
      return NextResponse.redirect(new URL("/employee-hub/jobs?error=job-unavailable", request.url));
    }

    // Redirect to cleaner jobs page with success message
    return NextResponse.redirect(new URL("/employee-hub/jobs?claimed=true", request.url));
  } catch (error) {
    console.error("[cleaner/claim] Failed to claim job via GET", error);
    return NextResponse.redirect(
      new URL("/employee-hub/jobs?error=claim-failed", request.url)
    );
  }
};
