import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

const updateJobCostSchema = z.object({
  category: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().positive().optional(),
});

type UpdateJobCostInput = z.infer<typeof updateJobCostSchema>;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
  try {
    const session = await getSession();

    if (!session || !["HQ", "MANAGER"].includes(session.role || "")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updateData = updateJobCostSchema.parse(body);

    const cost = await prisma.jobCost.findUnique({
      where: { id: id },
    });

    if (!cost) {
      return NextResponse.json(
        { error: "Job cost not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.jobCost.update({
      where: { id: id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      cost: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Update job cost error:", error);
    return NextResponse.json(
      { error: "Failed to update job cost" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
  try {
    const session = await getSession();

    if (!session || !["HQ", "MANAGER"].includes(session.role || "")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const cost = await prisma.jobCost.findUnique({
      where: { id: id },
    });

    if (!cost) {
      return NextResponse.json(
        { error: "Job cost not found" },
        { status: 404 }
      );
    }

    await prisma.jobCost.delete({
      where: { id: id },
    });

    return NextResponse.json({
      success: true,
      message: "Job cost deleted successfully",
    });
  } catch (error) {
    console.error("Delete job cost error:", error);
    return NextResponse.json(
      { error: "Failed to delete job cost" },
      { status: 500 }
    );
  }
}
