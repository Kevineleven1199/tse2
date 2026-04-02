import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");
  const full = searchParams.get("full") === "true";

  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  try {
    const photos = await prisma.jobPhoto.findMany({
      where: { jobId, tenantId: session.tenantId },
      orderBy: { uploadedAt: "asc" },
    });

    return NextResponse.json(
      photos.map((p) => {
        // Prefer Drive URL, then fall back to base64 imageData
        const fullUrl = p.driveFileUrl ?? p.imageData;
        const thumbUrl = p.thumbnailData ?? p.driveFileUrl ?? p.imageData;

        return {
          id: p.id,
          jobId: p.jobId,
          type: p.type,
          imageUrl: full ? fullUrl : thumbUrl,
          caption: p.caption,
          uploadedBy: p.uploadedBy,
          uploadedAt: p.uploadedAt.toISOString(),
        };
      })
    );
  } catch (error) {
    console.error("Photo fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}
