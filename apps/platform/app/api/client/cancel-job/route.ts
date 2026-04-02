import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { jobId } = body;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        request: {
          select: { customerEmail: true }
        }
      }
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Verify that the user making the request is the customer
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || user.email !== job.request.customerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update job status to cancelled
    const updated = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "CANCELED",
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Cancel job error:", error);
    return NextResponse.json({ error: "Cancellation failed" }, { status: 500 });
  }
}
