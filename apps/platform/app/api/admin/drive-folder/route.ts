import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import { getOrCreateClientFolder } from "@/src/lib/google-drive";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession({ roles: ["HQ", "MANAGER"] });

    const { requestId } = await request.json();

    if (!requestId) {
      return NextResponse.json(
        { error: "Missing requestId" },
        { status: 400 }
      );
    }

    const serviceRequest = await prisma.serviceRequest.findFirst({
      where: { id: requestId, tenantId: session.tenantId },
    });

    if (!serviceRequest) {
      return NextResponse.json(
        { error: "Service request not found" },
        { status: 404 }
      );
    }

    // Return existing if already created
    if (serviceRequest.driveFolderUrl && serviceRequest.driveFolderId) {
      return NextResponse.json({
        folderId: serviceRequest.driveFolderId,
        folderUrl: serviceRequest.driveFolderUrl,
      });
    }

    // Build address from request
    const address = [
      serviceRequest.addressLine1,
      serviceRequest.city,
      serviceRequest.state,
    ]
      .filter(Boolean)
      .join(", ");

    const result = await getOrCreateClientFolder(
      serviceRequest.customerName,
      address
    );

    if (!result) {
      return NextResponse.json(
        { error: "Drive not configured or folder creation failed" },
        { status: 500 }
      );
    }

    // Save to database
    await prisma.serviceRequest.update({
      where: { id: requestId },
      data: {
        driveFolderId: result.folderId,
        driveFolderUrl: result.folderUrl,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Drive folder error:", error);
    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 }
    );
  }
}
