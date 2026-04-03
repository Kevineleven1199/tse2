import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNewsletter } from "@/src/lib/newsletter/sender";
import type { GeneratedNewsletter } from "@/src/lib/newsletter/generator";

export const dynamic = "force-dynamic";

/**
 * POST /api/newsletter/weekly
 *
 * Sends a weekly digest newsletter every Monday.
 * Summarizes the week's tips and includes a promo.
 *
 * Protected by NEWSLETTER_SECRET or CRON_SECRET.
 */
export const POST = async (request: Request) => {
  try {
    const secret = process.env.NEWSLETTER_SECRET || process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");

    if (secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if already sent this week
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);

    const alreadySent = await prisma.newsletterSend.findFirst({
      where: {
        sentAt: { gte: weekStart },
        source: "weekly-digest",
        status: "sent",
      },
    });

    if (alreadySent) {
      return NextResponse.json({
        message: "Weekly digest already sent this week",
        subject: alreadySent.subject,
      });
    }

    // Get this week's sends for recap
    const weekSends = await prisma.newsletterSend.findMany({
      where: {
        sentAt: { gte: weekStart },
        status: "sent",
        source: { not: "weekly-digest" },
      },
      orderBy: { sentAt: "asc" },
      take: 7,
    });

    const recapItems = weekSends
      .map((s) => `<li style="margin-bottom: 8px;">${s.subject}</li>`)
      .join("");

    const recapSection = weekSends.length > 0
      ? `<h3 style="color: #2d5016; margin-top: 24px;">This Week's Tips Recap</h3>
         <ul style="color: #555; line-height: 1.8;">${recapItems}</ul>`
      : "";

    // Build weekly digest
    const weekNumber = Math.ceil(
      ((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) / 7
    );

    const newsletter: GeneratedNewsletter = {
      subject: `Weekly Green Clean Digest — Week ${weekNumber}`,
      preview: "Your weekly eco-cleaning roundup + exclusive offer inside",
      html: buildWeeklyDigestHTML(recapSection, weekNumber),
      text: `Weekly Green Clean Digest — Week ${weekNumber}. Your weekly eco-cleaning tips roundup.`,
      source: "weekly-digest" as "content",
      date: now,
    };

    // Get active subscribers
    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { status: "active" },
      select: { email: true },
    });

    const emails = subscribers.map((s) => s.email);
    const result = await sendNewsletter(newsletter, emails);

    // Log the send
    await prisma.newsletterSend.create({
      data: {
        tenantId: process.env.DEFAULT_TENANT_ID || "",
        subject: newsletter.subject,
        preview: newsletter.preview,
        source: "weekly-digest",
        recipients: result.recipientCount,
        provider: result.provider,
        status: result.success ? "sent" : "failed",
      },
    });

    return NextResponse.json({
      success: result.success,
      subject: newsletter.subject,
      recipients: result.recipientCount,
      provider: result.provider,
    });
  } catch (error) {
    console.error("[newsletter-weekly] Error:", error);
    return NextResponse.json(
      { error: "Weekly digest send failed" },
      { status: 500 }
    );
  }
};

function buildWeeklyDigestHTML(recapSection: string, weekNumber: number): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f9f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
  <tr>
    <td style="background:linear-gradient(135deg,#2d5016,#4a7c28);padding:32px 24px;text-align:center;">
      <h1 style="color:#ffffff;font-size:24px;margin:0;">Weekly Green Clean Digest</h1>
      <p style="color:#c8e6b0;font-size:14px;margin:8px 0 0;">Week ${weekNumber} — Your eco-cleaning roundup</p>
    </td>
  </tr>
  <tr>
    <td style="padding:32px 24px;">
      <p style="color:#333;font-size:16px;line-height:1.6;">
        Happy Monday! Here's your weekly roundup of professional services tips, plus an exclusive offer for our newsletter family.
      </p>

      ${recapSection}

      <div style="background:#f0f7eb;border-radius:12px;padding:24px;margin:24px 0;text-align:center;">
        <p style="color:#2d5016;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">This Week's Offer</p>
        <p style="color:#2d5016;font-size:28px;font-weight:bold;margin:0;">10% OFF</p>
        <p style="color:#555;font-size:14px;margin:8px 0 16px;">Use code <strong style="color:#2d5016;">WEEKLY10</strong> on your next booking</p>
        <a href="https://tsenow.com/get-a-quote" style="display:inline-block;background:#2d5016;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">Book Now</a>
      </div>

      <h3 style="color:#2d5016;">Quick Tip of the Week</h3>
      <p style="color:#555;line-height:1.6;">
        Did you know? Baking soda mixed with a few drops of lemon essential oil makes an incredible natural scrub for sinks and tubs. It's gentle, effective, and leaves a fresh citrus scent — no harsh chemicals needed.
      </p>

      <div style="border-top:1px solid #e8e8e8;margin-top:32px;padding-top:24px;">
        <p style="color:#999;font-size:12px;text-align:center;">
          You're receiving this because you subscribed to Tri State Enterprise's newsletter.<br>
          <a href="https://tsenow.com/api/newsletter/unsubscribe?email={{EMAIL}}" style="color:#999;">Unsubscribe</a>
        </p>
      </div>
    </td>
  </tr>
</table>
</body>
</html>`;
}
