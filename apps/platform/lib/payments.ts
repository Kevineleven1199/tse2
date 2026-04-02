import { prisma } from "@/lib/prisma";

type PayoutPayload = {
  tenantId: string;
  jobId: string;
  cleanerId: string;
  amount: number;
  currency?: string;
  method: "WISE" | "ZELLE" | "PAYPAL";
  memo?: string;
};

export const queuePayout = async (payload: PayoutPayload) => {
  const { jobId, cleanerId, amount, currency = "USD", method } = payload;

  console.info("[payments] Queueing payout", { jobId, cleanerId, amount, method });

  // Write to CleanerPayout table (not Notification)
  // WISE/ZELLE map to MANUAL since they are not in the PaymentProvider enum yet
  const provider = method === "PAYPAL" ? "PAYPAL" as const : "MANUAL" as const;

  await prisma.cleanerPayout.create({
    data: {
      jobId,
      cleanerId,
      provider,
      amount,
      currency,
      status: "QUEUED",
    }
  });
};

type BillingPayload = {
  tenantId: string;
  requestId: string;
  total: number;
  currency?: string;
};

export const raiseInvoice = async (payload: BillingPayload) => {
  console.info("[payments] Invoice created", { requestId: payload.requestId, total: payload.total });

  // Create both audit log and actual payment record
  await Promise.all([
    prisma.auditLog.create({
      data: {
        tenantId: payload.tenantId,
        actorId: null,
        action: "INVOICE_CREATED",
        metadata: payload
      }
    }),
    prisma.paymentRecord.create({
      data: {
        requestId: payload.requestId,
        provider: "MANUAL",
        amount: payload.total,
        currency: payload.currency ?? "USD",
        status: "PENDING",
        metadata: { type: "INVOICE", generatedAt: new Date().toISOString() }
      }
    })
  ]);
};

export const syncAdp1099 = async (tenantId: string, cleanerId: string) => {
  // TODO: Implement actual ADP RUN 1099 sync when integration is ready
  console.info("[payments] Sync ADP 1099 (stub)", { tenantId, cleanerId });
  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId: cleanerId,
      action: "ADP_SYNC_TRIGGERED",
      metadata: {}
    }
  });
};
