import { queuePayout, raiseInvoice } from "@/lib/payments";
import { scheduleGoogleCalendarEvent, scheduleAppleCalendarPlaceholder } from "@/lib/calendar";
import { logNotification } from "@/lib/openphone";
import { sendSms } from "@/src/lib/notifications";
import { prisma } from "@/lib/prisma";

export const notifyCustomerQuoteReady = async (requestId: string) => {
  const request = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    include: {
      tenant: true,
      quote: true,
      job: {
        select: {
          id: true
        }
      }
    }
  });

  if (!request || !request.quote) {
    throw new Error("Quote not found for notification");
  }

  await sendSms({
    to: request.customerPhone,
    text: `TriStateOS Quote ready: $${request.quote.total.toFixed(2)} — tap to confirm your slot.`
  });

  await logNotification(request.tenantId, request.job?.id ?? null, {
    type: "QUOTE_READY",
    requestId,
    quoteId: request.quote.id
  });
};

export const finalizeJobAutomation = async (jobId: string) => {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      tenant: true,
      request: {
        include: {
          quote: true
        }
      },
      assignments: {
        include: {
          cleaner: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } }
            }
          }
        }
      }
    }
  });

  if (!job) {
    throw new Error("Job not found");
  }

  if (job.status !== "SCHEDULED" || !job.scheduledStart || !job.scheduledEnd) {
    return;
  }

  const cleanerEmails = job.assignments
    .map((assignment: any) => assignment.cleaner.user.email)
    .filter(Boolean);

  await scheduleGoogleCalendarEvent({
    tenantId: job.tenantId,
    jobId: jobId,
    title: `${job.request.serviceType} • ${job.request.customerName}`,
    start: job.scheduledStart,
    end: job.scheduledEnd,
    customerEmail: job.request.customerEmail,
    cleanerEmails,
    description: job.request.notes ?? undefined
  });

  await scheduleAppleCalendarPlaceholder({
    tenantId: job.tenantId,
    jobId: jobId,
    title: `${job.request.serviceType} • ${job.request.customerName}`,
    start: job.scheduledStart,
    end: job.scheduledEnd,
    customerEmail: job.request.customerEmail,
    cleanerEmails,
    description: job.request.notes ?? undefined
  });

  await queuePayout({
    tenantId: job.tenantId,
    jobId: jobId,
    cleanerId: job.assignments[0]?.cleanerId ?? "",
    amount: job.payoutAmount ?? 0,
    method: "WISE"
  });

  await raiseInvoice({
    tenantId: job.tenantId,
    requestId: job.requestId,
    total: job.request.quote?.total ?? 0
  });
};
