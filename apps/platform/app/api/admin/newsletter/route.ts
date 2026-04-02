import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import { generateNewsletter, previewUpcoming } from "@/src/lib/newsletter";
import { sendNewsletter } from "@/src/lib/newsletter/sender";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/newsletter
 * Preview newsletter schedule, subscriber count, and recent sends
 */
export async function GET() {
  const session = await requireSession({ roles: ["HQ"] });

  const [subscriberCount, recentSends, upcoming] = await Promise.all([
    prisma.newsletterSubscriber.count({ where: { status: "active" } }),
    prisma.newsletterSend.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { sentAt: "desc" },
      take: 10,
    }),
    Promise.resolve(previewUpcoming(14)), // next 2 weeks
  ]);

  return NextResponse.json({
    subscriberCount,
    recentSends: recentSends.map((s) => ({
      id: s.id,
      subject: s.subject,
      preview: s.preview,
      source: s.source,
      recipients: s.recipients,
      provider: s.provider,
      status: s.status,
      sentAt: s.sentAt.toISOString(),
    })),
    upcoming: upcoming.map((u) => ({
      date: u.date.toISOString().split("T")[0],
      subject: u.subject,
      source: u.source,
    })),
  });
}

/**
 * POST /api/admin/newsletter
 * Send newsletter now (manual trigger)
 */
export async function POST(request: Request) {
  const session = await requireSession({ roles: ["HQ"] });
  const body = await request.json().catch(() => ({}));
  const targetDate = body.date ? new Date(body.date) : new Date();

  // Generate content
  const newsletter = generateNewsletter(targetDate);

  // Get subscribers
  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: { status: "active" },
    select: { email: true },
  });

  if (subscribers.length === 0) {
    return NextResponse.json({ error: "No active subscribers" }, { status: 400 });
  }

  const emails = subscribers.map((s) => s.email);

  // Send
  const result = await sendNewsletter(newsletter, emails);

  // Log
  await prisma.newsletterSend.create({
    data: {
      tenantId: session.tenantId,
      subject: newsletter.subject,
      preview: newsletter.preview ?? "",
      source: newsletter.source,
      recipients: emails.length,
      provider: result.provider,
      status: result.success ? "sent" : "failed",
      sentAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "newsletter.sent",
      metadata: {
        subject: newsletter.subject,
        recipients: emails.length,
        provider: result.provider,
        success: result.success,
      },
    },
  });

  return NextResponse.json({
    success: result.success,
    subject: newsletter.subject,
    recipients: emails.length,
    provider: result.provider,
    error: result.error,
  });
}
