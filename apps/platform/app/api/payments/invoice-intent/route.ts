import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PaymentProvider, PaymentStatus } from "@prisma/client";
import { createStripePaymentIntent } from "@/src/lib/payments";

export const dynamic = "force-dynamic";

const invoiceIntentSchema = z.object({
  invoiceId: z.string().min(1).max(255),
  provider: z.enum(["stripe"] as const),
  deposit: z.boolean().optional().default(false),
});

/**
 * POST /api/payments/invoice-intent
 *
 * Public endpoint for paying invoices via a shareable link.
 * No auth required — the invoice ID in the URL acts as the access token.
 * Amount is always derived server-side from the invoice, never from client input.
 */
export const POST = async (request: Request) => {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const payload = invoiceIntentSchema.parse(body);

    // Look up the invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: payload.invoiceId },
      select: {
        id: true,
        tenantId: true,
        invoiceNumber: true,
        customerEmail: true,
        customerName: true,
        total: true,
        amountPaid: true,
        status: true,
        serviceRequestId: true,
        jobId: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    if (invoice.status === "PAID") {
      return NextResponse.json({ error: "This invoice has already been paid." }, { status: 400 });
    }

    if (invoice.status === "CANCELLED") {
      return NextResponse.json({ error: "This invoice is no longer valid." }, { status: 400 });
    }

    // Server-side amount calculation — never trust client amount
    const totalDue = Math.round((invoice.total - (invoice.amountPaid ?? 0)) * 100) / 100;
    const depositAmount = Math.max(Math.round(invoice.total * 0.2 * 100) / 100, 50);
    const depositDue = Math.round(Math.max(depositAmount - (invoice.amountPaid ?? 0), 0) * 100) / 100;

    const amount = payload.deposit ? depositDue : totalDue;

    if (amount <= 0) {
      return NextResponse.json({ error: "No amount due on this invoice." }, { status: 400 });
    }

    // Reuse existing PENDING PaymentRecord to prevent duplicates from double-clicks.
    // Only create PaymentRecord if invoice is linked to a ServiceRequest (FK constraint).
    let paymentRecordId: string | null = null;
    let existingIntentClientSecret: string | null = null;

    if (invoice.serviceRequestId) {
      const existing = await prisma.paymentRecord.findFirst({
        where: {
          requestId: invoice.serviceRequestId,
          status: PaymentStatus.PENDING,
          provider: PaymentProvider.STRIPE,
          deposit: payload.deposit,
        },
        orderBy: { createdAt: "desc" },
      });

      if (existing?.providerIntentId) {
        try {
          const Stripe = (await import("stripe")).default;
          const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2023-08-16" });
          const existingIntent = await stripeClient.paymentIntents.retrieve(existing.providerIntentId);
          if (existingIntent.status !== "canceled" && existingIntent.status !== "succeeded") {
            return NextResponse.json({
              paymentRecordId: existing.id,
              provider: "stripe",
              clientSecret: existingIntent.client_secret,
            });
          }
        } catch {
          // Intent no longer valid — create new one
        }
      }

      if (!existing) {
        const paymentRecord = await prisma.paymentRecord.create({
          data: {
            requestId: invoice.serviceRequestId,
            provider: PaymentProvider.STRIPE,
            amount,
            status: PaymentStatus.PENDING,
            deposit: payload.deposit,
          },
        });
        paymentRecordId = paymentRecord.id;
      } else {
        paymentRecordId = existing.id;
      }
    }

    // Use a stable idempotency key: invoiceId + deposit mode
    const idempotencyKey = `inv-intent-${invoice.id}-${payload.deposit ? "dep" : "full"}`;

    const intent = await createStripePaymentIntent({
      amount,
      customerEmail: invoice.customerEmail,
      metadata: {
        invoiceId: invoice.id,
        tenantId: invoice.tenantId,
        ...(paymentRecordId ? { paymentRecordId } : {}),
        type: "invoice_payment",
      },
      idempotencyKey,
    });

    if (!intent) {
      return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
    }

    // Store the intent ID on the PaymentRecord if we created one
    if (paymentRecordId) {
      await prisma.paymentRecord.update({
        where: { id: paymentRecordId },
        data: { providerIntentId: intent.id },
      });
    }

    return NextResponse.json({
      paymentRecordId,
      provider: "stripe",
      clientSecret: intent.clientSecret,
    });
  } catch (error) {
    console.error("[payments/invoice-intent] Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payment payload", details: error.flatten() },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: "Unable to create payment intent" }, { status: 500 });
  }
};
