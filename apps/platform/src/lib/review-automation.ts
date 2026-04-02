/**
 * Review Request Automation
 * Sends SMS review requests to customers 24 hours after job completion
 */

import { prisma } from "@/lib/prisma";
import { sendSms, toE164 } from "@/src/lib/openphone";

interface EligibleJob {
  id: string;
  customerPhone: string;
  customerName: string;
  requestId: string;
  updatedAt: Date;
}

/**
 * Find jobs completed 24 hours ago that haven't had review requests sent yet
 */
export async function findEligibleJobs(): Promise<EligibleJob[]> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const jobs = await prisma.job.findMany({
    where: {
      status: "COMPLETED",
      updatedAt: {
        gte: twoDaysAgo,
        lte: oneDayAgo,
      },
    },
    include: {
      request: true,
    },
  });

  return jobs
    .filter((job) => {
      // Validate job and request
      if (!job.request) return false;
      if (!job.request.customerPhone || typeof job.request.customerPhone !== "string") {
        return false;
      }
      // Phone should be non-empty after trimming
      return job.request.customerPhone.trim().length > 0;
    })
    .map((job) => ({
      id: job.id,
      customerPhone: job.request!.customerPhone.trim(),
      customerName: job.request!.customerName || "Valued Customer",
      requestId: job.requestId || job.id,
      updatedAt: job.updatedAt,
    }));
}

/**
 * Send review request SMS to a customer
 */
export async function sendReviewRequest(job: EligibleJob): Promise<boolean> {
  try {
    // Validate job data
    if (!job || !job.id || !job.customerPhone) {
      console.error("Invalid job data for review request");
      return false;
    }

    // Convert phone to E164 format with validation
    let phone: string;
    try {
      phone = toE164(job.customerPhone);
      if (!phone || !phone.startsWith("+")) {
        console.error(`Invalid phone number format after conversion for job ${job.id}: ${job.customerPhone}`);
        return false;
      }
    } catch (err) {
      console.error(`Failed to convert phone number for job ${job.id}: ${job.customerPhone}`, err);
      return false;
    }

    const success = await sendSms({
      to: [phone],
      content: `Thank you for choosing us! We'd love to hear about your experience. Please leave a review: [REVIEW_LINK]`,
    });

    if (success) {
      // Log that we sent a review request (you might want to add a field to Job or a separate table for this)
      console.log(`Review request sent to customer for job ${job.id}`);
    }

    return success;
  } catch (error) {
    console.error(`Failed to send review request for job ${job.id}:`, error);
    return false;
  }
}

/**
 * Process all eligible jobs
 * Continues processing even if individual jobs fail
 */
export async function processReviewRequests() {
  try {
    const eligibleJobs = await findEligibleJobs();

    if (!Array.isArray(eligibleJobs) || eligibleJobs.length === 0) {
      console.log("No eligible jobs for review requests");
      return 0;
    }

    let successCount = 0;
    let failCount = 0;

    for (const job of eligibleJobs) {
      try {
        const success = await sendReviewRequest(job);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        console.error(`Error processing review request for job ${job.id}:`, err);
        failCount++;
        // Continue with next job instead of breaking
      }
    }

    console.log(`Review requests processed: ${successCount} succeeded, ${failCount} failed`);
    return successCount;
  } catch (err) {
    console.error("Failed to process review requests:", err);
    return 0;
  }
}
