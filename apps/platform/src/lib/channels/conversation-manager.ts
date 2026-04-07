/**
 * Unified Conversation Manager
 * Handles finding/creating conversations and routing messages to the unified inbox.
 */
import { prisma } from "@/lib/prisma";
import type { MessageChannel } from "@prisma/client";
import type { InboundMessage } from "./types";
import { getAdapter } from "./index";

const DEFAULT_TENANT = process.env.DEFAULT_TENANT_ID || "ten_gogreen";

/**
 * Find or create a unified conversation for a contact on a specific channel.
 */
export async function findOrCreateConversation(
  tenantId: string,
  channel: MessageChannel,
  contactIdentifier: string,
  contactName?: string,
  contactEmail?: string,
  contactPhone?: string,
) {
  const existing = await prisma.unifiedConversation.findUnique({
    where: { tenantId_channel_contactIdentifier: { tenantId, channel, contactIdentifier } },
  });

  if (existing) {
    // Update contact info if we have newer data
    if (contactName || contactEmail || contactPhone) {
      return prisma.unifiedConversation.update({
        where: { id: existing.id },
        data: {
          ...(contactName && !existing.contactName ? { contactName } : {}),
          ...(contactEmail && !existing.contactEmail ? { contactEmail } : {}),
          ...(contactPhone && !existing.contactPhone ? { contactPhone } : {}),
        },
      });
    }
    return existing;
  }

  return prisma.unifiedConversation.create({
    data: {
      tenantId,
      channel,
      contactIdentifier,
      contactName,
      contactEmail,
      contactPhone,
      status: "open",
      unreadCount: 0,
    },
  });
}

/**
 * Add an inbound message to a conversation and update conversation metadata.
 */
export async function addInboundMessage(conversationId: string, msg: InboundMessage) {
  const [message] = await prisma.$transaction([
    prisma.unifiedMessage.create({
      data: {
        conversationId,
        direction: "inbound",
        channel: msg.channel,
        content: msg.content,
        contentType: msg.contentType || "text",
        mediaUrl: msg.mediaUrl,
        senderName: msg.contactName,
        externalId: msg.externalId,
        status: "delivered",
        metadata: msg.metadata as any,
      },
    }),
    prisma.unifiedConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: msg.content.slice(0, 120),
        unreadCount: { increment: 1 },
        status: "open", // re-open if snoozed/closed
      },
    }),
  ]);

  return message;
}

/**
 * Send a reply through the correct channel and save the outbound message.
 */
export async function sendReply(
  conversationId: string,
  content: string,
  adminUserId?: string,
  mediaUrl?: string,
) {
  const conversation = await prisma.unifiedConversation.findUniqueOrThrow({
    where: { id: conversationId },
  });

  const adapter = getAdapter(conversation.channel);
  const result = await adapter.sendMessage(conversation.contactIdentifier, content, mediaUrl);

  const message = await prisma.unifiedMessage.create({
    data: {
      conversationId,
      direction: "outbound",
      channel: conversation.channel,
      content,
      contentType: "text",
      mediaUrl,
      senderName: "TSE Team",
      externalId: result.externalId,
      status: result.success ? "sent" : "failed",
    },
  });

  await prisma.unifiedConversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: new Date(),
      lastMessagePreview: `You: ${content.slice(0, 100)}`,
      unreadCount: 0,
    },
  });

  return { message, deliveryResult: result };
}

/**
 * Try to match a conversation to an existing CRM lead by phone or email.
 */
export async function matchToCrmLead(conversationId: string) {
  const conv = await prisma.unifiedConversation.findUniqueOrThrow({
    where: { id: conversationId },
  });

  if (conv.crmLeadId) return conv.crmLeadId;

  // Try phone match
  if (conv.contactPhone) {
    const lead = await prisma.crmLead.findFirst({
      where: { phone: conv.contactPhone },
      select: { id: true },
    });
    if (lead) {
      await prisma.unifiedConversation.update({
        where: { id: conversationId },
        data: { crmLeadId: lead.id },
      });
      return lead.id;
    }
  }

  // Try email match
  if (conv.contactEmail) {
    const lead = await prisma.crmLead.findFirst({
      where: { email: conv.contactEmail },
      select: { id: true },
    });
    if (lead) {
      await prisma.unifiedConversation.update({
        where: { id: conversationId },
        data: { crmLeadId: lead.id },
      });
      return lead.id;
    }
  }

  return null;
}
