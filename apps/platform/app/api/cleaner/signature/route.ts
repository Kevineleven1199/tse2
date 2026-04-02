import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

const saveSignatureSchema = z.object({
  jobId: z.string(),
  customerName: z.string().min(1).max(200),
  signatureData: z.string(), // base64 PNG
});

type SaveSignatureInput = z.infer<typeof saveSignatureSchema>;

// POST — save a job signature
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "CLEANER") {
      return NextResponse.json(
        { error: "Unauthorized - cleaner access required" },
        { status: 403 }
      );
    }

    const json = await request.json();
    const payload = saveSignatureSchema.parse(json);

    // Get cleaner profile and user (for tenant info)
    const cleaner = await prisma.cleanerProfile.findUnique({
      where: { userId: session.userId },
      select: { 
        id: true,
        user: { select: { tenantId: true } }
      },
    });

    if (!cleaner) {
      return NextResponse.json(
        { error: "Cleaner profile not found" },
        { status: 404 }
      );
    }

    const tenantId = cleaner.user.tenantId;

    // Verify job exists and belongs to tenant
    const job = await prisma.job.findFirst({
      where: {
        id: payload.jobId,
        tenantId,
      },
      select: { id: true },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Save signature
    const signature = await prisma.jobSignature.create({
      data: {
        tenantId,
        jobId: payload.jobId,
        cleanerId: cleaner.id,
        customerName: payload.customerName,
        signatureData: payload.signatureData,
      },
    });

    return NextResponse.json(
      {
        id: signature.id,
        jobId: signature.jobId,
        signedAt: signature.signedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/cleaner/signature] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid signature data", details: error.flatten() },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: "Failed to save signature" },
      { status: 500 }
    );
  }
}
