import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { ServiceType, JobStatus } from "@prisma/client";
import { finalizeJobAutomation } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/jobs — Create a job manually (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const b = body as Record<string, unknown>;

    // Required fields
    const customerName = b.customerName as string | undefined;
    const customerEmail = b.customerEmail as string | undefined;
    const customerPhone = b.customerPhone as string | undefined;
    const serviceType = b.serviceType as string | undefined;
    const address = b.address as string | undefined;
    const city = b.city as string | undefined;
    const scheduledDate = b.scheduledDate as string | undefined;

    if (!customerName || !customerEmail || !customerPhone || !serviceType || !address || !city || !scheduledDate) {
      return NextResponse.json(
        { error: "Missing required fields: customerName, customerEmail, customerPhone, serviceType, address, city, scheduledDate" },
        { status: 400 }
      );
    }

    // Validate serviceType
    const validServiceTypes: string[] = ["HOME_CLEAN", "PRESSURE_WASH", "AUTO_DETAIL", "CUSTOM"];
    if (!validServiceTypes.includes(serviceType)) {
      return NextResponse.json(
        { error: `Invalid serviceType. Must be one of: ${validServiceTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Optional fields
    const estimatedHours = b.estimatedHours ? Number(b.estimatedHours) : undefined;
    const quotedPrice = b.quotedPrice ? Number(b.quotedPrice) : undefined;
    const notes = (b.notes as string) || undefined;
    const assignedCleanerId = (b.assignedCleanerId as string) || undefined;
    const startTime = (b.startTime as string) || "09:00";
    const endTime = (b.endTime as string) || undefined;

    const tenantId = session.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 403 });
    }

    // Build scheduled timestamps
    const scheduledStart = new Date(`${scheduledDate}T${startTime}:00`);
    const scheduledEnd = endTime
      ? new Date(`${scheduledDate}T${endTime}:00`)
      : new Date(scheduledStart.getTime() + (estimatedHours || 2) * 3600000);

    // Determine status
    const jobStatus = assignedCleanerId ? JobStatus.SCHEDULED : JobStatus.PENDING;

    // Create the ServiceRequest first (Job requires a linked request)
    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        tenantId,
        customerName,
        customerEmail,
        customerPhone,
        addressLine1: address,
        city,
        state: (b.state as string) || "FL",
        postalCode: (b.postalCode as string) || "00000",
        serviceType: serviceType as ServiceType,
        notes,
        status: assignedCleanerId ? "SCHEDULED" : "NEW",
      },
    });

    // Create the Job
    const job = await prisma.job.create({
      data: {
        tenantId,
        requestId: serviceRequest.id,
        status: jobStatus,
        scheduledStart,
        scheduledEnd,
        estimatedHours,
        payoutAmount: quotedPrice,
      },
    });

    // Create JobAssignment if a cleaner was specified
    if (assignedCleanerId) {
      // Verify cleaner exists AND belongs to the same tenant
      const cleaner = await prisma.cleanerProfile.findFirst({
        where: {
          id: assignedCleanerId,
          user: { tenantId },
        },
        select: { id: true },
      });

      if (cleaner) {
        await prisma.jobAssignment.create({
          data: {
            jobId: job.id,
            cleanerId: assignedCleanerId,
            status: "CLAIMED",
          },
        });
      }
    }

    // Fetch the complete job with relations for the response
    const fullJob = await prisma.job.findUnique({
      where: { id: job.id },
      include: {
        request: {
          select: {
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            addressLine1: true,
            city: true,
            serviceType: true,
            notes: true,
          },
        },
        assignments: {
          include: {
            cleaner: {
              include: {
                user: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
    });

    // Trigger calendar sync + notifications (non-blocking)
    if (jobStatus === JobStatus.SCHEDULED) {
      try {
        await finalizeJobAutomation(job.id);
      } catch (calErr) {
        console.warn("[admin/jobs] Calendar sync failed (non-blocking):", calErr);
      }
    }

    const cleanerName = fullJob?.assignments[0]?.cleaner?.user
      ? `${fullJob.assignments[0].cleaner.user.firstName} ${fullJob.assignments[0].cleaner.user.lastName}`.trim()
      : "Unassigned";

    return NextResponse.json({
      id: job.id,
      customerName: fullJob?.request.customerName,
      customerEmail: fullJob?.request.customerEmail,
      customerPhone: fullJob?.request.customerPhone,
      service: fullJob?.request.serviceType,
      status: fullJob?.status,
      scheduledStart: fullJob?.scheduledStart?.toISOString(),
      scheduledEnd: fullJob?.scheduledEnd?.toISOString(),
      cleaner: cleanerName,
      address: fullJob?.request.addressLine1,
      city: fullJob?.request.city,
      notes: fullJob?.request.notes,
      payoutAmount: fullJob?.payoutAmount,
    });
  } catch (error) {
    console.error("[admin/jobs] POST error:", error);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}
