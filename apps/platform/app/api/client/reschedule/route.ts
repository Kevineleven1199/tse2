import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { sendOperationalSms } from "@/src/lib/notifications";

export const dynamic = "force-dynamic";

const slotSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime()
});

const rescheduleSchema = z.object({
  jobId: z.string().min(1).max(255),
  reason: z.string().min(5).max(600),
  slots: z.array(slotSchema).min(1).max(5)
});

export const POST = async (request: Request) => {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const viewer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        tenantId: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true
      }
    });

    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const payload = rescheduleSchema.parse(body);

    const job = await prisma.job.findUnique({
      where: { id: payload.jobId },
      include: { request: true }
    });

    if (!job || job.tenantId !== viewer.tenantId) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    if (session.role === "CUSTOMER" && job.request.customerEmail.toLowerCase() !== viewer.email.toLowerCase()) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    const slots = payload.slots.map((slot) => ({
      start: new Date(slot.start),
      end: new Date(slot.end)
    }));

    const invalidSlot = slots.find((slot) => Number.isNaN(slot.start.getTime()) || Number.isNaN(slot.end.getTime()) || slot.end <= slot.start);
    if (invalidSlot) {
      return NextResponse.json({ error: "Invalid availability windows." }, { status: 422 });
    }

    const customerName = `${viewer.firstName} ${viewer.lastName}`.trim() || viewer.email;

    await prisma.auditLog.create({
      data: {
        tenantId: viewer.tenantId,
        actorId: viewer.id,
        action: "RESCHEDULE_REQUESTED",
        metadata: {
          jobId: job.id,
          reason: payload.reason,
          slots: payload.slots
        }
      }
    });

    const scheduledLabel = job.scheduledStart
      ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(job.scheduledStart)
      : "Unscheduled";

    const slotsLabel = slots
      .map((slot) =>
        `${new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(slot.start)} ${new Intl.DateTimeFormat("en-US", { timeStyle: "short" }).format(slot.start)}–${new Intl.DateTimeFormat("en-US", { timeStyle: "short" }).format(slot.end)}`
      )
      .join(", ");

    const smsBody = [
      `Reschedule request from ${customerName}`,
      `Email: ${viewer.email}`,
      viewer.phone ? `Phone: ${viewer.phone}` : null,
      `Job: ${job.id}`,
      `Current: ${scheduledLabel}`,
      `Preferred: ${slotsLabel}`,
      `Reason: ${payload.reason}`
    ]
      .filter(Boolean)
      .join("\n");

    await sendOperationalSms(smsBody);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[client-reschedule] Failed to submit reschedule request", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid reschedule payload", details: error.flatten() },
        { status: 422 }
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Unable to submit reschedule request" }, { status: 500 });
  }
};
