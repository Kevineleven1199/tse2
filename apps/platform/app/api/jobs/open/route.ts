import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

export const GET = async () => {
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

    const tenantId = viewer.tenantId;

    const openJobs = await prisma.job.findMany({
      where: {
        tenantId,
        status: { in: [JobStatus.PENDING, JobStatus.CLAIMED] },
        assignments: {
          none: { status: "CLAIMED" }
        }
      },
      include: {
        request: {
          include: {
            quote: true,
            schedulingOptions: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 50
    });

    const payload = openJobs.map((job) => ({
      id: job.id,
      requestId: job.requestId,
      quoteId: job.request.quote?.id,
      customer: {
        name: job.request.customerName,
        phone: job.request.customerPhone,
        email: job.request.customerEmail
      },
      address: {
        line1: job.request.addressLine1,
        line2: job.request.addressLine2,
        city: job.request.city,
        state: job.request.state,
        postalCode: job.request.postalCode
      },
      serviceType: job.request.serviceType,
      squareFootage: job.request.squareFootage,
      notes: job.request.notes,
      payoutAmount: job.payoutAmount,
      status: job.status,
      createdAt: job.createdAt,
      preferredWindows: job.request.preferredWindows,
      quoteTotal: job.request.quote?.total,
      schedulingOptions: job.request.schedulingOptions
    }));

    return NextResponse.json({ jobs: payload });
  } catch (error) {
    console.error("[jobs] Failed to load open jobs", error);
    return NextResponse.json({ error: "Unable to fetch open jobs." }, { status: 500 });
  }
};
