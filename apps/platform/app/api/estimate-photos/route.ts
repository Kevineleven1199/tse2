import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Public route - customers upload photos with their estimate request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base64, sessionId, caption } = body;

    if (!base64 || !sessionId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Limit: max 10 photos per session
    const count = await prisma.estimatePhoto.count({ where: { sessionId } });
    if (count >= 10) {
      return NextResponse.json(
        { error: "Maximum 10 photos per estimate" },
        { status: 400 }
      );
    }

    const photo = await prisma.estimatePhoto.create({
      data: {
        tenantId: process.env.DEFAULT_TENANT_ID || "default",
        sessionId,
        imageData: base64,
        caption: caption || null,
      },
    });

    return NextResponse.json({ id: photo.id, sessionId: photo.sessionId });
  } catch (error) {
    console.error("Estimate photo upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  const requestId = searchParams.get("requestId");

  if (!sessionId && !requestId) {
    return NextResponse.json(
      { error: "sessionId or requestId required" },
      { status: 400 }
    );
  }

  try {
    const photos = await prisma.estimatePhoto.findMany({
      where: sessionId ? { sessionId } : { requestId },
      orderBy: { uploadedAt: "asc" },
    });

    return NextResponse.json(
      photos.map((p) => ({
        id: p.id,
        imageUrl: p.imageData,
        caption: p.caption,
        uploadedAt: p.uploadedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Estimate photo fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch" },
      { status: 500 }
    );
  }
}
