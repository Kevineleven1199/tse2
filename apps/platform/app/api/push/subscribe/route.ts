import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * POST /api/push/subscribe — Save push subscription for the current user
 * Body: { subscription: PushSubscription }
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { subscription } = await request.json();
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    // Store subscription as a Notification record (channel = "web-push")
    await prisma.notification.create({
      data: {
        tenantId: session.tenantId,
        channel: "web-push",
        payload: { userId: session.userId, subscription },
        delivered: true,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[push/subscribe]", error);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }
}
