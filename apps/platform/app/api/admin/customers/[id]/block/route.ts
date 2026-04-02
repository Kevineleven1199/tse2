import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "HQ") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || "Blocked by admin";

    const user = await prisma.user.update({
      where: { id },
      data: {
        blocked: true,
        blockedAt: new Date(),
        blockedReason: reason,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Customer ${user.firstName} ${user.lastName} has been blocked`,
      userId: user.id
    });
  } catch (error) {
    console.error("[block] Failed to block customer:", error);
    return NextResponse.json({ error: "Failed to block customer" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "HQ") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        blocked: false,
        blockedAt: null,
        blockedReason: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Customer ${user.firstName} ${user.lastName} has been unblocked`,
      userId: user.id
    });
  } catch (error) {
    console.error("[block] Failed to unblock customer:", error);
    return NextResponse.json({ error: "Failed to unblock customer" }, { status: 500 });
  }
}
