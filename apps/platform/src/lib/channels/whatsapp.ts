import type { ChannelAdapter, OutboundResult } from "./types";
import type { MessageChannel } from "@prisma/client";
import { sendWhatsApp } from "@/src/lib/notifications";

export const whatsappAdapter: ChannelAdapter = {
  channel: "WHATSAPP" as MessageChannel,

  async sendMessage(to: string, content: string): Promise<OutboundResult> {
    try {
      await sendWhatsApp(to, content);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  getChannelLabel: () => "WhatsApp",
  getChannelIcon: () => "\uD83D\uDFE2", // green circle for WA
};
