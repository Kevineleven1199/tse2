import type { MessageChannel } from "@prisma/client";

export type InboundMessage = {
  channel: MessageChannel;
  contactIdentifier: string; // phone, email, or platform user ID
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  content: string;
  contentType?: "text" | "image" | "video" | "file";
  mediaUrl?: string;
  externalId?: string; // platform message ID for dedup
  metadata?: Record<string, unknown>;
};

export type OutboundResult = {
  success: boolean;
  externalId?: string;
  error?: string;
};

export interface ChannelAdapter {
  channel: MessageChannel;
  sendMessage(to: string, content: string, mediaUrl?: string): Promise<OutboundResult>;
  getChannelLabel(): string;
  getChannelIcon(): string; // emoji
}
