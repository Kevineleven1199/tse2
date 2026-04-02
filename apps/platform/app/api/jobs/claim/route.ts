import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendOperationalSms, sendSms } from "@/src/lib/notifications";
import { getSession } from "@/src/lib/auth/session";
import { notifyCustomerJobClaimed } from "@/lib/automation-engine";

export const dynamic = "force-dynamic";

const claimSchema = z.object({
  jobId: z.string(),
  cleanerId: z.string().optional()
});

export const POST = async (request: Request) => {
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

    const body = (await request.json().catch(() => ({}))) as unknown;
    const payload = claimSchema.parse(body);

    if (session.role !== "CLEANER" && session.role !== "HQ") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const job = await prisma.job.findUnique({
      where: { id: payload.jobId },
      include: {
        assignments: true,
        request: true
      }
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    if (job.tenantId !== viewer.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (job.status !== "PENDING") {
      return NextResponse.json({ error: "Job already claimed." }, { status: 409 });
    }

    if (job.assignments.some((assignment: { status: string }) => assignment.status === "CLAIMED")) {
      return NextResponse.json({ error: "Job already claimed." }, { status: 409 });
    }

    let cleanerProfileId: string | null = null;
    let cleanerName: string | null = session.name ?? null;
    let cleanerPhone: string | null = null;

    if (session.role === "CLEANER") {
      const profile = await prisma.cleanerProfile.findUnique({
        where: { userId: session.userId },
        select: {
          id: true,
          user: {
            select: {
              tenantId: true,
              phone: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      if (!profile) {
        return NextResponse.json({ error: "Cleaner profile not found." }, { status: 404 });
      }

      if (profile.user.tenantId !== viewer.tenantId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      cleanerProfileId = profile.id;
      cleanerName = `${profile.user.firstName} ${profile.user.lastName}`.trim() || cleanerName;
      cleanerPhone = profile.user.phone ?? null;
    } else {
      if (!payload.cleanerId) {
        return NextResponse.json({ error: "cleanerId required", message: "cleanerId required" }, { status: 400 });
      }

      const profile = await prisma.cleanerProfile.findUnique({
        where: { id: payload.cleanerId },
        select: {
          id: true,
          user: {
            select: {
              tenantId: true,
              phone: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      if (!profile) {
        return NextResponse.json({ error: "Cleaner profile not found." }, { status: 404 });
      }

      if (profile.user.tenantId !== viewer.tenantId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      cleanerProfileId = profile.id;
      cleanerName = `${profile.user.firstName} ${profile.user.lastName}`.trim() || profile.id;
      cleanerPhone = profile.user.phone ?? null;
    }

    if (!cleanerProfileId) {
      return NextResponse.json({ error: "Cleaner profile not found." }, { status: 404 });
    }

    const claimed = await prisma.$transaction(async (tx) => {
      const updated = await tx.job.updateMany({
        where: {
          id: payload.jobId,
          status: "PENDING"
        },
        data: {
          status: "CLAIMED"
        }
      });

      if (updated.count !== 1) {
        return false;
      }

      await tx.jobAssignment.create({
        data: {
          jobId: payload.jobId,
          cleanerId: cleanerProfileId,
          status: "CLAIMED"
        }
      });

      return true;
    });

    if (!claimed) {
      return NextResponse.json({ error: "Job already claimed." }, { status: 409 });
    }

    await sendOperationalSms(
      `Job ${payload.jobId} claimed by ${cleanerName ?? cleanerProfileId}. Confirm schedule and notify customer.`
    );

    const normalizedCleanerPhone = cleanerPhone ? cleanerPhone.replace(/[^\d+]/g, "") : null;

    if (normalizedCleanerPhone) {
      await sendSms({
        to: normalizedCleanerPhone,
        text: `Thanks for claiming ${job.request.customerName}'s clean. Confirm visit details in the Tri State portal.`
      });
    }

    // Notify customer that their job has been claimed
    notifyCustomerJobClaimed(payload.jobId).catch((err) => {
      console.error("[jobs] Failed to notify customer of claim", err);
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[jobs] Claim error", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid claim payload", details: error.flatten() }, { status: 422 });
    }
    return NextResponse.json({ error: "Unable to claim job" }, { status: 500 });
  }
};
