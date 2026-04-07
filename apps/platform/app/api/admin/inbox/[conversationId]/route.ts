/**
 * Single Conversation API
 * GET  /api/admin/inbox/[conversationId] — Full message thread
 * PATCH — Update status, assignment
 * POST — Send reply
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import { sendReply, matchToCrmLead } from "@/src/lib/channels";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    await requireSession({ roles: ["HQ", "MANAGER"] });
    const { conversationId } = await params;

    const conversation = await prisma.unifiedConversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    // Mark as read
    if (conversation.unreadCount > 0) {
      await prisma.unifiedConversation.update({
        where: { id: conversationId },
        data: { unreadCount: 0 },
      });
    }

    return NextResponse.json(conversation);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const session = await requireSession({ roles: ["HQ", "MANAGER"] });
    const { conversationId } = await params;
    const body = await request.json();

    const data: any = {};
    if (body.status) data.status = body.status;
    if (body.assignedTo !== undefined) data.assignedTo = body.assignedTo;
    if (body.linkLeadId) {
      data.crmLeadId = body.linkLeadId;
    }

    const updated = await prisma.unifiedConversation.update({
      where: { id: conversationId },
      data,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const session = await requireSession({ roles: ["HQ", "MANAGER"] });
    const { conversationId } = await params;
    const { content, mediaUrl } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "Message content required" }, { status: 400 });
    }

    const result = await sendReply(conversationId, content.trim(), session.userId, mediaUrl);

    // Auto-match to CRM lead if not already linked
    await matchToCrmLead(conversationId);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
