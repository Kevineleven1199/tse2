import type { ChannelAdapter, OutboundResult } from "./types";
import type { MessageChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Twitter/X DM adapter.
 * Uses X API v2 for direct messages. Requires paid Basic tier ($100/mo).
 */
export const twitterAdapter: ChannelAdapter = {
  channel: "TWITTER_DM" as MessageChannel,

  async sendMessage(recipientId: string, content: string): Promise<OutboundResult> {
    try {
      const integration = await prisma.integration.findFirst({
        where: { type: "TWITTER_X", status: "ACTIVE" },
      });
      const config = (integration?.config as any) || {};
      const bearerToken = config.bearerToken || process.env.TWITTER_BEARER_TOKEN;
      if (!bearerToken) return { success: false, error: "X/Twitter bearer token not configured" };

      const res = await fetch("https://api.x.com/2/dm_conversations/with/" + recipientId + "/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearerToken}` },
        body: JSON.stringify({ text: content }),
      });

      if (!res.ok) {
        const err = await res.text();
        return { success: false, error: err };
      }

      const data = await res.json();
      return { success: true, externalId: data.data?.dm_event_id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  getChannelLabel: () => "X / Twitter",
  getChannelIcon: () => "\u2B1B", // black square for X
};
