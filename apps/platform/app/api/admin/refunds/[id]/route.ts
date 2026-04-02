import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session || !["HQ"].includes(session.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validStatuses = ["PENDING", "APPROVED", "PROCESSED", "DENIED"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const refund = await prisma.refund.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!refund) {
      return NextResponse.json({ error: "Refund not found" }, { status: 404 });
    }

    // If approving, try to process Stripe refund automatically
    if (body.status === "APPROVED") {
      const stripeKey = process.env.STRIPE_SECRET_KEY;

      if (stripeKey && refund.jobId) {
        try {
          // Find the original payment for this job
          const job = await prisma.job.findUnique({
            where: { id: refund.jobId },
            select: { requestId: true }
          });

          if (job) {
            const payment = await prisma.paymentRecord.findFirst({
              where: {
                requestId: job.requestId,
                status: "CAPTURED",
                provider: "STRIPE"
              },
              orderBy: { createdAt: "desc" }
            });

            if (payment?.providerIntentId) {
              // Call Stripe Refund API
              const stripe = await import("stripe").then(m => new m.default(stripeKey, { apiVersion: "2023-08-16" as any }));
              const stripeRefund = await stripe.refunds.create({
                payment_intent: payment.providerIntentId,
                amount: Math.round(refund.amount * 100), // cents
                reason: "requested_by_customer",
              });

              // Update refund with Stripe ID and mark as PROCESSED
              const updated = await prisma.refund.update({
                where: { id },
                data: {
                  status: "PROCESSED",
                  stripeRefundId: stripeRefund.id,
                  processedBy: session.userId,
                  processedAt: new Date(),
                  notes: refund.notes
                    ? `${refund.notes}\nStripe refund: ${stripeRefund.id}`
                    : `Stripe refund: ${stripeRefund.id}`
                },
              });

              // Update original payment status
              await prisma.paymentRecord.update({
                where: { id: payment.id },
                data: { status: "REFUNDED" }
              });

              return NextResponse.json(updated);
            }
          }
        } catch (stripeError: any) {
          console.error("[refunds] Stripe refund failed:", stripeError);
          // Still approve but note the Stripe failure
          const updated = await prisma.refund.update({
            where: { id },
            data: {
              status: "APPROVED",
              processedBy: session.userId,
              notes: refund.notes
                ? `${refund.notes}\nStripe auto-refund failed: ${stripeError.message}`
                : `Stripe auto-refund failed: ${stripeError.message}`
            },
          });
          return NextResponse.json(updated);
        }
      }
    }

    // Default: just update status
    const updateData: any = {
      status: body.status,
    };

    if (body.status === "PROCESSED" || body.status === "APPROVED") {
      updateData.processedBy = session.userId;
      updateData.processedAt = new Date();
    }

    if (body.notes) {
      updateData.notes = body.notes;
    }

    const updated = await prisma.refund.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[refunds] Update failed:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
