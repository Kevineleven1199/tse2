import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { JobStatus } from "@prisma/client";
import { autoAssignCleaner } from "@/lib/automation-engine";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { serviceRequestId } = body as { serviceRequestId: string };

    if (!serviceRequestId) {
      return NextResponse.json({ error: "serviceRequestId required" }, { status: 400 });
    }

    // Find the original service request
    const original = await prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      include: {
        quote: { select: { total: true, subtotal: true, fees: true, taxes: true } },
      },
    });

    if (!original) {
      return NextResponse.json({ error: "Service request not found" }, { status: 404 });
    }

    // Create new service request (re-book)
    const newRequest = await prisma.serviceRequest.create({
      data: {
        tenantId: original.tenantId,
        customerName: original.customerName,
        customerEmail: original.customerEmail,
        customerPhone: original.customerPhone,
        addressLine1: original.addressLine1,
        addressLine2: original.addressLine2,
        city: original.city,
        state: original.state,
        postalCode: original.postalCode,
        serviceType: original.serviceType,
        squareFootage: original.squareFootage,
        surfaces: original.surfaces,
        notes: original.notes ? `Re-book: ${original.notes}` : "Re-book from client portal",
        status: "NEW",
      },
    });

    // Create quote if original had one
    if (original.quote) {
      await prisma.quote.create({
        data: {
          requestId: newRequest.id,
          total: original.quote.total,
          subtotal: original.quote.subtotal,
          fees: original.quote.fees,
          taxes: original.quote.taxes,
          smartNotes: "Re-booked from client portal",
        },
      });
    }

    // Create job
    const job = await prisma.job.create({
      data: {
        tenantId: original.tenantId,
        requestId: newRequest.id,
        status: JobStatus.PENDING,
      },
    });

    // Try to auto-assign a cleaner (non-blocking)
    autoAssignCleaner(job.id).catch((err) =>
      console.error("[book-again] Auto-assign failed:", err)
    );

    return NextResponse.json({
      success: true,
      jobId: job.id,
      requestId: newRequest.id,
      message: "Your service has been re-booked! We'll confirm your cleaner and schedule shortly.",
    });
  } catch (error) {
    console.error("[book-again] Error:", error);
    return NextResponse.json({ error: "Failed to re-book service" }, { status: 500 });
  }
}
