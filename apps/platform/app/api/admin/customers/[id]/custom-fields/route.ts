import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

const setCustomFieldValuesSchema = z.object({
  values: z.record(z.string(), z.string()),
});

type SetCustomFieldValuesInput = z.infer<typeof setCustomFieldValuesSchema>;

// GET — get custom field values for a customer
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

    const values = await prisma.customFieldValue.findMany({
      where: {
        entityId: id,
        definition: {
          tenantId,
          entityType: "customer",
          active: true,
        },
      },
      include: { definition: true },
    });

    return NextResponse.json({
      values: values.map((v) => ({
        fieldId: v.definitionId,
        fieldName: v.definition.fieldName,
        value: v.value,
      })),
    });
  } catch (error) {
    console.error("[GET /api/admin/customers/[id]/custom-fields] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom field values" },
      { status: 500 }
    );
  }
}

// PUT — set custom field values for a customer
export async function PUT(
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

    const tenantId = session.tenantId;
    const json = await request.json();
    const { values } = setCustomFieldValuesSchema.parse(json);

    // Get field definitions
    const definitions = await prisma.customFieldDefinition.findMany({
      where: {
        tenantId,
        entityType: "customer",
        active: true,
      },
    });

    const definitionMap = new Map(definitions.map((d) => [d.fieldName, d.id]));

    // Validate that all provided field names exist
    for (const fieldName of Object.keys(values)) {
      if (!definitionMap.has(fieldName)) {
        return NextResponse.json(
          { error: `Field '${fieldName}' not found` },
          { status: 404 }
        );
      }
    }

    // Update or create values
    const updates = await Promise.all(
      Object.entries(values).map(([fieldName, value]) => {
        const definitionId = definitionMap.get(fieldName)!;
        return prisma.customFieldValue.upsert({
          where: {
            definitionId_entityId: {
              definitionId,
              entityId: id,
            },
          },
          create: {
            definitionId,
            entityId: id,
            value,
          },
          update: {
            value,
          },
        });
      })
    );

    return NextResponse.json({
      updated: updates.length,
      values: updates.map((v) => ({
        fieldId: v.definitionId,
        value: v.value,
      })),
    });
  } catch (error) {
    console.error("[PUT /api/admin/customers/[id]/custom-fields] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.flatten() },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update custom field values" },
      { status: 500 }
    );
  }
}
