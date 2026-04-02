import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeAccount = process.env.STRIPE_CONNECTED_ACCOUNT_ID;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: "2023-08-16" }) : null;

const PAYPAL_API_BASE =
  process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

const paypalClientId = process.env.PAYPAL_CLIENT_ID;
const paypalSecret = process.env.PAYPAL_CLIENT_SECRET;

type StripeIntentPayload = {
  amount: number;
  currency?: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
};

type PayPalOrderPayload = {
  amount: number;
  currency?: string;
  returnUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
};

type StripeTransferPayload = {
  amount: number;
  destinationAccount: string;
  currency?: string;
  metadata?: Record<string, string>;
};

type PayPalPayoutPayload = {
  amount: number;
  currency?: string;
  recipientEmail: string;
  note?: string;
  metadata?: Record<string, string>;
};

export const createStripePaymentIntent = async ({
  amount,
  currency = "usd",
  customerEmail,
  metadata,
  idempotencyKey
}: StripeIntentPayload) => {
  try {
    if (!stripe) {
      console.warn("[payments] Stripe secret key missing; skipping payment intent creation.");
      return null;
    }

    const requestOptions: Stripe.RequestOptions = {
      ...(stripeAccount ? { stripeAccount } : {}),
      ...(idempotencyKey ? { idempotencyKey } : {}),
    };

    const intent = await stripe.paymentIntents.create(
      {
        amount: Math.round(amount * 100),
        currency,
        receipt_email: customerEmail,
        automatic_payment_methods: { enabled: true },
        metadata
      },
      Object.keys(requestOptions).length > 0 ? requestOptions : undefined
    );

    return { id: intent.id, clientSecret: intent.client_secret };
  } catch (error) {
    console.error("[payments] Failed to create Stripe payment intent:", error);
    throw error;
  }
};

const getPayPalAccessToken = async () => {
  if (!paypalClientId || !paypalSecret) {
    console.warn("[payments] PayPal credentials missing.");
    return null;
  }

  const credentials = Buffer.from(`${paypalClientId}:${paypalSecret}`).toString("base64");
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    console.error("[payments] Failed to obtain PayPal access token", await response.text());
    return null;
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
};

export const createPayPalOrder = async ({ amount, currency = "USD", returnUrl, cancelUrl, metadata }: PayPalOrderPayload) => {
  try {
    const token = await getPayPalAccessToken();
    if (!token) return null;

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount.toFixed(2)
            },
            custom_id: metadata?.quoteId
          }
        ],
        application_context: {
          user_action: "PAY_NOW",
          return_url: returnUrl,
          cancel_url: cancelUrl
        }
      })
    });

    if (!response.ok) {
      console.error("[payments] Failed to create PayPal order", await response.text());
      return null;
    }

    return (await response.json()) as {
      id: string;
      links: { href: string; rel: string; method: string }[];
    };
  } catch (error) {
    console.error("[payments] Failed to create PayPal order:", error);
    throw error;
  }
};

export const createStripeTransfer = async ({
  amount,
  destinationAccount,
  currency = "usd",
  metadata
}: StripeTransferPayload) => {
  try {
    if (!stripe) {
      console.warn("[payments] Stripe secret key missing; skipping transfer creation.");
      return null;
    }

    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency,
      destination: destinationAccount,
      metadata
    });

    return transfer;
  } catch (error) {
    console.error("[payments] Failed to create Stripe transfer:", error);
    throw error;
  }
};

export const createPayPalPayout = async ({
  amount,
  currency = "USD",
  recipientEmail,
  note,
  metadata
}: PayPalPayoutPayload) => {
  const token = await getPayPalAccessToken();
  if (!token) return null;

  const response = await fetch(`${PAYPAL_API_BASE}/v1/payments/payouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: metadata?.payoutId ?? `batch-${Date.now()}`,
        email_subject: "Tri State Enterprise payout ready"
      },
      items: [
        {
          recipient_type: "EMAIL",
          amount: {
            value: amount.toFixed(2),
            currency
          },
          receiver: recipientEmail,
          note,
          sender_item_id: metadata?.jobId ?? `item-${Date.now()}`
        }
      ]
    })
  });

  if (!response.ok) {
    console.error("[payments] Failed to create PayPal payout", await response.text());
    return null;
  }

  return (await response.json()) as {
    batch_header: {
      payout_batch_id: string;
      batch_status: string;
    };
  };
};
