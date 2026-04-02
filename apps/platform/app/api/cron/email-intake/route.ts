export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processInboundEmail } from "@/src/lib/email-intake";

/**
 * Cron endpoint to process unprocessed customer emails
 * This handles cases where the webhook failed or emails were manually imported
 *
 * Requires CRON_SECRET header or query param for authorization
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const secret =
      new URL(request.url).searchParams.get("secret") ||
      request.headers.get("x-cron-secret") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Find unprocessed emails (give 1 hour for webhook to process first)
    const unprocessedEmails = await prisma.customerEmail.findMany({
      where: {
        status: "unread",
        processedAt: null,
        createdAt: {
          lt: oneHourAgo,
        },
      },
      take: 100, // Process in batches
      orderBy: { createdAt: "asc" },
    });

    // Find old emails still marked as unread after 24 hours (escalate priority)
    const staleEmails = await prisma.customerEmail.findMany({
      where: {
        status: "unread",
        createdAt: {
          lt: twentyFourHoursAgo,
        },
      },
      select: { id: true, priority: true },
    });

    // Escalate priority for stale emails
    let escalatedCount = 0;
    for (const email of staleEmails) {
      if (email.priority !== "urgent") {
        await prisma.customerEmail.update({
          where: { id: email.id },
          data: { priority: "high" },
        });
        escalatedCount++;
      }
    }

    // Process each unprocessed email
    let processedCount = 0;
    let failedCount = 0;
    const results = [];

    for (const email of unprocessedEmails) {
      try {
        const result = await processInboundEmail(email.id);
        processedCount++;
        results.push({
          emailId: email.id,
          status: "processed",
          result,
        });
      } catch (error) {
        failedCount++;
        console.error(`[email-intake] Failed to process email ${email.id}:`, error);
        results.push({
          emailId: email.id,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        timestamp: now.toISOString(),
        unprocessedFound: unprocessedEmails.length,
        processedCount,
        failedCount,
        escalatedCount,
        staleEmailsFound: staleEmails.length,
        results: results.slice(0, 10), // Return sample results
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[cron/email-intake] Cron error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process emails",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Support POST for flexibility
  return GET(request);
}
