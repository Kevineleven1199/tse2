import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

// GET — retrieve a signature by job ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
  try {
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const tenantId = session.tenantId;

    const signature = await prisma.jobSignature.findFirst({
      where: {
        jobId: id,
        tenantId,
      },
    });

    if (!signature) {
      return NextResponse.json(
        { error: "Signature not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: signature.id,
      jobId: signature.jobId,
      cleanerId: signature.cleanerId,
      customerName: signature.customerName,
      signatureData: signature.signatureData,
      signedAt: signature.signedAt.toISOString(),
    });
  } catch (error) {
    console.error("[GET /api/admin/signatures/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch signature" },
      { status: 500 }
    );
  }
}
