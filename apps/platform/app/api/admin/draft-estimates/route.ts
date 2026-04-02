import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import { sendSms } from "@/src/lib/openphone";
import { sendEmailWithFailsafe } from "@/src/lib/email-failsafe";
import { renderEstimateEmail } from "@/src/lib/estimate-email-template";
import { finalizeBooking } from "@/src/lib/booking-finalizer";

export const dynamic = "force-dynamic";

/**
 * GET — List draft estimates (filterable by status)
 */
export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!["HQ", "MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const drafts = await prisma.draftEstimate.findMany({
    where: {
      tenantId: session.tenantId,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(drafts);
}

/**
 * POST — Actions: send_all, send_customer, send_cleaners, edit, force_book
 */
export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!["HQ", "MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { action, draftId } = body;

  if (!draftId || !action) {
    return NextResponse.json({ error: "Missing draftId or action" }, { status: 400 });
  }

  const draft = await prisma.draftEstimate.findUnique({ where: { id: draftId } });
  if (!draft || draft.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://web-production-cfe11.up.railway.app";
  const confirmUrl = `${siteUrl}/confirm-estimate/${draft.id}?token=${draft.accessToken}`;

  // ─── SEND ALL: estimate to customer + broadcast to cleaners simultaneously ───
  if (action === "send_all" || action === "send_customer") {
    // Send branded estimate email to customer
    if (draft.customerEmail) {
      const emailHtml = draft.customerEmailHtml || await renderEstimateEmail({
        customerName: draft.customerName,
        serviceType: draft.serviceType,
        estimatedCost: draft.estimatedCost,
        address: draft.address,
        breakdown: draft.estimateBreakdown as Record<string, unknown> | null,
        confirmUrl,
      });

      await sendEmailWithFailsafe({
        to: draft.customerEmail,
        subject: `Your Cleaning Estimate — ${draft.estimatedCost ? `$${draft.estimatedCost.toFixed(0)}` : "Custom Quote"} | Tri State Enterprise`,
        html: emailHtml,
      });

      // Save rendered HTML for future reference
      if (!draft.customerEmailHtml) {
        await prisma.draftEstimate.update({
          where: { id: draftId },
          data: { customerEmailHtml: emailHtml },
        });
      }
    }

    // SMS the estimate link to customer
    if (draft.customerPhone) {
      await sendSms({
        to: [draft.customerPhone],
        content: `Hi ${draft.customerName.split(" ")[0]}! 🌿 Your personalized cleaning estimate from Tri State is ready.\n\n${draft.estimatedCost ? `Estimate: $${draft.estimatedCost.toFixed(0)}` : ""}\n\nView & confirm: ${confirmUrl}\n\nQuestions? Call us: (606) 555-0100`,
      });
    }

    await prisma.draftEstimate.update({
      where: { id: draftId },
      data: { customerEmailSent: true, status: draft.status === "draft" ? "sent" : draft.status },
    });
  }

  // ─── SEND TO CLEANERS: broadcast job to all matching cleaners ───
  if (action === "send_all" || action === "send_cleaners") {
    // Find active cleaners
    const cleaners = await prisma.cleanerProfile.findMany({
      where: { active: true, user: { tenantId: session.tenantId } },
      include: { user: { select: { firstName: true, lastName: true, phone: true, email: true } } },
    });

    const serviceLabel = draft.serviceType?.replace(/_/g, " ") || "Cleaning";
    const payout = draft.estimatedCost ? `$${(draft.estimatedCost * 0.62).toFixed(0)}` : "TBD";
    const broadcastMsg = draft.cleanerBroadcast || `🌿 NEW JOB AVAILABLE\n\n${serviceLabel} in ${draft.address?.split(",")[1]?.trim() || "Flatwoods"}\n💰 Est. payout: ${payout}\n\nFirst come, first serve! Reply YES or grab it in the app:\n${siteUrl}/cleaner/jobs`;

    for (const cleaner of cleaners) {
      // SMS
      if (cleaner.user.phone) {
        sendSms({ to: [cleaner.user.phone], content: broadcastMsg }).catch(() => {});
      }
      // Email
      if (cleaner.user.email) {
        sendEmailWithFailsafe({
          to: cleaner.user.email,
          subject: `🌿 New Job Available — ${serviceLabel}`,
          html: `<p>Hi ${cleaner.user.firstName},</p><p>A new ${serviceLabel} job is available!</p><p><strong>Estimated payout: ${payout}</strong></p><p><a href="${siteUrl}/cleaner/jobs" style="display:inline-block;background:#0d5e3b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">View & Claim Job</a></p><p>First come, first serve!</p>`,
        }).catch(() => {});
      }
    }

    await prisma.draftEstimate.update({
      where: { id: draftId },
      data: { cleanerBlastSent: true, status: draft.status === "draft" ? "sent" : draft.status },
    });
  }

  // ─── EDIT: update draft fields before sending ───
  if (action === "edit") {
    const { customerName, customerEmail, address, serviceType, estimatedCost } = body;
    await prisma.draftEstimate.update({
      where: { id: draftId },
      data: {
        ...(customerName !== undefined ? { customerName } : {}),
        ...(customerEmail !== undefined ? { customerEmail } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(serviceType !== undefined ? { serviceType } : {}),
        ...(estimatedCost !== undefined ? { estimatedCost } : {}),
        customerEmailHtml: null, // clear cached HTML so it re-renders
      },
    });
  }

  // ─── FORCE BOOK: admin manually confirms on behalf of both parties ───
  if (action === "force_book") {
    const { cleanerId, scheduledDate, scheduledTime } = body;

    // Create ServiceRequest + Quote + Job if not already exists
    if (!draft.jobId) {
      const tenantId = session.tenantId;
      const request = await prisma.serviceRequest.create({
        data: {
          tenantId,
          customerName: draft.customerName,
          customerEmail: draft.customerEmail || "",
          customerPhone: draft.customerPhone,
          addressLine1: draft.address || "",
          city: draft.address?.split(",")[1]?.trim() || "Flatwoods",
          state: "FL",
          postalCode: "",
          serviceType: (draft.serviceType as any) || "HOME_CLEAN",
          status: "SCHEDULED",
        },
      });

      await prisma.quote.create({
        data: {
          requestId: request.id,
          subtotal: draft.estimatedCost || 0,
          fees: 0,
          taxes: 0,
          total: draft.estimatedCost || 0,
        },
      });

      const scheduledStart = scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}`)
        : null;

      const job = await prisma.job.create({
        data: {
          tenantId,
          requestId: request.id,
          status: "SCHEDULED",
          payoutAmount: (draft.estimatedCost || 0) * 0.62,
          estimatedHours: 3,
          scheduledStart,
          scheduledEnd: scheduledStart ? new Date(scheduledStart.getTime() + 3 * 3600000) : null,
        },
      });

      // Assign cleaner if provided
      if (cleanerId) {
        await prisma.jobAssignment.create({
          data: { jobId: job.id, cleanerId, status: "CLAIMED" },
        });
      }

      await prisma.draftEstimate.update({
        where: { id: draftId },
        data: {
          jobId: job.id,
          customerConfirmed: true,
          cleanerConfirmed: !!cleanerId,
          confirmedCleanerId: cleanerId || null,
        },
      });
    }

    // Run the full booking finalization
    const updated = await prisma.draftEstimate.findUnique({ where: { id: draftId } });
    if (updated?.jobId) {
      await finalizeBooking(draftId);
    }
  }

  const updated = await prisma.draftEstimate.findUnique({ where: { id: draftId } });
  return NextResponse.json({ ok: true, draft: updated });
}
