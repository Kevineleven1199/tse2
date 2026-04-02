import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

const createCustomFieldSchema = z.object({
  entityType: z.enum(["customer", "job", "lead"]),
  fieldName: z.string().min(1).max(100),
  fieldType: z.enum(["text", "number", "date", "select", "boolean"]),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional().default(false),
});

type CreateCustomFieldInput = z.infer<typeof createCustomFieldSchema>;

// GET — list all custom fields for the tenant
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const tenantId = session.tenantId;
    const entityType = request.nextUrl.searchParams.get("entityType");

    const fields = await prisma.customFieldDefinition.findMany({
      where: {
        tenantId,
        active: true,
        ...(entityType && { entityType }),
      },
      orderBy: [{ entityType: "asc" }, { displayOrder: "asc" }],
    });

    return NextResponse.json({
      fields: fields.map((f) => ({
        id: f.id,
        entityType: f.entityType,
        fieldName: f.fieldName,
        fieldType: f.fieldType,
        options: f.options as string[] | null,
        required: f.required,
        displayOrder: f.displayOrder,
        createdAt: f.createdAt.toISOString(),
      })),
      total: fields.length,
    });
  } catch (error) {
    console.error("[GET /api/admin/custom-fields] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom fields" },
      { status: 500 }
    );
  }
}

// POST — create a new custom field
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HQ"].includes(session.role)) {
      return NextResponse.json(
        { error: "Unauthorized - HQ access required" },
        { status: 403 }
      );
    }

    const tenantId = session.tenantId;
    const json = await request.json();
    const payload = createCustomFieldSchema.parse(json);

    // Check if field already exists
    const existing = await prisma.customFieldDefinition.findUnique({
      where: {
        tenantId_entityType_fieldName: {
          tenantId,
          entityType: payload.entityType,
          fieldName: payload.fieldName,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Field already exists" },
        { status: 409 }
      );
    }

    // Get max display order for this entity type
    const maxOrder = await prisma.customFieldDefinition.findFirst({
      where: {
        tenantId,
        entityType: payload.entityType,
      },
      orderBy: { displayOrder: "desc" },
      select: { displayOrder: true },
    });

    const displayOrder = (maxOrder?.displayOrder || 0) + 1;

    const field = await prisma.customFieldDefinition.create({
      data: {
        tenantId,
        entityType: payload.entityType,
        fieldName: payload.fieldName,
        fieldType: payload.fieldType,
        options: payload.options ? payload.options : undefined,
        required: payload.required,
        displayOrder,
      },
    });

    return NextResponse.json(
      {
        id: field.id,
        entityType: field.entityType,
        fieldName: field.fieldName,
        fieldType: field.fieldType,
        options: field.options as string[] | null,
        required: field.required,
        displayOrder: field.displayOrder,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/admin/custom-fields] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.flatten() },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create custom field" },
      { status: 500 }
    );
  }
}
