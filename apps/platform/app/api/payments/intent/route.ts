import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PaymentProvider, PaymentStatus } from "@prisma/client";
import { createStripePaymentIntent, createPayPalOrder } from "@/src/lib/payments";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

const intentSchema = z.object({
  quoteId: z.string().min(1).max(255),
  provider: z.enum(["stripe", "paypal"] as const),
  amount: z.number().positive().optional(),
  deposit: z.boolean().optional().default(false),
  returnUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional()
});

export const POST = async (request: Request) => {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "CUSTOMER" && session.role !== "HQ") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const viewer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        tenantId: true,
        email: true
      }
    });

    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const payload = intentSchema.parse(body);

    const quote = await prisma.quote.findUnique({
      where: { id: payload.quoteId },
      include: { request: { include: { payments: true } } }
    });

    if (!quote?.request) {
      return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    }

    if (quote.request.tenantId !== viewer.tenantId) {
      return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    }

    if (session.role === "CUSTOMER" && quote.request.customerEmail.toLowerCase() !== viewer.email.toLowerCase()) {
      return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    }

    const paid = quote.request.payments
      .filter((payment) => payment.status === PaymentStatus.CAPTURED)
      .reduce((sum, payment) => sum + payment.amount, 0);

    const totalDue = Math.max(quote.total - paid, 0);
    const defaultDeposit = Math.max(quote.total * 0.2, 50);
    const depositDue = Math.max(defaultDeposit - paid, 0);

    const amount = payload.deposit ? depositDue : totalDue;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Payment amount must be greater than zero." }, { status: 400 });
    }

    // Reuse an existing PENDING PaymentRecord for this quote to prevent duplicates
    // from double-clicks or retries
    let paymentRecord = await prisma.paymentRecord.findFirst({
      where: {
        quoteId: quote.id,
        status: PaymentStatus.PENDING,
        provider: payload.provider === "stripe" ? PaymentProvider.STRIPE : PaymentProvider.PAYPAL,
        deposit: payload.deposit,
      },
      orderBy: { createdAt: "desc" },
    });

    // If we have an existing pending record with a Stripe intent, return it
    if (paymentRecord?.providerIntentId && payload.provider === "stripe") {
      try {
        const Stripe = (await import("stripe")).default;
        const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2023-08-16" });
        const existingIntent = await stripeClient.paymentIntents.retrieve(paymentRecord.providerIntentId);
        if (existingIntent.status !== "canceled" && existingIntent.status !== "succeeded") {
          return NextResponse.json({
            paymentRecordId: paymentRecord.id,
            provider: "stripe",
            clientSecret: existingIntent.client_secret
          });
        }
      } catch {
        // Intent no longer valid — fall through to create a new one
        paymentRecord = null;
      }
    }

    if (!paymentRecord) {
      paymentRecord = await prisma.paymentRecord.create({
        data: {
          requestId: quote.requestId,
          quoteId: quote.id,
          provider: payload.provider === "stripe" ? PaymentProvider.STRIPE : PaymentProvider.PAYPAL,
          amount,
          status: PaymentStatus.PENDING,
          deposit: payload.deposit
        }
      });
    }

    if (payload.provider === "stripe") {
      try {
        const intent = await createStripePaymentIntent({
          amount,
          customerEmail: quote.request.customerEmail,
          metadata: { quoteId: quote.id, paymentRecordId: paymentRecord.id },
          idempotencyKey: `quote-intent-${paymentRecord.id}`,
        });

        if (!intent) {
          return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
        }

        await prisma.paymentRecord.update({
          where: { id: paymentRecord.id },
          data: { providerIntentId: intent.id }
        });

        return NextResponse.json({
          paymentRecordId: paymentRecord.id,
          provider: "stripe",
          clientSecret: intent.clientSecret
        });
      } catch (providerError) {
        console.error("[payments] Stripe error:", providerError);
        return NextResponse.json({ error: "Failed to create Stripe payment intent" }, { status: 500 });
      }
    }

    try {
      const origin = new URL(request.url).origin;
      const safeReturnUrl = `${origin}/client/billing`;

      const order = await createPayPalOrder({
        amount,
        returnUrl: safeReturnUrl,
        cancelUrl: safeReturnUrl,
        metadata: { quoteId: quote.id, paymentRecordId: paymentRecord.id }
      });

      if (!order) {
        return NextResponse.json({ error: "PayPal is not configured." }, { status: 500 });
      }

      await prisma.paymentRecord.update({
        where: { id: paymentRecord.id },
        data: { providerIntentId: order.id }
      });

      return NextResponse.json({
        paymentRecordId: paymentRecord.id,
        provider: "paypal",
        orderId: order.id,
        approvalUrl: order.links?.find((link) => link.rel === "approve")?.href
      });
    } catch (providerError) {
      console.error("[payments] PayPal error:", providerError);
      return NextResponse.json({ error: "Failed to create PayPal order" }, { status: 500 });
    }
  } catch (error) {
    console.error("[payments] intent error", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payment payload", details: error.flatten() },
        { status: 422 }
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Unable to create payment intent" }, { status: 500 });
  }
};
