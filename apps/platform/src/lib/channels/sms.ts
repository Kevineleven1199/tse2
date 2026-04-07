import type { ChannelAdapter, OutboundResult } from "./types";
import type { MessageChannel } from "@prisma/client";
import { sendSms } from "@/src/lib/notifications";

export const smsAdapter: ChannelAdapter = {
  channel: "SMS" as MessageChannel,

  async sendMessage(to: string, content: string): Promise<OutboundResult> {
    try {
      await sendSms(to, content);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  getChannelLabel: () => "SMS",
  getChannelIcon: () => "\uD83D\uDCF1", // phone emoji
};
