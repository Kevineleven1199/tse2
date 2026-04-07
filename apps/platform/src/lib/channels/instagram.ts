import type { ChannelAdapter, OutboundResult } from "./types";
import type { MessageChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Instagram DM adapter.
 * Uses the Instagram Messaging API (same Meta platform as Facebook).
 */
export const instagramAdapter: ChannelAdapter = {
  channel: "INSTAGRAM_DM" as MessageChannel,

  async sendMessage(recipientId: string, content: string): Promise<OutboundResult> {
    try {
      const integration = await prisma.integration.findFirst({
        where: { type: "INSTAGRAM", status: "ACTIVE" },
      });
      const config = (integration?.config as any) || {};
      const token = config.pageAccessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
      if (!token) return { success: false, error: "Instagram access token not configured" };

      const res = await fetch(`https://graph.facebook.com/v19.0/me/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: content },
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return { success: false, error: err };
      }

      const data = await res.json();
      return { success: true, externalId: data.message_id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  getChannelLabel: () => "Instagram",
  getChannelIcon: () => "\uD83D\uDFEA", // purple square for IG
};
