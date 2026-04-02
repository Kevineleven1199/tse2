import { prisma } from "@/lib/prisma";
import { CancellationPolicy } from "@prisma/client";

/**
 * Result of calculating a cancellation fee
 */
export interface CancellationFeeResult {
  fee: number;
  policyApplied: CancellationPolicy | null;
  hoursBeforeJob: number;
  reason: string;
}

/**
 * Calculates the cancellation fee for a job based on when it's cancelled
 *
 * @param tenantId - The tenant ID
 * @param jobScheduledStart - The job's scheduled start time
 * @param cancellationTime - The time of cancellation
 * @param jobAmount - The total job amount (used for percentage calculations)
 * @returns A result object containing the fee and policy details
 */
export async function calculateCancellationFee(
  tenantId: string,
  jobScheduledStart: Date,
  cancellationTime: Date,
  jobAmount: number
): Promise<CancellationFeeResult> {
  // Calculate hours between cancellation time and job start
  const timeDifferenceMs = jobScheduledStart.getTime() - cancellationTime.getTime();
  const hoursBeforeJob = timeDifferenceMs / (1000 * 60 * 60);

  // Fetch all active policies for this tenant, sorted by hoursBeforeJob ascending
  const policies = await prisma.cancellationPolicy.findMany({
    where: {
      tenantId,
      active: true,
    },
    orderBy: {
      hoursBeforeJob: "asc",
    },
  });

  // Find the matching policy: the one where hoursBeforeJob >= actual hours
  // We want the most specific match (smallest hoursBeforeJob that still applies)
  let matchingPolicy: CancellationPolicy | null = null;

  for (const policy of policies) {
    if (policy.hoursBeforeJob <= hoursBeforeJob) {
      // This policy applies - update matchingPolicy to this one
      // Since we're iterating in ascending order, the last match is the most specific
      matchingPolicy = policy;
    } else {
      // Policies are sorted ascending, so we can stop here
      break;
    }
  }

  // If no policy matches, no fee applies (cancellation is far enough in advance)
  if (!matchingPolicy) {
    return {
      fee: 0,
      policyApplied: null,
      hoursBeforeJob: Math.ceil(hoursBeforeJob),
      reason: `Cancellation is ${Math.ceil(hoursBeforeJob)} hours before job - no fee applies`,
    };
  }

  // Calculate the fee based on the matched policy
  let fee = 0;
  if (matchingPolicy.feeType === "FLAT") {
    fee = matchingPolicy.feeValue;
  } else if (matchingPolicy.feeType === "PERCENTAGE") {
    fee = (matchingPolicy.feeValue / 100) * jobAmount;
  }

  return {
    fee: Math.round(fee * 100) / 100, // Round to 2 decimal places
    policyApplied: matchingPolicy,
    hoursBeforeJob: Math.ceil(hoursBeforeJob),
    reason: `Cancellation is ${Math.ceil(hoursBeforeJob)} hours before job - ${matchingPolicy.feeType === "FLAT" ? `$${matchingPolicy.feeValue}` : `${matchingPolicy.feeValue}%`} fee applies`,
  };
}

/**
 * Applies a cancellation fee to a job
 * Calculates the fee, creates an audit log entry, and returns the result
 *
 * @param tenantId - The tenant ID
 * @param jobId - The job ID to apply the cancellation fee to
 * @param cancellationTime - The time of cancellation
 * @returns A result object containing the fee and policy details
 */
export async function applyCancellationFee(
  tenantId: string,
  jobId: string,
  cancellationTime: Date
): Promise<CancellationFeeResult> {
  // Fetch the job to get its scheduled start time and amount
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      request: true,
    },
  });

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  if (job.tenantId !== tenantId) {
    throw new Error(`Job does not belong to tenant: ${tenantId}`);
  }

  if (!job.scheduledStart) {
    throw new Error(`Job has no scheduled start time: ${jobId}`);
  }

  // Calculate the cancellation fee
  const feeResult = await calculateCancellationFee(
    tenantId,
    job.scheduledStart,
    cancellationTime,
    job.payoutAmount || 0
  );

  // Create an audit log entry
  if (feeResult.fee > 0 || feeResult.policyApplied) {
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: undefined, // Could be set from session if available
        action: "JOB_CANCELLATION_FEE",
        metadata: {
          jobId,
          fee: feeResult.fee,
          policyId: feeResult.policyApplied?.id || null,
          hoursBeforeJob: feeResult.hoursBeforeJob,
          jobScheduledStart: job.scheduledStart.toISOString(),
          cancellationTime: cancellationTime.toISOString(),
          reason: feeResult.reason,
        },
      },
    });
  }

  return feeResult;
}
