import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { emailDiscountCode } from "@/src/lib/email-failsafe";

export const dynamic = "force-dynamic";

const subscribeSchema = z.object({
  email: z.string().email("Please enter a valid email address").toLowerCase().max(255),
  firstName: z.string().max(100).optional(),
  neighborhood: z.string().max(255).optional(),
});

/**
 * POST /api/newsletter/subscribe
 * Subscribe a user to the newsletter with their email and optional details
 *
 * Rate limiting: Consider implementing rate limiting via middleware to prevent abuse
 * - Suggested: 5 requests per minute per IP
 * - Reject with 429 Too Many Requests if limit exceeded
 */
export const POST = async (request: Request) => {
  try {
    const body = await request.json();
    const payload = subscribeSchema.parse(body);
    const email = payload.email.toLowerCase();

    // ── 1. Try to save to DB (but don't let DB failures block email) ──
    let dbMessage = "";
    try {
      const existing = await prisma.newsletterSubscriber.findUnique({
        where: { email }
      });

      if (existing) {
        if (existing.status !== "active") {
          await prisma.newsletterSubscriber.update({
            where: { email },
            data: {
              status: "active",
              firstName: payload.firstName || existing.firstName,
              neighborhood: payload.neighborhood || existing.neighborhood,
              unsubscribedAt: null
            }
          });
          dbMessage = "Welcome back!";
        } else {
          dbMessage = "You're already subscribed!";
        }
      } else {
        await prisma.newsletterSubscriber.create({
          data: {
            email,
            firstName: payload.firstName,
            neighborhood: payload.neighborhood
          }
        });
        dbMessage = "You're subscribed!";
      }
    } catch (dbErr) {
      // DB may not have table yet — that's OK, we still send the email
      console.error("[newsletter-subscribe] DB error (non-fatal):", dbErr);
      dbMessage = "Got it!";
    }

    // ── 2. Always send the discount code email ──
    try {
      await emailDiscountCode(email);
    } catch (emailErr) {
      console.error("[newsletter-subscribe] Email error:", emailErr);
    }

    return NextResponse.json({
      message: `${dbMessage} Your 15% discount code GREEN15 has been sent to your email.`
    });
  } catch (error) {
    console.error("[newsletter-subscribe] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: error.errors[0]?.message || "Invalid email",
          details: error.flatten()
        },
        { status: 422 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unable to subscribe. Please try again." },
      { status: 500 }
    );
  }
};
