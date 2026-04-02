import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { JobStatus } from "@prisma/client";
import { sendSms, sendEmail } from "@/src/lib/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// No demo data — real data only

export const GET = async (request: NextRequest) => {
  try {
    const session = await getSession();
    if (!session || !["CLEANER", "HQ"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const dateParam = searchParams.get("date") || new Date().toISOString().split("T")[0];

    let dayStart: Date;
    let dayEnd: Date;

    if (fromParam && toParam) {
      // Date range mode (for calendar month view)
      dayStart = new Date(fromParam);
      dayStart.setHours(0, 0, 0, 0);
      dayEnd = new Date(toParam);
      dayEnd.setHours(23, 59, 59, 999);
    } else {
      // Single date mode (backward compatible)
      const targetDate = new Date(dateParam);
      dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);
    }

    // Find cleaner profile for current user
    const cleaner = await prisma.cleanerProfile.findUnique({
      where: { userId: session.userId }
    });

    if (!cleaner) {
      return NextResponse.json([]);
    }

    // Find jobs assigned to this cleaner for the date
    const jobs = await prisma.job.findMany({
      where: {
        assignments: {
          some: {
            cleanerId: cleaner.id
          }
        },
        scheduledStart: {
          gte: dayStart,
          lte: dayEnd
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
        }
      }
    });

    if (jobs.length === 0) {
      return NextResponse.json([]);
    }

    const formattedJobs = jobs.map((job) => ({
      id: job.id,
      customerName: job.request.customerName,
      customerEmail: job.request.customerEmail,
      customerPhone: job.request.customerPhone,
      service: job.request.serviceType,
      status: job.status,
      scheduledStart: job.scheduledStart?.toISOString() || new Date().toISOString(),
      scheduledEnd: job.scheduledEnd?.toISOString() || new Date().toISOString(),
      address: job.request.addressLine1,
      city: job.request.city,
      notes: job.request.notes
    }));

    return NextResponse.json(formattedJobs);
  } catch (error) {
    console.error("Cleaner schedule GET error:", error);
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 });
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const session = await getSession();
    if (!session || !["CLEANER", "HQ"].includes(session.role)) {
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

    const { jobId, action, notes: completionNotes } = body as Record<string, string>;

    if (!jobId || !action || !["start", "arrive", "complete"].includes(String(action))) {
      return NextResponse.json(
        { error: "Missing or invalid jobId/action" },
        { status: 400 }
      );
    }

    // Find cleaner profile for current user
    const cleaner = await prisma.cleanerProfile.findUnique({
      where: { userId: session.userId }
    });

    if (!cleaner) {
      return NextResponse.json({ error: "Cleaner profile not found" }, { status: 404 });
    }

    // Find the job assignment
    const assignment = await prisma.jobAssignment.findFirst({
      where: {
        jobId,
        cleanerId: cleaner.id
      }
    });

    if (!assignment) {
      return NextResponse.json({ error: "Job assignment not found" }, { status: 404 });
    }

    // Update assignment based on action
    const updateData: Record<string, Date | string> = {};

    if (action === "start") {
      updateData.enRouteAt = new Date();
    } else if (action === "arrive") {
      updateData.clockInAt = new Date();
    } else if (action === "complete") {
      updateData.clockOutAt = new Date();
    }

    const updatedAssignment = await prisma.jobAssignment.update({
      where: { id: assignment.id },
      data: updateData
    });

    // ── CLOCK-IN ALERT: Notify admins/managers when cleaner arrives ──
    if (action === "arrive") {
      try {
        const clockInJob = await prisma.job.findUnique({
          where: { id: jobId },
          include: { request: { select: { customerName: true, city: true, serviceType: true } } },
        });
        const clockInUser = await prisma.user.findUnique({ where: { id: session.userId }, select: { firstName: true, lastName: true } });
        const clockInName = clockInUser ? `${clockInUser.firstName} ${clockInUser.lastName}`.trim() : "Cleaner";

        const { dispatchClockAlert } = await import("@/src/lib/notifications");
        await dispatchClockAlert({
          tenantId: session.tenantId,
          cleanerName: clockInName,
          eventType: "clock_in",
          jobInfo: clockInJob ? `${clockInJob.request.serviceType.replace(/_/g, " ")} for ${clockInJob.request.customerName} in ${clockInJob.request.city}` : undefined,
          timestamp: new Date(),
        });
      } catch (alertErr) {
        console.error("[arrive] Clock-in alert failed (non-blocking):", alertErr);
      }
    }

    // If completing, update job status + create timesheet + increment counter (atomic)
    if (action === "complete") {
      const now = new Date();

      // All critical writes in a single transaction — all succeed or all fail
      await prisma.$transaction(async (tx) => {
        await tx.job.update({
          where: { id: jobId },
          data: { status: JobStatus.COMPLETED, updatedAt: now },
        });

        if (updatedAssignment.clockInAt) {
          const hoursWorked = (now.getTime() - new Date(updatedAssignment.clockInAt).getTime()) / 3600000;
          await tx.timesheet.create({
            data: {
              cleanerId: cleaner.id,
              jobId,
              date: now,
              clockIn: new Date(updatedAssignment.clockInAt),
              clockOut: now,
              hoursWorked: parseFloat(hoursWorked.toFixed(2)),
              source: "platform",
              notes: completionNotes || null,
            },
          });
        }

        await tx.cleanerProfile.update({
          where: { id: cleaner.id },
          data: { completedJobs: { increment: 1 } },
        });
      });

      // Create job ticket for shareable before/after proof
      let ticketUrl = "";
      try {
        const ticket = await prisma.jobTicket.upsert({
          where: { jobId },
          update: {},
          create: { tenantId: session.tenantId, jobId },
        });
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://web-production-cfe11.up.railway.app";
        ticketUrl = `${siteUrl}/job-ticket/${jobId}?token=${ticket.accessToken}`;
      } catch (e) {
        console.warn("[complete] Job ticket creation failed:", e);
      }

      // Send completion notifications (non-blocking)
      const jobDetails = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          request: { select: { customerName: true, customerPhone: true, customerEmail: true, serviceType: true, city: true } },
        },
      });

      if (jobDetails) {
        const cleanerUser = await prisma.user.findUnique({ where: { id: session.userId }, select: { firstName: true, lastName: true } });
        const cleanerName = cleanerUser ? `${cleanerUser.firstName} ${cleanerUser.lastName}`.trim() : "Your cleaner";
        const completedTime = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

        const ticketLine = ticketUrl ? `\n\nView your visit report & photos: ${ticketUrl}` : "";

        // SMS to customer
        if (jobDetails.request.customerPhone) {
          sendSms({
            to: jobDetails.request.customerPhone,
            text: `Your ${jobDetails.request.serviceType.replace(/_/g, " ")} clean is complete! ${cleanerName} finished at ${completedTime}. Thank you for choosing Tri State!${ticketLine}`,
          }).catch((err) => console.error("[complete] Customer SMS failed:", err));
        }

        // Email to customer with ticket link
        if (jobDetails.request.customerEmail) {
          sendEmail({
            to: jobDetails.request.customerEmail,
            subject: `Your Clean is Complete - Tri State`,
            html: `<p>Hi ${jobDetails.request.customerName},</p><p>${cleanerName} has completed your ${jobDetails.request.serviceType.replace(/_/g, " ")} service at ${completedTime}.</p>${ticketUrl ? `<p><a href="${ticketUrl}" style="display:inline-block;padding:12px 24px;background:#2E7D32;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">View Visit Report &amp; Photos</a></p>` : ""}<p>Thank you for choosing Tri State Enterprise!</p>`,
          }).catch((err) => console.error("[complete] Customer email failed:", err));
        }

        // ── AUTO-INVOICE: Create and send invoice to customer ──
        try {
          const { createInvoiceFromJob, sendInvoiceEmail } = await import("@/src/lib/invoice-generator");
          const invoice = await createInvoiceFromJob(jobId, session.tenantId);
          if (invoice) {
            await sendInvoiceEmail(invoice);
            console.log(`[complete] Auto-invoice ${invoice.invoiceNumber} created and sent`);
          }
        } catch (invoiceErr) {
          console.error("[complete] Auto-invoice failed (non-blocking):", invoiceErr);
        }

        // ── AUTO-PAYOUT: Queue cleaner payout ──
        try {
          const payoutAmount = jobDetails.payoutAmount ?? 0;
          if (payoutAmount > 0 && cleaner.stripeAccountId) {
            const existingPayout = await prisma.cleanerPayout.findFirst({
              where: { jobId, cleanerId: cleaner.id },
            });
            if (!existingPayout) {
              await prisma.cleanerPayout.create({
                data: {
                  jobId,
                  cleanerId: cleaner.id,
                  provider: "STRIPE",
                  amount: payoutAmount,
                  currency: "USD",
                  status: "QUEUED",
                },
              });
              console.log(`[complete] Payout of $${payoutAmount.toFixed(2)} queued for ${cleanerName}`);
            }
          }
        } catch (payoutErr) {
          console.error("[complete] Auto-payout queue failed (non-blocking):", payoutErr);
        }

        // ── ADMIN/MANAGER ALERTS: Notify all channels ──
        try {
          const { dispatchClockAlert } = await import("@/src/lib/notifications");
          const hoursWorked = updatedAssignment.clockInAt
            ? parseFloat(((now.getTime() - new Date(updatedAssignment.clockInAt).getTime()) / 3600000).toFixed(2))
            : undefined;

          await dispatchClockAlert({
            tenantId: session.tenantId,
            cleanerName,
            eventType: "clock_out",
            jobInfo: `${jobDetails.request.serviceType.replace(/_/g, " ")} for ${jobDetails.request.customerName} in ${jobDetails.request.city}`,
            timestamp: now,
            hoursWorked,
          });
        } catch (alertErr) {
          console.error("[complete] Admin alert dispatch failed (non-blocking):", alertErr);
        }

        // ── AUDIT LOG ──
        await prisma.auditLog.create({
          data: {
            tenantId: session.tenantId,
            actorId: session.userId,
            action: "job.completed",
            metadata: {
              jobId,
              cleanerName,
              customerName: jobDetails.request.customerName,
              service: jobDetails.request.serviceType,
              completedAt: now.toISOString(),
            },
          },
        }).catch(() => {});
      }
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
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
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
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
      address: job.request.addressLine1,
      city: job.request.city,
      notes: job.request.notes,
      enRouteAt: updatedAssignment.enRouteAt?.toISOString(),
      clockInAt: updatedAssignment.clockInAt?.toISOString(),
      clockOutAt: updatedAssignment.clockOutAt?.toISOString()
    });
  } catch (error) {
    console.error("[cleaner/schedule] POST error:", error);
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to update job status" }, { status: 500 });
  }
};
