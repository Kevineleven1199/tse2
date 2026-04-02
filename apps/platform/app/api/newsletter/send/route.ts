import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNewsletter } from "@/src/lib/newsletter/generator";
import { sendNewsletter } from "@/src/lib/newsletter/sender";

export const dynamic = "force-dynamic";

/**
 * POST /api/newsletter/send
 *
 * Triggers the daily newsletter send.
 * Protected by a secret key to prevent unauthorized sends.
 *
 * Can be called by:
 * - Railway Cron Job
 * - External scheduler (cron-job.org, etc.)
 * - Manual trigger from admin panel
 *
 * Headers:
 *   Authorization: Bearer <NEWSLETTER_SECRET>
 *
 * Body (optional):
 *   { "date": "2025-02-14" } — override date for testing
 */
export const POST = async (request: Request) => {
  try {
    // Auth check
    const secret = process.env.NEWSLETTER_SECRET;
    const authHeader = request.headers.get("authorization");

    if (secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Optional date override and force flag for testing
    let targetDate = new Date();
    let force = false;
    try {
      const body = await request.json().catch(() => null);
      if (body?.date) {
        targetDate = new Date(body.date);
      }
      if (body?.force) {
        force = true;
      }
    } catch {
      // No body, use today
    }

    // Check if already sent today (skip check if force=true)
    if (!force) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const alreadySent = await prisma.newsletterSend.findFirst({
        where: {
          sentAt: {
            gte: today,
            lt: tomorrow,
          },
          status: "sent",
        },
      });

      if (alreadySent) {
        return NextResponse.json({
          message: "Newsletter already sent today",
          subject: alreadySent.subject,
          recipients: alreadySent.recipients,
        });
      }
    }

    // Generate newsletter
    const newsletter = generateNewsletter(targetDate);

    // Get active subscribers
    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { status: "active" },
      select: { email: true },
    });

    const emails = subscribers.map((s) => s.email);

    // Send
    const result = await sendNewsletter(newsletter, emails);

    // Log the send
    await prisma.newsletterSend.create({
      data: {
        tenantId: process.env.DEFAULT_TENANT_ID || "",
        subject: newsletter.subject,
        preview: newsletter.preview,
        source: newsletter.source,
        recipients: result.recipientCount,
        provider: result.provider,
        status: result.success ? "sent" : "failed",
      },
    });

    return NextResponse.json({
      success: result.success,
      subject: newsletter.subject,
      source: newsletter.source,
      recipients: result.recipientCount,
      provider: result.provider,
      error: result.error,
    });
  } catch (error) {
    console.error("[newsletter-send] Error:", error);
    return NextResponse.json(
      { error: "Newsletter send failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
};
