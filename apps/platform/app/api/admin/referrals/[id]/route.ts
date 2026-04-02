import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PATCH: Update referral status (qualify, reward, expire)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "HQ") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data: any = {};

    if (body.status) {
      data.status = body.status;
      if (body.status === "QUALIFIED") data.qualifiedAt = new Date();
      if (body.status === "REWARDED") data.rewardedAt = new Date();
    }
    if (body.referreeName) data.referreeName = body.referreeName;
    if (body.referreeEmail) data.referreeEmail = body.referreeEmail;
    if (body.referreePhone) data.referreePhone = body.referreePhone;
    if (body.jobId) data.jobId = body.jobId;
    if (body.notes) data.notes = body.notes;

    const updated = await prisma.referral.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[referrals] Update failed:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

// DELETE: Remove referral
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
    await prisma.referral.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
