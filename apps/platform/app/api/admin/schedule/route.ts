import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { ServiceType, JobStatus } from "@prisma/client";
import { finalizeJobAutomation } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// No demo data — real data only

export const GET = async (request: NextRequest) => {
  try {
    const session = await getSession();
    if (!session || session.role !== "HQ") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json({ error: "Missing start or end date" }, { status: 400 });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    const jobs = await prisma.job.findMany({
      where: {
        tenantId: session.tenantId,
        scheduledStart: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        request: {
          select: {
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            addressLine1: true,
            city: true,
            serviceType: true,
            notes: true
          }
        },
        assignments: {
          include: {
            cleaner: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (jobs.length === 0) {
      return NextResponse.json([]);
    }

    const formattedJobs = jobs.map((job) => ({
      id: job.id,
      customerId: job.requestId, // Service request ID to link to customer detail
      customerName: job.request.customerName,
      customerEmail: job.request.customerEmail,
      customerPhone: job.request.customerPhone,
      service: job.request.serviceType,
      status: job.status,
      scheduledStart: job.scheduledStart?.toISOString() || new Date().toISOString(),
      scheduledEnd: job.scheduledEnd?.toISOString() || new Date().toISOString(),
      cleaner: job.assignments.length > 0
        ? `${job.assignments[0].cleaner.user.firstName} ${job.assignments[0].cleaner.user.lastName}`
        : "Unassigned",
      address: job.request.addressLine1,
      city: job.request.city,
      notes: job.request.notes
    }));

    return NextResponse.json(formattedJobs);
  } catch (error) {
    console.error("Schedule GET error:", error);
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 });
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const session = await getSession();
    if (!session || session.role !== "HQ") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
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

    const b = body as Record<string, string>;
    const { customerName, customerEmail, customerPhone, serviceType, scheduledStart, scheduledEnd, address, city, notes } = b;

    if (!customerName || !customerEmail || !customerPhone || !serviceType || !scheduledStart || !scheduledEnd || !address || !city) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create service request
    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        tenantId: session.tenantId,
        customerName,
        customerEmail,
        customerPhone,
        addressLine1: address,
        city,
        state: "FL",
        postalCode: "00000",
        serviceType: serviceType as ServiceType,
        notes: notes || undefined,
        status: "SCHEDULED"
      }
    });

    // Create job — derive estimated hours from schedule duration
    const durationMs = new Date(scheduledEnd).getTime() - new Date(scheduledStart).getTime();
    const estimatedHours = Math.round((durationMs / 3600000) * 10) / 10;

    const job = await prisma.job.create({
      data: {
        tenantId: session.tenantId,
        requestId: serviceRequest.id,
        status: JobStatus.SCHEDULED,
        scheduledStart: new Date(scheduledStart),
        scheduledEnd: new Date(scheduledEnd),
        estimatedHours
      },
      include: {
        request: {
          select: {
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            addressLine1: true,
            city: true,
            serviceType: true,
            notes: true
          }
        },
        assignments: {
          include: {
            cleaner: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Trigger Google Calendar sync + notifications (non-blocking)
    try {
      await finalizeJobAutomation(job.id);
    } catch (calErr) {
      console.warn("[admin/schedule] Calendar sync failed (non-blocking):", calErr);
    }

    return NextResponse.json({
      id: job.id,
      customerName: job.request.customerName,
      customerEmail: job.request.customerEmail,
      customerPhone: job.request.customerPhone,
      service: job.request.serviceType,
      status: job.status,
      scheduledStart: job.scheduledStart?.toISOString(),
      scheduledEnd: job.scheduledEnd?.toISOString(),
      cleaner: "Unassigned",
      address: job.request.addressLine1,
      city: job.request.city,
      notes: job.request.notes
    });
  } catch (error) {
    console.error("[admin/schedule] POST error:", error);
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
};

export const PUT = async (request: NextRequest) => {
  try {
    const session = await getSession();
    if (!session || session.role !== "HQ") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
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

    const { jobId, status, notes } = body as Record<string, string>;

    if (!jobId || !status) {
      return NextResponse.json({ error: "Missing jobId or status" }, { status: 400 });
    }

    // Verify job belongs to this tenant before updating
    const existingJob = await prisma.job.findFirst({
      where: { id: jobId, tenantId: session.tenantId },
      select: { id: true },
    });
    if (!existingJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Update job status
    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: status as JobStatus,
        updatedAt: new Date()
      },
      include: {
        request: {
          select: {
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            addressLine1: true,
            city: true,
            serviceType: true,
            notes: true
          }
        },
        assignments: {
          include: {
            cleaner: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Update request notes if provided
    if (notes) {
      await prisma.serviceRequest.update({
        where: { id: job.requestId },
        data: { notes }
      });
    }

    // If status changed to SCHEDULED, trigger calendar sync
    if (status === "SCHEDULED") {
      try {
        await finalizeJobAutomation(job.id);
      } catch (calErr) {
        console.warn("[admin/schedule] Calendar sync failed (non-blocking):", calErr);
      }
    }

    return NextResponse.json({
      id: job.id,
      customerName: job.request.customerName,
      customerEmail: job.request.customerEmail,
      customerPhone: job.request.customerPhone,
      service: job.request.serviceType,
      status: job.status,
      scheduledStart: job.scheduledStart?.toISOString(),
      scheduledEnd: job.scheduledEnd?.toISOString(),
      cleaner: job.assignments.length > 0
        ? `${job.assignments[0].cleaner.user.firstName} ${job.assignments[0].cleaner.user.lastName}`
        : "Unassigned",
      address: job.request.addressLine1,
      city: job.request.city,
      notes: job.request.notes
    });
  } catch (error) {
    console.error("[admin/schedule] PUT error:", error);
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
};
