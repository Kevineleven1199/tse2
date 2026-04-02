import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Fetch cancellation policies
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !["HQ", "MANAGER"].includes(session.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const policies = await prisma.cancellationPolicy.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { hoursBeforeJob: "asc" },
  });

  return NextResponse.json({ policies });
}

// POST: Create/update policy OR apply fee to a job cancellation
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "HQ") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // If jobId provided, apply cancellation fee to a job
    if (body.jobId) {
      const job = await prisma.job.findUnique({
        where: { id: body.jobId },
        include: {
          request: {
            select: {
              customerName: true,
              customerEmail: true,
              customerPhone: true,
            },
            include: {
              quote: true,
            },
          },
        },
      });

      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      // Check if job has a scheduled start
      if (!job.scheduledStart) {
        return NextResponse.json({ error: "Job has no scheduled start time" }, { status: 400 });
      }

      // Calculate hours until job
      const hoursUntilJob = (job.scheduledStart.getTime() - Date.now()) / (1000 * 60 * 60);

      // Find applicable cancellation policy
      const policy = await prisma.cancellationPolicy.findFirst({
        where: {
          tenantId: session.tenantId,
          active: true,
          hoursBeforeJob: { gte: Math.floor(hoursUntilJob) },
        },
        orderBy: { hoursBeforeJob: "asc" },
      });

      if (!policy) {
        // Cancel without fee
        await prisma.job.update({
          where: { id: body.jobId },
          data: { status: "CANCELED" },
        });
        await prisma.serviceRequest.update({
          where: { id: job.requestId },
          data: { status: "CANCELED" },
        });
        return NextResponse.json({
          success: true,
          feeApplied: false,
          message: "Job cancelled — no fee (outside cancellation window)"
        });
      }

      // Calculate fee
      const jobTotal = job.request.quote?.total || job.payoutAmount || 0;
      const fee = policy.feeType === "FLAT"
        ? policy.feeValue
        : (jobTotal * policy.feeValue / 100);

      // Cancel the job
      await prisma.job.update({
        where: { id: body.jobId },
        data: { status: "CANCELED" },
      });
      await prisma.serviceRequest.update({
        where: { id: job.requestId },
        data: { status: "CANCELED" },
      });

      // Create an invoice for the cancellation fee
      const invoiceNumber = `CF-${Date.now().toString(36).toUpperCase()}`;
      await prisma.invoice.create({
        data: {
          tenantId: session.tenantId,
          invoiceNumber,
          customerName: job.request.customerName,
          customerEmail: job.request.customerEmail,
          jobId: body.jobId,
          lineItems: [{
            description: `Cancellation fee (${policy.name} — cancelled ${Math.round(hoursUntilJob)}h before scheduled time)`,
            quantity: 1,
            unitPrice: fee,
            total: fee
          }],
          subtotal: fee,
          total: fee,
          status: "SENT",
          sentAt: new Date(),
          dueDate: new Date(Date.now() + 7 * 86400000),
          notes: `Auto-generated cancellation fee for job ${body.jobId}`,
        },
      });

      return NextResponse.json({
        success: true,
        feeApplied: true,
        feeAmount: fee,
        policy: policy.name,
        invoiceNumber,
        message: `Job cancelled — $${fee.toFixed(2)} cancellation fee applied`
      });
    }

    // Otherwise, create/update a cancellation policy
    const { name, hoursBeforeJob, feeType, feeValue } = body;
    if (!name || !hoursBeforeJob || !feeType || feeValue === undefined) {
      return NextResponse.json({ error: "Missing required fields: name, hoursBeforeJob, feeType, feeValue" }, { status: 400 });
    }

    const policy = await prisma.cancellationPolicy.create({
      data: {
        tenantId: session.tenantId,
        name,
        hoursBeforeJob,
        feeType,
        feeValue,
        active: true,
      },
    });

    return NextResponse.json({ success: true, policy });
  } catch (error) {
    console.error("[cancellation-fee] Failed:", error);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
