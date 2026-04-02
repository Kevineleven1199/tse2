import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession({ roles: ["HQ", "MANAGER"] });
    const { id } = await params;
    const { approved } = await request.json();

    if (typeof approved !== "boolean") {
      return NextResponse.json({ error: "approved must be a boolean" }, { status: 400 });
    }

    // Verify timesheet belongs to a cleaner in this tenant
    const timesheet = await prisma.timesheet.findFirst({
      where: { id, cleaner: { user: { tenantId: session.tenantId } } },
      select: { id: true },
    });
    if (!timesheet) {
      return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
    }

    if (approved) {
      await prisma.timesheet.update({
        where: { id },
        data: {
          approved: true,
          approvedBy: session.userId,
        },
      });
    } else {
      // Reject: delete the timesheet
      await prisma.timesheet.delete({ where: { id } });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[timesheet-approve] Error:", error);
    return NextResponse.json({ error: "Failed to update timesheet" }, { status: 500 });
  }
}
