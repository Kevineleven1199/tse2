import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import { uploadPhotoToDrive } from "@/src/lib/google-drive";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await requireSession();

  try {
    const body = await request.json();
    const { type, base64, jobId, caption } = body;

    if (!base64 || !jobId || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["BEFORE", "AFTER", "ESTIMATE"].includes(type)) {
      return NextResponse.json({ error: "Invalid photo type" }, { status: 400 });
    }

    // Verify job exists and belongs to tenant
    const job = await prisma.job.findFirst({
      where: { id: jobId, tenantId: session.tenantId },
      include: {
        request: { select: { driveFolderId: true, customerName: true, addressLine1: true } },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${type.toLowerCase()}-${timestamp}.jpg`;

    // Create a small thumbnail (store inline for list views)
    // The full image goes to Drive; thumbnail stays in DB for fast list rendering
    const thumbnailData = base64; // client already compresses to 800px — good enough for thumbnail

    // Attempt Google Drive upload if client has a Drive folder
    let driveFileId: string | null = null;
    let driveFileUrl: string | null = null;

    if (job.request.driveFolderId) {
      try {
        const result = await uploadPhotoToDrive(job.request.driveFolderId, base64, filename);
        if (result) {
          driveFileId = result.fileId;
          driveFileUrl = result.fileUrl;
        }
      } catch (e) {
        console.warn("[photo upload] Drive upload failed, falling back to DB:", e);
      }
    }

    // Store photo — if Drive succeeded, only store thumbnail; otherwise store full base64
    const photo = await prisma.jobPhoto.create({
      data: {
        tenantId: session.tenantId,
        jobId,
        type,
        imageData: driveFileUrl ? null : base64, // full base64 only if Drive failed
        driveFileId,
        driveFileUrl,
        thumbnailData: driveFileUrl ? thumbnailData : null, // thumbnail only if Drive succeeded
        caption: caption || null,
        uploadedBy: session.userId,
      },
    });

    return NextResponse.json({
      id: photo.id,
      jobId: photo.jobId,
      type: photo.type,
      imageUrl: driveFileUrl ?? base64,
      caption: photo.caption,
      uploadedAt: photo.uploadedAt.toISOString(),
      uploadedBy: photo.uploadedBy,
    });
  } catch (error) {
    console.error("Photo upload error:", error);
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
  }
}
