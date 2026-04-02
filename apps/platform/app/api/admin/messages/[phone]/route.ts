import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { sendSms, toE164 } from "@/src/lib/openphone";

export const dynamic = "force-dynamic";

const sendMessageSchema = z.object({
  content: z.string().min(1).max(1600),
});

type SendMessageInput = z.infer<typeof sendMessageSchema>;

// GET — get all messages with a specific phone number
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const tenantId = session.tenantId;

    const messages = await prisma.smsMessage.findMany({
      where: {
        tenantId,
        OR: [{ fromNumber: phone }, { toNumber: phone }],
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      phone: phone,
      messages: messages.map((m) => ({
        id: m.id,
        direction: m.direction,
        from: m.fromNumber,
        to: m.toNumber,
        content: m.content,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
      })),
      total: messages.length,
    });
  } catch (error) {
    console.error("[GET /api/admin/messages/[phone]] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// POST — send a reply to a phone number
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const tenantId = session.tenantId;
    const json = await request.json();
    const { content } = sendMessageSchema.parse(json);

    // Get the from number (company phone)
    const fromNumber = process.env.OPENPHONE_FROM;
    if (!fromNumber) {
      return NextResponse.json(
        { error: "SMS not configured" },
        { status: 503 }
      );
    }

    // Send via OpenPhone
    const success = await sendSms({
      to: [toE164(phone)],
      content,
    });

    if (!success) {
      return NextResponse.json(
        { error: "Failed to send SMS" },
        { status: 500 }
      );
    }

    // Save to database
    const message = await prisma.smsMessage.create({
      data: {
        tenantId,
        direction: "outbound",
        fromNumber,
        toNumber: phone,
        content,
        status: "delivered",
      },
    });

    return NextResponse.json(
      {
        id: message.id,
        direction: message.direction,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/admin/messages/[phone]] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.flatten() },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
