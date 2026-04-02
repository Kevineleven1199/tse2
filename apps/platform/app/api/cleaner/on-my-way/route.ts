import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/src/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { jobId, etaMinutes } = body;

    if (!jobId) {
      return NextResponse.json({ error: "jobId required" }, { status: 400 });
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        request: {
          select: {
            customerName: true,
            customerPhone: true,
            addressLine1: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const customerPhone = job.request.customerPhone;
    const customerName = job.request.customerName.split(" ")[0];
    const eta = etaMinutes || 15;

    const message = `Hi ${customerName}! Your Tri State cleaner is on the way and should arrive in about ${eta} minutes. See you soon! 🌿`;

    await sendSms({ to: customerPhone, text: message });

    // Update job status to indicate cleaner is en route
    if (job.status === "SCHEDULED" || job.status === "CLAIMED") {
      await prisma.job.update({
        where: { id: jobId },
        data: { status: "CLAIMED" },
      });
    }

    return NextResponse.json({
      success: true,
      message: `On-my-way SMS sent to ${customerName}`,
      eta
    });
  } catch (error) {
    console.error("[on-my-way] Failed:", error);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
