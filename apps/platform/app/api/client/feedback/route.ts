import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { sendOperationalSms } from "@/src/lib/notifications";

export const dynamic = "force-dynamic";

const feedbackSchema = z.object({
  rating: z.coerce.number().min(1).max(5).optional(),
  message: z.string().min(5),
  cleanerId: z.string().optional(),
  cleanerName: z.string().optional()
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

    const payload = feedbackSchema.parse(await request.json());

    const customerName = `${viewer.firstName} ${viewer.lastName}`.trim() || viewer.email;
    const clippedMessage = payload.message.length > 400 ? `${payload.message.slice(0, 400)}…` : payload.message;

    await prisma.auditLog.create({
      data: {
        tenantId: viewer.tenantId,
        actorId: viewer.id,
        action: "CUSTOMER_FEEDBACK",
        metadata: {
          rating: payload.rating ?? null,
          message: clippedMessage,
          cleanerId: payload.cleanerId ?? null,
          cleanerName: payload.cleanerName ?? null
        }
      }
    });

    const smsBody = [
      `Client feedback from ${customerName}`,
      `Email: ${viewer.email}`,
      viewer.phone ? `Phone: ${viewer.phone}` : null,
      payload.cleanerName ? `Cleaner: ${payload.cleanerName}` : null,
      payload.rating ? `Rating: ${payload.rating}/5` : null,
      `Message: ${clippedMessage}`
    ]
      .filter(Boolean)
      .join("\n");

    await sendOperationalSms(smsBody);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[client-feedback] Failed to submit feedback", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid feedback payload", details: error.flatten() },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: "Unable to submit feedback" }, { status: 500 });
  }
};
