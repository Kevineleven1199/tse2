import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/src/lib/openphone";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-08-16",
});

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature") || "";
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      console.error("[stripe-webhook] Signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    console.log(`[stripe-webhook] Verified: ${event.type}`);

    const eventType = event.type as string;

    switch (eventType) {
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const amount = (intent.amount || 0) / 100;
        const email = intent.receipt_email || intent.metadata?.email || "";
        const tenantId = intent.metadata?.tenantId || "";

        // ── PaymentRecord: gate on prior state ──
        // Only process side effects if the record transitions from non-CAPTURED to CAPTURED.
        // This prevents duplicate processing on Stripe webhook retries.
        let isNewCapture = false;
        let paymentRecord: { id: string; requestId: string; amount: number; currency: string } | null = null;

        try {
          paymentRecord = await prisma.paymentRecord.findFirst({
            where: { providerIntentId: intent.id },
            select: { id: true, requestId: true, amount: true, currency: true },
          });

          if (paymentRecord) {
            // Atomically transition from non-CAPTURED to CAPTURED.
            // updateMany with a status guard ensures this only happens once.
            const updateResult = await prisma.paymentRecord.updateMany({
              where: {
                id: paymentRecord.id,
                status: { not: "CAPTURED" },
              },
              data: { status: "CAPTURED" },
            });
            isNewCapture = updateResult.count > 0;
          }
        } catch (err) {
          console.error("[stripe-webhook] Error updating PaymentRecord:", err);
        }

        // ── Side effects: only run on first capture ──
        if (isNewCapture || !paymentRecord) {
          // Audit log (tolerate duplicates — low risk)
          await prisma.auditLog
            .create({
              data: {
                tenantId,
                action: "payment.succeeded",
                metadata: { amount, email, intentId: intent.id, provider: "stripe" },
              },
            })
            .catch(() => {});

          // SMS notification — only on first capture
          if (isNewCapture) {
            const hqNumbers =
              process.env.OPENPHONE_HQ_NUMBERS?.split(",")
                .map((n) => n.trim())
                .filter(Boolean) ||
              (process.env.OPENPHONE_FROM ? [process.env.OPENPHONE_FROM] : []);

            if (hqNumbers.length > 0) {
              await sendSms({
                to: hqNumbers,
                content: `Payment received: $${amount.toFixed(2)} from ${email || "customer"}`,
              }).catch(() => {});
            }
          }
        }

        // ── Invoice update: gate on invoice status ──
        const invoiceId = intent.metadata?.invoiceId;
        if (invoiceId && intent.metadata?.type === "invoice_payment") {
          try {
            // Only update invoices that are NOT already PAID.
            // This prevents double-application of amountPaid on webhook retries.
            const invoice = await prisma.invoice.findFirst({
              where: { id: invoiceId, status: { not: "PAID" } },
              select: { id: true, total: true, amountPaid: true },
            });
            if (invoice) {
              const newAmountPaid = Math.round(((invoice.amountPaid ?? 0) + amount) * 100) / 100;
              const isPaidInFull = newAmountPaid >= invoice.total - 0.01;
              await prisma.invoice.update({
                where: { id: invoiceId },
                data: {
                  amountPaid: newAmountPaid,
                  ...(isPaidInFull ? { status: "PAID", paidAt: new Date() } : {}),
                },
              });
              console.log(`[stripe-webhook] Invoice ${invoiceId} updated: paid ${newAmountPaid}/${invoice.total}`);
            } else {
              console.log(`[stripe-webhook] Invoice ${invoiceId} already PAID or not found — skipping`);
            }
          } catch (invoiceErr) {
            console.error("[stripe-webhook] Error updating invoice:", invoiceErr);
          }
        }

        // ── Cleaner payouts: only create if this is a new capture AND no payout exists yet ──
        if (isNewCapture && paymentRecord) {
          try {
            const job = await prisma.job.findUnique({
              where: { requestId: paymentRecord.requestId },
              select: {
                id: true,
                payoutAmount: true,
                assignments: {
                  select: {
                    cleanerId: true,
                    cleaner: { select: { stripeAccountId: true } },
                  },
                },
              },
            });

            if (job?.assignments?.length) {
              for (const assignment of job.assignments) {
                if (assignment.cleaner.stripeAccountId) {
                  // Check if a payout already exists for this job + cleaner
                  // (defense-in-depth against any remaining race)
                  const existingPayout = await prisma.cleanerPayout.findFirst({
                    where: { jobId: job.id, cleanerId: assignment.cleanerId },
                    select: { id: true },
                  });
                  if (existingPayout) {
                    console.log(`[stripe-webhook] Payout already exists for job ${job.id} / cleaner ${assignment.cleanerId} — skipping`);
                    continue;
                  }

                  const payoutAmount =
                    job.payoutAmount ??
                    paymentRecord.amount / job.assignments.length;

                  await prisma.cleanerPayout.create({
                    data: {
                      jobId: job.id,
                      cleanerId: assignment.cleanerId,
                      provider: "STRIPE",
                      amount: payoutAmount,
                      currency: paymentRecord.currency,
                      status: "QUEUED",
                    },
                  });

                  console.log(
                    `[stripe-webhook] Queued payout of $${payoutAmount.toFixed(2)} for cleaner ${assignment.cleanerId}`
                  );
                }
              }
            }
          } catch (payoutErr) {
            console.error("[stripe-webhook] Error queueing cleaner payout:", payoutErr);
          }
        }

        break;
      }
      case "payment_intent.failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const email = intent.receipt_email || intent.metadata?.email || "";
        const tenantId = intent.metadata?.tenantId || "";

        // Mark payment as failed
        try {
          const paymentRecord = await prisma.paymentRecord.findFirst({
            where: { providerIntentId: intent.id },
            select: { id: true },
          });
          if (paymentRecord) {
            await prisma.paymentRecord.update({
              where: { id: paymentRecord.id },
              data: { status: "FAILED" },
            });
          }
        } catch (e) {
          console.error("[stripe-webhook] Error updating failed payment record:", e);
        }

        await prisma.auditLog
          .create({
            data: {
              tenantId,
              action: "payment.failed",
              metadata: {
                email,
                intentId: intent.id,
                lastError: intent.last_payment_error?.message,
                provider: "stripe",
              },
            },
          })
          .catch(() => {});

        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const amount = (charge.amount || 0) / 100;
        const email = charge.receipt_email || charge.metadata?.email || "";
        const tenantId = charge.metadata?.tenantId || "";

        await prisma.auditLog
          .create({
            data: {
              tenantId,
              action: "charge.refunded",
              metadata: {
                amount,
                email,
                chargeId: charge.id,
                provider: "stripe",
              },
            },
          })
          .catch(() => {});

        break;
      }
      default:
        console.log(`[stripe-webhook] Unhandled: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe-webhook] Error:", err);
    return NextResponse.json(
      { error: "Webhook failed" },
      { status: 500 }
    );
  }
}
