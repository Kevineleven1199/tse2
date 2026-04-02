import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId || session.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    // Get the job to find the assigned cleaner
    const job = await prisma.job.findUnique({
      where: { id: body.jobId },
      include: {
        assignments: {
          select: { cleanerId: true }
        }
      }
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const cleanerId = job.assignments[0]?.cleanerId;
    if (!cleanerId) {
      return NextResponse.json({ error: "No cleaner assigned to job" }, { status: 400 });
    }

    // Get session user email
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, tenantId: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tip = await prisma.tip.create({
      data: {
        tenantId: user.tenantId,
        customerEmail: user.email,
        amount: body.amount,
        jobId: body.jobId,
        cleanerId,
      },
    });
    return NextResponse.json(tip);
  } catch (error) {
    console.error("Failed to create tip:", error);
    return NextResponse.json({ error: "Failed to create tip" }, { status: 500 });
  }
}
