import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createStripeTransfer } from "@/src/lib/payments";

export const dynamic = "force-dynamic";

// This endpoint should be called by a cron job (e.g., Railway cron)
// Recommended schedule: Every 15 minutes or hourly
// It processes QUEUED payouts by executing Stripe transfers to cleaners' connected accounts.

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Recovery: reclaim any PROCESSING payouts that have been stuck for > 10 minutes
    // (indicates a previous cron run crashed before completing)
    const staleThreshold = new Date(Date.now() - 10 * 60 * 1000);
    await prisma.cleanerPayout.updateMany({
      where: { status: "PROCESSING", updatedAt: { lt: staleThreshold } },
      data: { status: "QUEUED" },
    });

    // Atomically claim QUEUED payouts by transitioning them to PROCESSING.
    // This prevents duplicate processing if the cron runs concurrently.
    const claimed = await prisma.cleanerPayout.updateMany({
      where: { status: "QUEUED" },
      data: { status: "PROCESSING" },
    });

    if (claimed.count === 0) {
      return NextResponse.json({ message: "No queued payouts", processed: 0 });
    }

    // Now fetch the records we just claimed
    const queuedPayouts = await prisma.cleanerPayout.findMany({
      where: { status: "PROCESSING" },
      include: {
        cleaner: {
          select: {
            id: true,
            stripeAccountId: true,
            user: { select: { firstName: true, email: true } },
          },
        },
      },
      take: 50,
    });

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const payout of queuedPayouts) {
      if (!payout.cleaner.stripeAccountId) {
        await prisma.cleanerPayout.update({
          where: { id: payout.id },
          data: {
            status: "FAILED",
            failureReason: "No Stripe account connected",
          },
        });
        failed++;
        continue;
      }

      try {

        // Execute the Stripe transfer
        const transfer = await createStripeTransfer({
          amount: payout.amount,
          destinationAccount: payout.cleaner.stripeAccountId,
          currency: payout.currency,
          metadata: {
            payoutId: payout.id,
            jobId: payout.jobId || "",
            cleanerId: payout.cleanerId,
          },
        });

        if (transfer) {
          await prisma.cleanerPayout.update({
            where: { id: payout.id },
            data: {
              status: "SENT",
              providerPayoutId: transfer.id,
              completedAt: new Date(),
            },
          });
          processed++;
          console.log(
            `[payouts] Sent $${payout.amount.toFixed(2)} to ${payout.cleaner.user?.firstName || payout.cleanerId} (${transfer.id})`
          );
        } else {
          // Stripe key not configured — revert to QUEUED for retry
          await prisma.cleanerPayout.update({
            where: { id: payout.id },
            data: { status: "QUEUED" },
          });
          errors.push(`Payout ${payout.id}: Stripe not configured`);
          failed++;
        }
      } catch (err: any) {
        await prisma.cleanerPayout.update({
          where: { id: payout.id },
          data: {
            status: "FAILED",
            failureReason: err.message?.slice(0, 500) || "Transfer failed",
          },
        });
        errors.push(`Payout ${payout.id}: ${err.message}`);
        failed++;
        console.error(`[payouts] Failed payout ${payout.id}:`, err.message);
      }
    }

    return NextResponse.json({
      message: "Payout processing complete",
      queued: queuedPayouts.length,
      processed,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("[payouts] Cron job failed:", error);
    return NextResponse.json(
      { error: "Payout processing failed", details: error.message },
      { status: 500 }
    );
  }
}
