import { prisma } from "@/lib/prisma";
import { sendSms } from "@/src/lib/openphone";
import { sendEmailWithFailsafe } from "@/src/lib/email-failsafe";

/**
 * Finalize a booking after BOTH customer and cleaner have confirmed.
 * Creates Google Calendar event, syncs to Jobber, sends notifications to all parties.
 */
export async function finalizeBooking(draftEstimateId: string) {
  const draft = await prisma.draftEstimate.findUnique({ where: { id: draftEstimateId } });
  if (!draft || !draft.jobId) {
    console.warn("[finalizeBooking] No draft or jobId found:", draftEstimateId);
    return;
  }

  const job = await prisma.job.findUnique({
    where: { id: draft.jobId },
    include: {
      request: true,
      assignments: { include: { cleaner: { include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } } } } },
    },
  });

  if (!job) return;

  const cleanerAssignment = job.assignments[0];
  const cleanerUser = cleanerAssignment?.cleaner?.user;
  const cleanerName = cleanerUser ? `${cleanerUser.firstName} ${cleanerUser.lastName}`.trim() : "Your cleaner";
  const customerName = draft.customerName;
  const address = draft.address || job.request.addressLine1 || "";
  const scheduledDate = job.scheduledStart
    ? new Date(job.scheduledStart).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : "TBD";
  const scheduledTime = job.scheduledStart
    ? new Date(job.scheduledStart).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "TBD";
  const payout = job.payoutAmount ? `$${job.payoutAmount.toFixed(2)}` : "TBD";

  // 1. Update draft status
  await prisma.draftEstimate.update({
    where: { id: draftEstimateId },
    data: { status: "booked", confirmedAt: new Date() },
  });

  // 2. Update job status to SCHEDULED
  await prisma.job.update({
    where: { id: draft.jobId },
    data: { status: "SCHEDULED" },
  });

  // 3. Google Calendar (non-blocking)
  try {
    const { scheduleGoogleCalendarEvent } = await import("@/src/lib/calendar");
    await scheduleGoogleCalendarEvent({
      tenantId: draft.tenantId,
      jobId: draft.jobId,
      title: `🌿 ${job.request.serviceType?.replace(/_/g, " ")} — ${customerName}`,
      description: `Service: ${job.request.serviceType}\nAddress: ${address}\nCrew: ${cleanerName}\nPayout: ${payout}\n\nCustomer phone: ${draft.customerPhone}`,
      start: job.scheduledStart || new Date(),
      end: job.scheduledEnd || new Date(Date.now() + 3 * 3600000),
      customerEmail: draft.customerEmail || "",
      cleanerEmails: [cleanerUser?.email].filter(Boolean) as string[],
    });
  } catch (e) {
    console.warn("[finalizeBooking] Calendar sync failed (non-blocking):", e);
  }

  // 4. Jobber sync (non-blocking, only if configured)
  if (process.env.JOBBER_CLIENT_ID) {
    try {
      const { syncJobberEstimates } = await import("@/lib/jobber");
      await syncJobberEstimates(draft.tenantId);
    } catch (e) {
      console.warn("[finalizeBooking] Jobber sync failed (non-blocking):", e);
    }
  }

  // 5. Create job ticket for post-service photo sharing
  try {
    await prisma.jobTicket.upsert({
      where: { jobId: draft.jobId },
      update: {},
      create: { tenantId: draft.tenantId, jobId: draft.jobId },
    });
  } catch (e) {
    console.warn("[finalizeBooking] JobTicket creation failed:", e);
  }

  // 6. Notifications (all non-blocking)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://web-production-cfe11.up.railway.app";

  // Customer SMS
  if (draft.customerPhone) {
    sendSms({
      to: [draft.customerPhone],
      content: `✅ Your cleaning is confirmed! ${cleanerName} will arrive on ${scheduledDate} at ${scheduledTime}.\n\n📍 ${address}\n\nView your portal: ${siteUrl}/client\n\nTri State Enterprise\n(606) 555-0100`,
    }).catch((e) => console.warn("[finalizeBooking] Customer SMS failed:", e));
  }

  // Customer email
  if (draft.customerEmail) {
    sendEmailWithFailsafe({
      to: draft.customerEmail,
      subject: `✅ Cleaning Confirmed — ${scheduledDate}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#0d5e3b,#16a34a);padding:24px 32px;border-radius:16px 16px 0 0;">
            <h1 style="margin:0;color:#fff;font-size:22px;">Your Cleaning is Confirmed!</h1>
          </div>
          <div style="background:#fff;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;">
            <p style="color:#374151;">Hi ${customerName.split(" ")[0]},</p>
            <p style="color:#374151;">Great news — your cleaning has been confirmed:</p>
            <table style="width:100%;margin:16px 0;border-collapse:collapse;">
              <tr><td style="padding:8px 0;color:#6b7280;width:120px;">Date</td><td style="color:#1f2937;font-weight:600;">${scheduledDate}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Time</td><td style="color:#1f2937;font-weight:600;">${scheduledTime}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Crew Member</td><td style="color:#1f2937;font-weight:600;">${cleanerName}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Address</td><td style="color:#1f2937;">${address}</td></tr>
            </table>
            <p style="color:#374151;">After your clean, you'll receive a link to view before & after photos in your personal portal.</p>
            <div style="text-align:center;margin:24px 0;">
              <a href="${siteUrl}/client" style="display:inline-block;background:#0d5e3b;color:#fff;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:700;">View Your Portal</a>
            </div>
            <p style="color:#9ca3af;font-size:12px;text-align:center;">Tri State Enterprise · (606) 555-0100 · info@tsenow.com</p>
          </div>
        </div>
      `,
    }).catch((e) => console.warn("[finalizeBooking] Customer email failed:", e));
  }

  // Cleaner SMS
  if (cleanerUser?.phone) {
    sendSms({
      to: [cleanerUser.phone],
      content: `🌿 BOOKED! ${customerName} on ${scheduledDate} at ${scheduledTime}\n📍 ${address}\n💰 Payout: ${payout}\n📞 ${draft.customerPhone}\n\nView details: ${siteUrl}/cleaner/jobs/${draft.jobId}`,
    }).catch((e) => console.warn("[finalizeBooking] Cleaner SMS failed:", e));
  }

  // Admin SMS
  const hqNumbers = (process.env.OPENPHONE_HQ_NUMBERS || "").split(",").map((n) => n.trim()).filter(Boolean);
  if (hqNumbers.length > 0) {
    sendSms({
      to: hqNumbers,
      content: `✅ BOOKED: ${customerName} ← ${cleanerName}\n${scheduledDate} at ${scheduledTime}\n📍 ${address}\n💰 ${payout}`,
    }).catch((e) => console.warn("[finalizeBooking] Admin SMS failed:", e));
  }

  // Create todo for tracking
  await prisma.todoItem.create({
    data: {
      tenantId: draft.tenantId,
      userId: "system",
      title: `[BOOKED] ${customerName} — ${cleanerName} on ${scheduledDate}`,
      description: `Confirmed booking. Customer + cleaner both confirmed. Calendar event created.`,
      priority: 3,
      isShared: true,
      category: "booked",
      relatedId: draft.jobId,
      relatedType: "job",
      completed: true,
      completedAt: new Date(),
    },
  });

  console.log(`[finalizeBooking] ✅ Complete: ${customerName} ← ${cleanerName} on ${scheduledDate}`);
}
