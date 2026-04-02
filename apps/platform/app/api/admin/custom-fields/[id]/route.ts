import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

const updateCustomFieldSchema = z.object({
  fieldName: z.string().min(1).max(100).optional(),
  required: z.boolean().optional(),
  displayOrder: z.number().optional(),
  active: z.boolean().optional(),
});

type UpdateCustomFieldInput = z.infer<typeof updateCustomFieldSchema>;

// PATCH — update a custom field
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
  try {
    const session = await getSession();
    if (!session || !["HQ"].includes(session.role)) {
      return NextResponse.json(
        { error: "Unauthorized - HQ access required" },
        { status: 403 }
      );
    }

    const json = await request.json();
    const payload = updateCustomFieldSchema.parse(json);

    const field = await prisma.customFieldDefinition.update({
      where: { id: id },
      data: payload,
    });

    return NextResponse.json({
      id: field.id,
      entityType: field.entityType,
      fieldName: field.fieldName,
      fieldType: field.fieldType,
      options: field.options as string[] | null,
      required: field.required,
      displayOrder: field.displayOrder,
      active: field.active,
    });
  } catch (error) {
    console.error("[PATCH /api/admin/custom-fields/[id]] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.flatten() },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update custom field" },
      { status: 500 }
    );
  }
}

// DELETE — soft delete a custom field
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
  try {
    const session = await getSession();
    if (!session || !["HQ"].includes(session.role)) {
      return NextResponse.json(
        { error: "Unauthorized - HQ access required" },
        { status: 403 }
      );
    }

    // Verify ownership before deleting
    const field = await prisma.customFieldDefinition.findUnique({ where: { id } });
    if (!field || field.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.customFieldDefinition.update({
      where: { id: id },
      data: { active: false },
    });

    return NextResponse.json(
      { message: "Custom field deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[DELETE /api/admin/custom-fields/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete custom field" },
      { status: 500 }
    );
  }
}
