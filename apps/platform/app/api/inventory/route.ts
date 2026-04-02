import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/src/lib/auth/cookies";

export const dynamic = "force-dynamic";

const createInventorySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  category: z.string().min(1).max(100),
  sku: z.string().min(1).max(100).optional(),
  amazonAsin: z.string().max(50).optional(),
  amazonUrl: z.string().url().optional(),
  unit: z.string().min(1).max(50),
  currentStock: z.coerce.number().int().min(0),
  minStock: z.coerce.number().int().min(0),
  reorderQty: z.coerce.number().int().min(1),
  unitCost: z.coerce.number().positive(),
  autoReorder: z.boolean().default(false),
  active: z.boolean().default(true),
  notes: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional()
});

const updateInventorySchema = createInventorySchema.partial().extend({
  id: z.string().min(1)
});

const deleteInventorySchema = z.object({
  id: z.string().min(1)
});

export const GET = async (request: Request) => {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const lowStockOnly = searchParams.get("lowStock") === "true";

    const where: any = {
      tenantId: session.tenantId
    };

    if (category) {
      where.category = category;
    }

    if (lowStockOnly) {
      where.currentStock = {
        lt: prisma.inventoryItem.fields.minStock
      };
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        orders: {
          where: {
            status: {
              in: ["pending", "ordered"]
            }
          },
          orderBy: {
            createdAt: "desc"
          },
          take: 1
        }
      },
      orderBy: {
        name: "asc"
      }
    });

    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        sku: item.sku,
        amazonAsin: item.amazonAsin,
        amazonUrl: item.amazonUrl,
        unit: item.unit,
        currentStock: item.currentStock,
        minStock: item.minStock,
        reorderQty: item.reorderQty,
        unitCost: item.unitCost,
        autoReorder: item.autoReorder,
        active: item.active,
        lastOrderedAt: item.lastOrderedAt,
        notes: item.notes,
        imageUrl: item.imageUrl,
        latestOrder: item.orders[0] || null,
        isLowStock: item.currentStock < item.minStock,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }))
    });
  } catch (error) {
    console.error("[inventory] Failed to list items", error);
    return NextResponse.json(
      { error: "Unable to load inventory items" },
      { status: 500 }
    );
  }
};

export const POST = async (request: Request) => {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const action = (body as any)?.action;

    if (action === "update") {
      const payload = updateInventorySchema.parse(body);
      const { id, ...updateData } = payload;

      const existing = await prisma.inventoryItem.findUnique({
        where: { id },
        select: { tenantId: true }
      });

      if (!existing || existing.tenantId !== session.tenantId) {
        return NextResponse.json(
          { error: "Item not found" },
          { status: 404 }
        );
      }

      const updated = await prisma.inventoryItem.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date()
        },
        include: {
          orders: {
            where: {
              status: {
                in: ["pending", "ordered"]
              }
            },
            orderBy: {
              createdAt: "desc"
            },
            take: 1
          }
        }
      });

      return NextResponse.json({
        item: {
          id: updated.id,
          name: updated.name,
          description: updated.description,
          category: updated.category,
          sku: updated.sku,
          amazonAsin: updated.amazonAsin,
          amazonUrl: updated.amazonUrl,
          unit: updated.unit,
          currentStock: updated.currentStock,
          minStock: updated.minStock,
          reorderQty: updated.reorderQty,
          unitCost: updated.unitCost,
          autoReorder: updated.autoReorder,
          active: updated.active,
          lastOrderedAt: updated.lastOrderedAt,
          notes: updated.notes,
          imageUrl: updated.imageUrl,
          latestOrder: updated.orders[0] || null,
          isLowStock: updated.currentStock < updated.minStock,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt
        }
      });
    } else if (action === "delete") {
      const payload = deleteInventorySchema.parse(body);

      const existing = await prisma.inventoryItem.findUnique({
        where: { id: payload.id },
        select: { tenantId: true }
      });

      if (!existing || existing.tenantId !== session.tenantId) {
        return NextResponse.json(
          { error: "Item not found" },
          { status: 404 }
        );
      }

      await prisma.inventoryItem.delete({
        where: { id: payload.id }
      });

      return NextResponse.json({ ok: true });
    } else {
      // Create new item
      const payload = createInventorySchema.parse(body);

      const item = await prisma.inventoryItem.create({
        data: {
          tenantId: session.tenantId,
          name: payload.name,
          description: payload.description,
          category: payload.category,
          sku: payload.sku,
          amazonAsin: payload.amazonAsin,
          amazonUrl: payload.amazonUrl,
          unit: payload.unit,
          currentStock: payload.currentStock,
          minStock: payload.minStock,
          reorderQty: payload.reorderQty,
          unitCost: payload.unitCost,
          autoReorder: payload.autoReorder,
          active: payload.active,
          notes: payload.notes,
          imageUrl: payload.imageUrl
        },
        include: {
          orders: {
            where: {
              status: {
                in: ["pending", "ordered"]
              }
            },
            orderBy: {
              createdAt: "desc"
            },
            take: 1
          }
        }
      });

      return NextResponse.json({
        item: {
          id: item.id,
          name: item.name,
          description: item.description,
          category: item.category,
          sku: item.sku,
          amazonAsin: item.amazonAsin,
          amazonUrl: item.amazonUrl,
          unit: item.unit,
          currentStock: item.currentStock,
          minStock: item.minStock,
          reorderQty: item.reorderQty,
          unitCost: item.unitCost,
          autoReorder: item.autoReorder,
          active: item.active,
          lastOrderedAt: item.lastOrderedAt,
          notes: item.notes,
          imageUrl: item.imageUrl,
          latestOrder: item.orders[0] || null,
          isLowStock: item.currentStock < item.minStock,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }
      });
    }
  } catch (error) {
    console.error("[inventory] Failed to process request", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten() },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: "Unable to process inventory request" },
      { status: 500 }
    );
  }
};
