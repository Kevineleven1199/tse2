import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/client/messages — List messages for the current user
 */
export async function GET() {
  try {
    const session = await requireSession({ roles: ["CUSTOMER", "HQ", "MANAGER", "CLEANER"] });

    const messages = await prisma.message.findMany({
      where: {
        tenantId: session.tenantId,
        OR: [
          { senderUserId: session.userId },
          { recipientUserId: session.userId },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("[client-messages] Error:", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

/**
 * POST /api/client/messages — Send a new message
 */
export async function POST(request: Request) {
  try {
    const session = await requireSession({ roles: ["CUSTOMER", "HQ", "MANAGER", "CLEANER"] });
    const { content, recipientUserId } = await request.json();

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        tenantId: session.tenantId,
        senderUserId: session.userId,
        recipientUserId: recipientUserId ?? null,
        content: content.trim(),
      },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error("[client-messages] Error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
