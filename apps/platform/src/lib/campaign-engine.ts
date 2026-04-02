/**
 * Email Campaign Engine
 * Handles email campaign creation, sending, and tracking
 */

import { prisma } from "@/lib/prisma";
import { sendEmailWithFailsafe } from "@/src/lib/email-failsafe";
import { CampaignStatus } from "@prisma/client";

/**
 * Simple email validation regex
 */
function isValidEmail(email: string | undefined | null): boolean {
  if (!email || typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export interface CampaignAudience {
  type: "all_customers" | "recent" | "inactive" | "custom";
  filter?: Record<string, any>;
}

/**
 * Get audience by type and filter criteria
 */
export async function getAudienceByType(
  tenantId: string,
  audienceType: string,
  filter?: Record<string, any>
) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  let whereClause: any = { tenantId };

  switch (audienceType) {
    case "all_customers":
      // All active customers
      whereClause.role = "CUSTOMER";
      whereClause.status = "active";
      break;

    case "recent":
      // Customers who made requests in last 30 days
      whereClause.role = "CUSTOMER";
      whereClause.status = "active";
      whereClause.requests = {
        some: {
          createdAt: { gte: thirtyDaysAgo }
        }
      };
      break;

    case "inactive":
      // Customers who haven't made requests in 6 months
      whereClause.role = "CUSTOMER";
      whereClause.status = "active";
      whereClause.NOT = {
        requests: {
          some: {
            createdAt: { gte: sixMonthsAgo }
          }
        }
      };
      break;

    case "custom":
      // Apply custom filters if provided
      if (filter) {
        whereClause = { ...whereClause, ...filter };
      }
      break;
  }

  const customers = await prisma.user.findMany({
    where: whereClause,
    select: { id: true, email: true, firstName: true, lastName: true }
  });

  return customers;
}

/**
 * Send campaign to all recipients
 */
export async function sendCampaign(campaignId: string) {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
    include: { recipients: true }
  });

  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  if (!campaign.recipients || campaign.recipients.length === 0) {
    throw new Error(`Campaign has no recipients`);
  }

  if (campaign.status === CampaignStatus.SENT || campaign.status === CampaignStatus.FAILED) {
    throw new Error(`Campaign is already ${campaign.status.toLowerCase()}`);
  }

  try {
    // Update status to SENDING
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.SENDING }
    });

    let sentCount = 0;
    let failedCount = 0;

    // Send to each recipient
    for (const recipient of campaign.recipients) {
      try {
        // Validate email before sending
        if (!isValidEmail(recipient.email)) {
          console.warn(`Skipping campaign ${campaignId}: invalid email format: ${recipient.email}`);
          failedCount++;

          await prisma.emailCampaignRecipient.update({
            where: { id: recipient.id },
            data: { status: "bounced" }
          });
          continue;
        }

        await sendEmailWithFailsafe({
          to: recipient.email,
          subject: campaign.subject,
          html: campaign.htmlContent
        });

        // Mark recipient as sent
        await prisma.emailCampaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "sent",
            sentAt: new Date()
          }
        });

        sentCount++;
      } catch (err) {
        console.error(`Failed to send campaign ${campaignId} to ${recipient.email}:`, err);
        failedCount++;

        // Mark recipient as bounced
        try {
          await prisma.emailCampaignRecipient.update({
            where: { id: recipient.id },
            data: { status: "bounced" }
          });
        } catch (dbErr) {
          console.error(`Failed to update recipient status for ${recipient.id}:`, dbErr);
        }
      }
    }

    // Update campaign status
    const finalStatus = failedCount === 0 ? CampaignStatus.SENT : CampaignStatus.FAILED;

    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: finalStatus,
        sentAt: new Date(),
        openCount: 0,
        clickCount: 0
      }
    });

    console.log(`Campaign ${campaignId} sent: ${sentCount} successful, ${failedCount} failed`);
    return { sentCount, failedCount };
  } catch (err) {
    // Mark campaign as failed
    try {
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.FAILED }
      });
    } catch (updateErr) {
      console.error(`Failed to mark campaign ${campaignId} as failed:`, updateErr);
    }
    throw err;
  }
}

/**
 * Track email open (pixel beacon)
 */
export async function trackOpen(recipientId: string) {
  try {
    const recipient = await prisma.emailCampaignRecipient.update({
      where: { id: recipientId },
      data: {
        status: "opened",
        openedAt: new Date()
      },
      include: { campaign: true }
    });

    // Increment campaign open count
    await prisma.emailCampaign.update({
      where: { id: recipient.campaignId },
      data: {
        openCount: {
          increment: 1
        }
      }
    });

    return true;
  } catch (err) {
    console.error(`Failed to track open for recipient ${recipientId}:`, err);
    return false;
  }
}

/**
 * Track email click
 */
export async function trackClick(recipientId: string) {
  try {
    const recipient = await prisma.emailCampaignRecipient.update({
      where: { id: recipientId },
      data: {
        status: "clicked",
        clickedAt: new Date()
      },
      include: { campaign: true }
    });

    // Increment campaign click count
    await prisma.emailCampaign.update({
      where: { id: recipient.campaignId },
      data: {
        clickCount: {
          increment: 1
        }
      }
    });

    return true;
  } catch (err) {
    console.error(`Failed to track click for recipient ${recipientId}:`, err);
    return false;
  }
}

/**
 * Get campaign statistics
 */
export async function getCampaignStats(campaignId: string) {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
    include: { recipients: true }
  });

  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  const stats = {
    totalRecipients: campaign.recipients.length,
    sent: campaign.recipients.filter(r => r.sentAt).length,
    opened: campaign.recipients.filter(r => r.openedAt).length,
    clicked: campaign.recipients.filter(r => r.clickedAt).length,
    bounced: campaign.recipients.filter(r => r.status === "bounced").length,
    openRate: campaign.totalRecipients > 0 ? (campaign.openCount / campaign.totalRecipients) * 100 : 0,
    clickRate: campaign.totalRecipients > 0 ? (campaign.clickCount / campaign.totalRecipients) * 100 : 0
  };

  return stats;
}
