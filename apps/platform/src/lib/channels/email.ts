import type { ChannelAdapter, OutboundResult } from "./types";
import type { MessageChannel } from "@prisma/client";
import { sendEmail } from "@/src/lib/notifications";

export const emailAdapter: ChannelAdapter = {
  channel: "EMAIL" as MessageChannel,

  async sendMessage(to: string, content: string): Promise<OutboundResult> {
    try {
      await sendEmail(to, "Message from Tri State Enterprise", content);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  getChannelLabel: () => "Email",
  getChannelIcon: () => "\u2709\uFE0F", // envelope emoji
};
