import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

interface ConversationData {
  phone: string;
  contactName?: string;
  lastMessage: string;
  lastMessageTime: string;
  messageCount: number;
  direction: "inbound" | "outbound" | "both";
}

// GET — get list of SMS conversations
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const tenantId = session.tenantId;

    // Get all SMS messages for the tenant
    const messages = await prisma.smsMessage.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    // Group by phone number (both from and to)
    const conversationMap = new Map<string, typeof messages>();

    for (const msg of messages) {
      // Add to fromNumber conversations
      const fromConvs = conversationMap.get(msg.fromNumber) ?? [];
      fromConvs.push(msg);
      conversationMap.set(msg.fromNumber, fromConvs);

      // Add to toNumber conversations (if different)
      if (msg.toNumber !== msg.fromNumber) {
        const toConvs = conversationMap.get(msg.toNumber) ?? [];
        toConvs.push(msg);
        conversationMap.set(msg.toNumber, toConvs);
      }
    }

    // Build conversation list
    const conversations: ConversationData[] = Array.from(
      conversationMap.entries()
    ).map(([phone, msgs]) => {
      const sorted = msgs.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      const latest = sorted[0];

      // Determine if inbound, outbound, or both
      const hasInbound = msgs.some((m) => m.direction === "inbound");
      const hasOutbound = msgs.some((m) => m.direction === "outbound");
      const direction: "inbound" | "outbound" | "both" = hasInbound && hasOutbound ? "both" : hasInbound ? "inbound" : "outbound";

      // Try to get contact name from users
      return {
        phone,
        lastMessage: latest.content.substring(0, 100),
        lastMessageTime: latest.createdAt.toISOString(),
        messageCount: msgs.length,
        direction,
      };
    });

    // Sort by most recent
    conversations.sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    return NextResponse.json({
      conversations,
      total: conversations.length,
    });
  } catch (error) {
    console.error("[GET /api/admin/messages] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}
