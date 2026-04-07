import type { MessageChannel } from "@prisma/client";
import type { ChannelAdapter } from "./types";
import { smsAdapter } from "./sms";
import { emailAdapter } from "./email";
import { facebookAdapter } from "./facebook";
import { instagramAdapter } from "./instagram";
import { whatsappAdapter } from "./whatsapp";
import { twitterAdapter } from "./twitter";

const adapters: Record<string, ChannelAdapter> = {
  SMS: smsAdapter,
  EMAIL: emailAdapter,
  FACEBOOK_MESSENGER: facebookAdapter,
  INSTAGRAM_DM: instagramAdapter,
  WHATSAPP: whatsappAdapter,
  TWITTER_DM: twitterAdapter,
  // GOOGLE_BUSINESS, NEXTDOOR, TELEGRAM, WEB_FORM — inbound-only for now
};

/** Returns the channel adapter for outbound messaging. Falls back to email. */
export function getAdapter(channel: MessageChannel): ChannelAdapter {
  return adapters[channel] || emailAdapter;
}

/** All channel metadata for UI rendering */
export const CHANNEL_META: Record<string, { label: string; icon: string; color: string }> = {
  SMS: { label: "SMS", icon: "\uD83D\uDCF1", color: "bg-green-100 text-green-700" },
  EMAIL: { label: "Email", icon: "\u2709\uFE0F", color: "bg-blue-100 text-blue-700" },
  WHATSAPP: { label: "WhatsApp", icon: "\uD83D\uDFE2", color: "bg-emerald-100 text-emerald-700" },
  FACEBOOK_MESSENGER: { label: "Facebook", icon: "\uD83D\uDFE6", color: "bg-indigo-100 text-indigo-700" },
  INSTAGRAM_DM: { label: "Instagram", icon: "\uD83D\uDFEA", color: "bg-pink-100 text-pink-700" },
  TWITTER_DM: { label: "X / Twitter", icon: "\u2B1B", color: "bg-gray-100 text-gray-700" },
  GOOGLE_BUSINESS: { label: "Google", icon: "\uD83D\uDD35", color: "bg-red-100 text-red-700" },
  NEXTDOOR: { label: "Nextdoor", icon: "\uD83C\uDFE1", color: "bg-lime-100 text-lime-700" },
  WEB_FORM: { label: "Website", icon: "\uD83C\uDF10", color: "bg-purple-100 text-purple-700" },
  TELEGRAM: { label: "Telegram", icon: "\u2708\uFE0F", color: "bg-sky-100 text-sky-700" },
};

export { findOrCreateConversation, addInboundMessage, sendReply, matchToCrmLead } from "./conversation-manager";
export type { InboundMessage, OutboundResult, ChannelAdapter } from "./types";
