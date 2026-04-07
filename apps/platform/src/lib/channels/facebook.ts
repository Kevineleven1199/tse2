import type { ChannelAdapter, OutboundResult } from "./types";
import type { MessageChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Facebook Messenger adapter.
 * Sends messages via the Facebook Graph API (Messenger Platform).
 * Requires a Page Access Token stored in the Integration table.
 */
export const facebookAdapter: ChannelAdapter = {
  channel: "FACEBOOK_MESSENGER" as MessageChannel,

  async sendMessage(recipientId: string, content: string): Promise<OutboundResult> {
    try {
      const integration = await prisma.integration.findFirst({
        where: { type: "FACEBOOK", status: "ACTIVE" },
      });
      const config = (integration?.config as any) || {};
      const token = config.pageAccessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
      if (!token) return { success: false, error: "Facebook Page Access Token not configured" };

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

  getChannelLabel: () => "Facebook",
  getChannelIcon: () => "\uD83D\uDFE6", // blue square for FB
};
