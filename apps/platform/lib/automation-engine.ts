import { prisma } from "@/lib/prisma";
import { sendSms, sendOperationalSms, sendEmail } from "@/src/lib/notifications";
import { finalizeJobAutomation } from "@/lib/notifications";
import {
  buildNewJobEmail,
  buildJobClaimedEmail,
  buildScheduleConfirmedEmail,
  buildReminderEmail,
} from "@/lib/email-templates";

// Service type to skill label mapping
const SERVICE_SKILL_MAP: Record<string, string[]> = {
  HOME_CLEAN: ["home_cleaning", "deep_clean", "standard_clean"],
  PRESSURE_WASH: ["pressure_washing", "exterior_clean"],
  AUTO_DETAIL: ["auto_detail", "car_cleaning"],
  CUSTOM: ["home_cleaning", "deep_clean"],
};

interface CleanerMatch {
  cleanerProfileId: string;
  cleanerName: string;
  cleanerPhone: string | null;
  cleanerEmail: string;
  score: number;
  distance: number | null;
  availabilityMatch: boolean;
  hasRequiredSkills: boolean;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if a cleaner's availability matches the preferred time windows
 */
function checkAvailabilityMatch(
  availability: { weekday: number; startTime: string; endTime: string }[],
  preferredWindows: { start: string; end: string }[] | null
): boolean {
  if (!preferredWindows || preferredWindows.length === 0) return true;

  for (const window of preferredWindows) {
    const windowStart = new Date(window.start);
    const windowDay = windowStart.getDay();
    const windowTimeStr = windowStart.toTimeString().slice(0, 5);

    const matchingSlot = availability.find((slot) => {
      if (slot.weekday !== windowDay) return false;
      return slot.startTime <= windowTimeStr && slot.endTime >= windowTimeStr;
    });

    if (matchingSlot) return true;
  }

  return false;
}

/**
 * Find the best matching cleaners for a job based on location, availability, skills, and rating
 */
export async function findMatchingCleaners(
  jobId: string,
  limit: number = 5
): Promise<CleanerMatch[]> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      request: true,
      tenant: true,
    },
  });

  if (!job) {
    throw new Error("Job not found");
  }

  const cleaners = await prisma.cleanerProfile.findMany({
    where: {
      active: true,
      user: {
        tenantId: job.tenantId,
        status: "active",
      },
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      skills: true,
      availability: true,
      assignments: {
        where: {
          job: {
            scheduledStart: {
              gte: new Date(),
            },
          },
        },
        include: {
          job: true,
        },
      },
    },
  });

  const preferredWindows = job.request.preferredWindows as
    | { start: string; end: string }[]
    | null;

  const requiredSkills = SERVICE_SKILL_MAP[job.request.serviceType] || [];

  const matches: CleanerMatch[] = [];

  for (const cleaner of cleaners) {
    // Skip if cleaner has a conflicting job scheduled
    const hasConflict = cleaner.assignments.some((assignment) => {
      if (!assignment.job.scheduledStart || !assignment.job.scheduledEnd)
        return false;
      if (!preferredWindows || preferredWindows.length === 0) return false;

      for (const window of preferredWindows) {
        const windowStart = new Date(window.start);
        const windowEnd = new Date(window.end);
        const jobStart = assignment.job.scheduledStart;
        const jobEnd = assignment.job.scheduledEnd;

        // Check for overlap
        if (windowStart < jobEnd && windowEnd > jobStart) {
          return true;
        }
      }
      return false;
    });

    if (hasConflict) continue;

    // Calculate distance if coordinates are available
    let distance: number | null = null;
    if (job.request.lat && job.request.lng) {
      // Use a default location for cleaner (could be enhanced with cleaner home location)
      // For now, we'll assume within service radius if location exists
      distance = 0; // Placeholder - in production, store cleaner home coordinates
    }

    // Check if within service radius
    if (distance !== null && distance > cleaner.serviceRadius) {
      continue;
    }

    // Check availability match
    const availabilityMatch = checkAvailabilityMatch(
      cleaner.availability,
      preferredWindows
    );

    // Check skills match
    const cleanerSkillLabels = cleaner.skills.map((s) =>
      s.label.toLowerCase().replace(/\s+/g, "_")
    );
    const hasRequiredSkills =
      requiredSkills.length === 0 ||
      requiredSkills.some((skill) => cleanerSkillLabels.includes(skill));

    // Calculate match score (0-100)
    let score = 50; // Base score

    // Rating bonus (up to 25 points)
    score += cleaner.rating * 5;

    // Experience bonus (up to 15 points)
    score += Math.min(cleaner.completedJobs / 10, 15);

    // Availability match bonus (10 points)
    if (availabilityMatch) score += 10;

    // Skills match bonus (15 points)
    if (hasRequiredSkills) score += 15;

    // Distance penalty (up to -20 points)
    if (distance !== null) {
      score -= Math.min(distance * 2, 20);
    }

    matches.push({
      cleanerProfileId: cleaner.id,
      cleanerName: `${cleaner.user.firstName} ${cleaner.user.lastName}`.trim(),
      cleanerPhone: cleaner.user.phone,
      cleanerEmail: cleaner.user.email,
      score: Math.round(score),
      distance,
      availabilityMatch,
      hasRequiredSkills,
    });
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  return matches.slice(0, limit);
}

/**
 * Notify matching cleaners about a new available job
 */
export async function notifyMatchingCleaners(jobId: string): Promise<number> {
  const matches = await findMatchingCleaners(jobId, 10);

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      request: {
        include: {
          quote: true,
        },
      },
    },
  });

  if (!job || !job.request.quote) {
    return 0;
  }

  const cleanerPayout = (job.payoutAmount ?? job.request.quote.total * 0.62).toFixed(2);
  const preferredWindows = job.request.preferredWindows as
    | { start: string; end: string }[]
    | null;

  let notified = 0;

  for (const match of matches) {
    const windowText = preferredWindows?.[0]
      ? new Date(preferredWindows[0].start).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      : "Flexible";

    const message = `🏠 New Job! ${job.request.serviceType.replace("_", " ")} in ${job.request.city}. Earn $${cleanerPayout}. ${windowText}. Reply CLAIM or open Tri State app to claim.`;

    // SMS notification
    if (match.cleanerPhone) {
      try {
        await sendSms({
          to: match.cleanerPhone.replace(/[^\d+]/g, ""),
          text: message,
        });
        notified++;

        await prisma.notification.create({
          data: {
            tenantId: job.tenantId,
            jobId: job.id,
            channel: "SMS",
            payload: {
              type: "JOB_AVAILABLE",
              cleanerId: match.cleanerProfileId,
              message,
            },
            delivered: true,
          },
        });
      } catch (error) {
        console.error(`Failed to SMS cleaner ${match.cleanerProfileId}:`, error);
      }
    }

    // Email notification
    try {
      const emailData = buildNewJobEmail({
        serviceType: job.request.serviceType,
        city: job.request.city,
        payout: cleanerPayout,
        date: windowText,
      });
      await sendEmail({
        to: match.cleanerEmail,
        subject: emailData.subject,
        html: emailData.html,
      });
      if (!match.cleanerPhone) notified++;

      await prisma.notification.create({
        data: {
          tenantId: job.tenantId,
          jobId: job.id,
          channel: "EMAIL",
          payload: {
            type: "JOB_AVAILABLE",
            cleanerId: match.cleanerProfileId,
            email: match.cleanerEmail,
          },
          delivered: true,
        },
      });
    } catch (error) {
      console.error(`Failed to email cleaner ${match.cleanerProfileId}:`, error);
    }
  }

  return notified;
}

/**
 * Notify customer when their job has been claimed by a cleaner
 */
export async function notifyCustomerJobClaimed(jobId: string): Promise<void> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      request: true,
      assignments: {
        include: {
          cleaner: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
            },
          },
        },
      },
    },
  });

  if (!job || job.assignments.length === 0) return;

  const cleaner = job.assignments[0].cleaner;
  const cleanerName = `${cleaner.user.firstName}`.trim() || "Your cleaner";

  const message = `Great news! ${cleanerName} has been assigned to your ${job.request.serviceType.replace("_", " ").toLowerCase()}. We'll confirm your appointment time shortly. Questions? Reply to this text.`;

  // SMS
  try {
    await sendSms({
      to: job.request.customerPhone.replace(/[^\d+]/g, ""),
      text: message,
    });

    await prisma.notification.create({
      data: {
        tenantId: job.tenantId,
        jobId: job.id,
        channel: "SMS",
        payload: { type: "JOB_CLAIMED_CUSTOMER", message },
        delivered: true,
      },
    });
  } catch (error) {
    console.error("Failed to SMS customer of claimed job:", error);
  }

  // Email
  try {
    const emailData = buildJobClaimedEmail({
      cleanerName,
      serviceType: job.request.serviceType,
    });
    await sendEmail({
      to: job.request.customerEmail,
      subject: emailData.subject,
      html: emailData.html,
    });

    await prisma.notification.create({
      data: {
        tenantId: job.tenantId,
        jobId: job.id,
        channel: "EMAIL",
        payload: { type: "JOB_CLAIMED_CUSTOMER", email: job.request.customerEmail },
        delivered: true,
      },
    });
  } catch (error) {
    console.error("Failed to email customer of claimed job:", error);
  }
}

/**
 * Confirm schedule with both customer and cleaner
 */
export async function confirmScheduleWithParties(jobId: string): Promise<void> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      request: {
        include: {
          quote: true,
        },
      },
      assignments: {
        include: {
          cleaner: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
            },
          },
        },
      },
    },
  });

  if (!job || !job.scheduledStart || !job.scheduledEnd) return;

  const scheduleDate = job.scheduledStart.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const scheduleTime = job.scheduledStart.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  // Notify customer — SMS
  const customerMessage = `✅ Confirmed! Your ${job.request.serviceType.replace("_", " ").toLowerCase()} is scheduled for ${scheduleDate} at ${scheduleTime}. Address: ${job.request.addressLine1}, ${job.request.city}. We'll send a reminder the day before.`;

  try {
    await sendSms({
      to: job.request.customerPhone.replace(/[^\d+]/g, ""),
      text: customerMessage,
    });

    await prisma.notification.create({
      data: {
        tenantId: job.tenantId,
        jobId: job.id,
        channel: "SMS",
        payload: { type: "SCHEDULE_CONFIRMED_CUSTOMER", message: customerMessage },
        delivered: true,
      },
    });
  } catch (error) {
    console.error("Failed to SMS customer of schedule:", error);
  }

  // Notify customer — Email
  try {
    const custEmail = buildScheduleConfirmedEmail({
      date: scheduleDate,
      time: scheduleTime,
      address: `${job.request.addressLine1}, ${job.request.city}`,
      serviceType: job.request.serviceType,
      contactName: job.request.customerName,
      variant: "customer",
    });
    await sendEmail({
      to: job.request.customerEmail,
      subject: custEmail.subject,
      html: custEmail.html,
    });

    await prisma.notification.create({
      data: {
        tenantId: job.tenantId,
        jobId: job.id,
        channel: "EMAIL",
        payload: { type: "SCHEDULE_CONFIRMED_CUSTOMER", email: job.request.customerEmail },
        delivered: true,
      },
    });
  } catch (error) {
    console.error("Failed to email customer of schedule:", error);
  }

  // Notify cleaner(s)
  for (const assignment of job.assignments) {
    const cleanerPayout = (job.payoutAmount ?? 0).toFixed(2);
    const cleanerMessage = `📅 Job Confirmed: ${job.request.serviceType.replace("_", " ")} on ${scheduleDate} at ${scheduleTime}. 📍 ${job.request.addressLine1}, ${job.request.city}. Customer: ${job.request.customerName}. Payout: $${cleanerPayout}`;

    // Cleaner SMS
    if (assignment.cleaner.user.phone) {
      try {
        await sendSms({
          to: assignment.cleaner.user.phone.replace(/[^\d+]/g, ""),
          text: cleanerMessage,
        });

        await prisma.notification.create({
          data: {
            tenantId: job.tenantId,
            jobId: job.id,
            channel: "SMS",
            payload: { type: "SCHEDULE_CONFIRMED_CLEANER", cleanerId: assignment.cleanerId, message: cleanerMessage },
            delivered: true,
          },
        });
      } catch (error) {
        console.error(`Failed to SMS cleaner ${assignment.cleanerId}:`, error);
      }
    }

    // Cleaner Email
    try {
      const clnEmail = buildScheduleConfirmedEmail({
        date: scheduleDate,
        time: scheduleTime,
        address: `${job.request.addressLine1}, ${job.request.city}`,
        serviceType: job.request.serviceType,
        contactName: job.request.customerName,
        variant: "cleaner",
        payout: cleanerPayout,
      });
      await sendEmail({
        to: assignment.cleaner.user.email,
        subject: clnEmail.subject,
        html: clnEmail.html,
      });

      await prisma.notification.create({
        data: {
          tenantId: job.tenantId,
          jobId: job.id,
          channel: "EMAIL",
          payload: { type: "SCHEDULE_CONFIRMED_CLEANER", cleanerId: assignment.cleanerId, email: assignment.cleaner.user.email },
          delivered: true,
        },
      });
    } catch (error) {
      console.error(`Failed to email cleaner ${assignment.cleanerId}:`, error);
    }
  }

  // Update request status
  await prisma.serviceRequest.update({
    where: { id: job.requestId },
    data: { status: "SCHEDULED" },
  });

  // Trigger calendar sync and payout queue
  await finalizeJobAutomation(jobId);
}

/**
 * Send reminder to customer 24 hours before appointment
 */
export async function sendAppointmentReminders(): Promise<number> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  const jobs = await prisma.job.findMany({
    where: {
      status: "SCHEDULED",
      scheduledStart: {
        gte: tomorrow,
        lt: dayAfterTomorrow,
      },
    },
    include: {
      request: true,
      assignments: {
        include: {
          cleaner: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
            },
          },
        },
      },
    },
  });

  let remindersSent = 0;

  for (const job of jobs) {
    if (!job.scheduledStart) continue;

    const scheduleTime = job.scheduledStart.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    // Customer reminder — SMS
    const customerMessage = `⏰ Reminder: Your ${job.request.serviceType.replace("_", " ").toLowerCase()} is tomorrow at ${scheduleTime}. Please ensure access to your home. Questions? Reply here.`;

    try {
      await sendSms({
        to: job.request.customerPhone.replace(/[^\d+]/g, ""),
        text: customerMessage,
      });
      remindersSent++;
    } catch (error) {
      console.error(`Failed to SMS customer reminder for job ${job.id}:`, error);
    }

    // Customer reminder — Email
    try {
      const custReminder = buildReminderEmail({
        date: job.scheduledStart.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
        time: scheduleTime,
        address: `${job.request.addressLine1}, ${job.request.city}`,
        serviceType: job.request.serviceType,
        variant: "customer",
      });
      await sendEmail({
        to: job.request.customerEmail,
        subject: custReminder.subject,
        html: custReminder.html,
      });
    } catch (error) {
      console.error(`Failed to email customer reminder for job ${job.id}:`, error);
    }

    // Cleaner reminder
    for (const assignment of job.assignments) {
      const cleanerMessage = `⏰ Tomorrow: ${job.request.serviceType.replace("_", " ")} at ${scheduleTime}. 📍 ${job.request.addressLine1}, ${job.request.city}. Customer: ${job.request.customerName} (${job.request.customerPhone})`;

      // Cleaner SMS
      if (assignment.cleaner.user.phone) {
        try {
          await sendSms({
            to: assignment.cleaner.user.phone.replace(/[^\d+]/g, ""),
            text: cleanerMessage,
          });
          remindersSent++;
        } catch (error) {
          console.error(`Failed to SMS cleaner reminder for job ${job.id}:`, error);
        }
      }

      // Cleaner Email
      try {
        const clnReminder = buildReminderEmail({
          date: job.scheduledStart!.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
          time: scheduleTime,
          address: `${job.request.addressLine1}, ${job.request.city}`,
          serviceType: job.request.serviceType,
          variant: "cleaner",
          contactName: job.request.customerName,
          contactPhone: job.request.customerPhone,
        });
        await sendEmail({
          to: assignment.cleaner.user.email,
          subject: clnReminder.subject,
          html: clnReminder.html,
        });
      } catch (error) {
        console.error(`Failed to email cleaner reminder for job ${job.id}:`, error);
      }
    }
  }

  return remindersSent;
}

/**
 * Auto-assign the best matching cleaner to a job
 */
export async function autoAssignCleaner(jobId: string): Promise<CleanerMatch | null> {
  const matches = await findMatchingCleaners(jobId, 1);

  if (matches.length === 0) {
    // Notify HQ that no cleaners are available
    await sendOperationalSms(
      `⚠️ No matching cleaners found for job ${jobId}. Manual assignment required.`
    );
    return null;
  }

  const bestMatch = matches[0];

  // Auto-assign if score is high enough (80+)
  if (bestMatch.score >= 80) {
    await prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: jobId },
        data: { status: "CLAIMED" },
      });

      await tx.jobAssignment.create({
        data: {
          jobId,
          cleanerId: bestMatch.cleanerProfileId,
          status: "CLAIMED",
        },
      });
    });

    // Notify the assigned cleaner
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { request: true },
    });

    if (job) {
      if (bestMatch.cleanerPhone) {
        await sendSms({
          to: bestMatch.cleanerPhone.replace(/[^\d+]/g, ""),
          text: `🎉 You've been assigned a new job! ${job.request.serviceType.replace("_", " ")} in ${job.request.city}. Check the Tri State app for details and confirm your availability.`,
        });
      }

      // Email the assigned cleaner
      try {
        const emailData = buildNewJobEmail({
          serviceType: job.request.serviceType,
          city: job.request.city,
          payout: (job.payoutAmount ?? 0).toFixed(2),
          date: "Auto-assigned",
        });
        await sendEmail({
          to: bestMatch.cleanerEmail,
          subject: emailData.subject,
          html: emailData.html,
        });
      } catch (error) {
        console.error(`Failed to email auto-assigned cleaner:`, error);
      }
    }

    // Notify customer
    await notifyCustomerJobClaimed(jobId);

    await sendOperationalSms(
      `✅ Auto-assigned job ${jobId} to ${bestMatch.cleanerName} (score: ${bestMatch.score})`
    );

    return bestMatch;
  }

  // If score is below threshold, notify matching cleaners instead
  await notifyMatchingCleaners(jobId);

  return null;
}

/**
 * Process quote acceptance - creates job and triggers automation
 */
export async function processQuoteAcceptance(requestId: string): Promise<string> {
  const request = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    include: { quote: true },
  });

  if (!request || !request.quote) {
    throw new Error("Request or quote not found");
  }

  // Create job
  const cleanerPayout = request.quote.total * 0.62;
  const estimatedHours = Math.round((cleanerPayout / 25) * 10) / 10; // derive from $25/hr default rate

  const job = await prisma.job.create({
    data: {
      tenantId: request.tenantId,
      requestId: request.id,
      status: "PENDING",
      payoutAmount: cleanerPayout,
      estimatedHours,
    },
  });

  // Update request status
  await prisma.serviceRequest.update({
    where: { id: requestId },
    data: { status: "ACCEPTED" },
  });

  // Notify customer
  await sendSms({
    to: request.customerPhone.replace(/[^\d+]/g, ""),
    text: `Thank you! Your quote has been accepted. We're now matching you with the perfect cleaner. You'll hear from us shortly!`,
  });

  // Try auto-assignment or notify cleaners
  const autoAssigned = await autoAssignCleaner(job.id);

  if (!autoAssigned) {
    await sendOperationalSms(
      `📋 New job created from quote acceptance. Request: ${requestId}. Awaiting cleaner assignment.`
    );
  }

  return job.id;
}
