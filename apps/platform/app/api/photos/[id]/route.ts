import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;

  try {
    const photo = await prisma.jobPhoto.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Only the uploader or admin can delete
    if (photo.uploadedBy !== session.userId && session.role !== "HQ") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await prisma.jobPhoto.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Photo delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete photo" },
      { status: 500 }
    );
  }
}
