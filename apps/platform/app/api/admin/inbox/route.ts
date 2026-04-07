/**
 * Unified Inbox API
 * GET /api/admin/inbox — List all conversations with filters
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await requireSession({ roles: ["HQ", "MANAGER"] });
    const tenantId = session.tenantId;
    const { searchParams } = new URL(request.url);

    const channel = searchParams.get("channel");
    const status = searchParams.get("status") || "open";
    const search = searchParams.get("search");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = { tenantId };
    if (channel) where.channel = channel;
    if (status && status !== "all") where.status = status;
    if (search) {
      where.OR = [
        { contactName: { contains: search, mode: "insensitive" } },
        { contactEmail: { contains: search, mode: "insensitive" } },
        { contactPhone: { contains: search } },
        { lastMessagePreview: { contains: search, mode: "insensitive" } },
      ];
    }

    const [conversations, total] = await Promise.all([
      prisma.unifiedConversation.findMany({
        where,
        orderBy: { lastMessageAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      prisma.unifiedConversation.count({ where }),
    ]);

    // Count unread across all channels
    const unreadStats = await prisma.unifiedConversation.groupBy({
      by: ["channel"],
      where: { tenantId, unreadCount: { gt: 0 } },
      _sum: { unreadCount: true },
      _count: true,
    });

    return NextResponse.json({
      conversations,
      total,
      unreadStats,
      hasMore: offset + limit < total,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message?.includes("Unauthorized") ? 401 : 500 });
  }
}
