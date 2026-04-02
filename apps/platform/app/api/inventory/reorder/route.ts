import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/src/lib/auth/cookies";

export const dynamic = "force-dynamic";

const reorderSchema = z.object({
  secret: z.string().optional(),
  dryRun: z.boolean().default(false)
});

export const POST = async (request: Request) => {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const payload = reorderSchema.parse(body);

    // Check authentication: either session auth OR secret param
    let tenantId: string | null = null;

    if (payload.secret) {
      // Verify secret matches environment variable
      const reorderSecret = process.env.REORDER_SECRET;
      if (!reorderSecret || payload.secret !== reorderSecret) {
        return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
      }
      // If using secret, we need to specify which tenant or operate on all
      // For now, we'll require session auth for tenant isolation
      const session = await getSessionFromCookies();
      if (!session) {
        return NextResponse.json(
          { error: "Session required when using secret" },
          { status: 401 }
        );
      }
      tenantId = session.tenantId;
    } else {
      // Use session authentication
      const session = await getSessionFromCookies();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (!["HQ", "MANAGER"].includes(session.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      tenantId = session.tenantId;
    }

    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all items with autoReorder=true and currentStock < minStock
    const itemsNeedingReorder = await prisma.inventoryItem.findMany({
      where: {
        tenantId,
        autoReorder: true,
        active: true,
        currentStock: {
          lt: prisma.inventoryItem.fields.minStock
        }
      },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
        minStock: true,
        reorderQty: true,
        unitCost: true,
        category: true,
        unit: true,
        amazonAsin: true,
        amazonUrl: true
      }
    });

    // If dry run, just return what would be ordered
    if (payload.dryRun) {
      return NextResponse.json({
        dryRun: true,
        itemsFound: itemsNeedingReorder.length,
        items: itemsNeedingReorder.map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          currentStock: item.currentStock,
          minStock: item.minStock,
          reorderQty: item.reorderQty,
          unitCost: item.unitCost,
          totalCost: item.reorderQty * item.unitCost,
          category: item.category,
          unit: item.unit,
          amazonAsin: item.amazonAsin,
          amazonUrl: item.amazonUrl
        }))
      });
    }

    // Create orders for items needing reorder
    const createdOrders = [];
    const systemUserId = process.env.SYSTEM_USER_ID || "system";

    for (const item of itemsNeedingReorder) {
      const totalCost = item.reorderQty * item.unitCost;

      const order = await prisma.supplyOrder.create({
        data: {
          tenantId,
          itemId: item.id,
          quantity: item.reorderQty,
          unitCost: item.unitCost,
          totalCost,
          source: item.amazonAsin ? "AMAZON" : "SUPPLIER",
          status: "pending",
          orderedBy: systemUserId,
          autoTriggered: true,
          notes: `Auto-reordered when stock fell below minimum (${item.currentStock} < ${item.minStock})`
        },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              sku: true,
              category: true,
              unit: true,
              amazonAsin: true,
              currentStock: true,
              minStock: true
            }
          }
        }
      });

      createdOrders.push({
        id: order.id,
        itemId: order.itemId,
        itemName: order.item.name,
        itemSku: order.item.sku,
        quantity: order.quantity,
        unitCost: order.unitCost,
        totalCost: order.totalCost,
        source: order.source,
        status: order.status,
        createdAt: order.createdAt
      });
    }

    return NextResponse.json({
      success: true,
      itemsProcessed: itemsNeedingReorder.length,
      ordersCreated: createdOrders.length,
      items: itemsNeedingReorder.map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        currentStock: item.currentStock,
        minStock: item.minStock,
        reorderQty: item.reorderQty,
        unitCost: item.unitCost,
        totalCost: item.reorderQty * item.unitCost,
        category: item.category,
        unit: item.unit,
        amazonAsin: item.amazonAsin,
        amazonUrl: item.amazonUrl
      })),
      orders: createdOrders
    });
  } catch (error) {
    console.error("[inventory-reorder] Failed to process reorder", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten() },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: "Unable to process reorder request" },
      { status: 500 }
    );
  }
};
