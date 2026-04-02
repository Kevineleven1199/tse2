import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/src/lib/auth/cookies";

export const dynamic = "force-dynamic";

const createOrderSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  unitCost: z.coerce.number().positive(),
  source: z.enum(["AMAZON", "SUPPLIER", "LOCAL", "OTHER"]).default("AMAZON"),
  amazonOrderId: z.string().max(100).optional(),
  notes: z.string().max(1000).optional()
});

const updateOrderSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["pending", "ordered", "shipped", "delivered", "cancelled"]),
  trackingNumber: z.string().max(100).optional(),
  expectedDate: z.string().datetime().optional(),
  deliveredAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional()
});

const cancelOrderSchema = z.object({
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
    const status = searchParams.get("status");

    const where: any = {
      item: {
        tenantId: session.tenantId
      }
    };

    if (status) {
      where.status = status;
    }

    const orders = await prisma.supplyOrder.findMany({
      where,
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
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({
      orders: orders.map((order) => ({
        id: order.id,
        itemId: order.itemId,
        item: order.item,
        quantity: order.quantity,
        unitCost: order.unitCost,
        totalCost: order.totalCost,
        source: order.source,
        amazonOrderId: order.amazonOrderId,
        status: order.status,
        trackingNumber: order.trackingNumber,
        expectedDate: order.expectedDate,
        deliveredAt: order.deliveredAt,
        orderedBy: order.orderedBy,
        autoTriggered: order.autoTriggered,
        notes: order.notes,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }))
    });
  } catch (error) {
    console.error("[inventory-orders] Failed to list orders", error);
    return NextResponse.json(
      { error: "Unable to load supply orders" },
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
      const payload = updateOrderSchema.parse(body);

      const existing = await prisma.supplyOrder.findUnique({
        where: { id: payload.id },
        include: {
          item: {
            select: { tenantId: true }
          }
        }
      });

      if (!existing || existing.item.tenantId !== session.tenantId) {
        return NextResponse.json(
          { error: "Order not found" },
          { status: 404 }
        );
      }

      const updated = await prisma.supplyOrder.update({
        where: { id: payload.id },
        data: {
          status: payload.status,
          trackingNumber: payload.trackingNumber,
          expectedDate: payload.expectedDate ? new Date(payload.expectedDate) : undefined,
          deliveredAt: payload.deliveredAt ? new Date(payload.deliveredAt) : undefined,
          notes: payload.notes,
          updatedAt: new Date()
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

      // If delivered, update item's lastOrderedAt
      if (payload.status === "delivered") {
        await prisma.inventoryItem.update({
          where: { id: updated.itemId },
          data: { lastOrderedAt: new Date() }
        });
      }

      return NextResponse.json({
        order: {
          id: updated.id,
          itemId: updated.itemId,
          item: updated.item,
          quantity: updated.quantity,
          unitCost: updated.unitCost,
          totalCost: updated.totalCost,
          source: updated.source,
          amazonOrderId: updated.amazonOrderId,
          status: updated.status,
          trackingNumber: updated.trackingNumber,
          expectedDate: updated.expectedDate,
          deliveredAt: updated.deliveredAt,
          orderedBy: updated.orderedBy,
          autoTriggered: updated.autoTriggered,
          notes: updated.notes,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt
        }
      });
    } else if (action === "cancel") {
      const payload = cancelOrderSchema.parse(body);

      const existing = await prisma.supplyOrder.findUnique({
        where: { id: payload.id },
        include: {
          item: {
            select: { tenantId: true }
          }
        }
      });

      if (!existing || existing.item.tenantId !== session.tenantId) {
        return NextResponse.json(
          { error: "Order not found" },
          { status: 404 }
        );
      }

      if (["delivered", "cancelled"].includes(existing.status)) {
        return NextResponse.json(
          { error: `Cannot cancel an order that is ${existing.status}` },
          { status: 400 }
        );
      }

      const cancelled = await prisma.supplyOrder.update({
        where: { id: payload.id },
        data: {
          status: "cancelled",
          updatedAt: new Date()
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

      return NextResponse.json({
        order: {
          id: cancelled.id,
          itemId: cancelled.itemId,
          item: cancelled.item,
          quantity: cancelled.quantity,
          unitCost: cancelled.unitCost,
          totalCost: cancelled.totalCost,
          source: cancelled.source,
          amazonOrderId: cancelled.amazonOrderId,
          status: cancelled.status,
          trackingNumber: cancelled.trackingNumber,
          expectedDate: cancelled.expectedDate,
          deliveredAt: cancelled.deliveredAt,
          orderedBy: cancelled.orderedBy,
          autoTriggered: cancelled.autoTriggered,
          notes: cancelled.notes,
          createdAt: cancelled.createdAt,
          updatedAt: cancelled.updatedAt
        }
      });
    } else {
      // Create new order
      const payload = createOrderSchema.parse(body);

      const item = await prisma.inventoryItem.findUnique({
        where: { id: payload.itemId },
        select: { tenantId: true }
      });

      if (!item || item.tenantId !== session.tenantId) {
        return NextResponse.json(
          { error: "Item not found" },
          { status: 404 }
        );
      }

      const totalCost = payload.quantity * payload.unitCost;

      const order = await prisma.supplyOrder.create({
        data: {
          tenantId: session.tenantId,
          itemId: payload.itemId,
          quantity: payload.quantity,
          unitCost: payload.unitCost,
          totalCost,
          source: payload.source,
          amazonOrderId: payload.amazonOrderId,
          status: "pending",
          orderedBy: session.userId,
          autoTriggered: false,
          notes: payload.notes
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

      return NextResponse.json({
        order: {
          id: order.id,
          itemId: order.itemId,
          item: order.item,
          quantity: order.quantity,
          unitCost: order.unitCost,
          totalCost: order.totalCost,
          source: order.source,
          amazonOrderId: order.amazonOrderId,
          status: order.status,
          trackingNumber: order.trackingNumber,
          expectedDate: order.expectedDate,
          deliveredAt: order.deliveredAt,
          orderedBy: order.orderedBy,
          autoTriggered: order.autoTriggered,
          notes: order.notes,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        }
      });
    }
  } catch (error) {
    console.error("[inventory-orders] Failed to process request", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten() },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: "Unable to process order request" },
      { status: 500 }
    );
  }
};
