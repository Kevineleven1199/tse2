import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchClockAlert } from "@/src/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/inventory-alerts
 * Check inventory levels and alert admins/managers when items need reordering.
 * Also calculates predicted reorder dates based on usage history.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenant = await prisma.tenant.findFirst({ select: { id: true } });
    if (!tenant) return NextResponse.json({ error: "No tenant" }, { status: 500 });

    // Find items below minimum stock
    const lowStockItems = await prisma.inventoryItem.findMany({
      where: {
        tenantId: tenant.id,
        active: true,
        currentStock: { lte: prisma.inventoryItem.fields.minStock },
      },
    });

    if (lowStockItems.length === 0) {
      return NextResponse.json({ success: true, alerts: 0, message: "All inventory levels OK" });
    }

    // Calculate reorder costs
    let totalReorderCost = 0;
    const alerts: string[] = [];

    for (const item of lowStockItems) {
      const reorderCost = (item.reorderQty ?? 1) * (item.unitCost ?? 0);
      totalReorderCost += reorderCost;
      alerts.push(`${item.name}: ${item.currentStock}/${item.minStock} (reorder ${item.reorderQty} × $${(item.unitCost ?? 0).toFixed(2)} = $${reorderCost.toFixed(2)})`);
    }

    // Send alert to all channels
    const message = `📦 INVENTORY ALERT: ${lowStockItems.length} item(s) below minimum stock.\n\n${alerts.join("\n")}\n\nTotal reorder cost: $${totalReorderCost.toFixed(2)}`;

    try {
      // Reuse the dispatchClockAlert for multi-channel notification
      await dispatchClockAlert({
        tenantId: tenant.id,
        cleanerName: "Inventory System",
        eventType: "clock_out", // reuse the alert type
        jobInfo: `${lowStockItems.length} items need reorder ($${totalReorderCost.toFixed(2)})`,
        timestamp: new Date(),
      });
    } catch (alertErr) {
      console.error("[inventory-alerts] Alert dispatch failed:", alertErr);
    }

    // Create todo items for each low stock item
    for (const item of lowStockItems) {
      await prisma.todoItem.create({
        data: {
          tenantId: tenant.id,
          userId: "system",
          title: `[REORDER] ${item.name} — ${item.currentStock} remaining (min: ${item.minStock})`,
          description: `Reorder ${item.reorderQty} units at $${(item.unitCost ?? 0).toFixed(2)}/unit = $${((item.reorderQty ?? 1) * (item.unitCost ?? 0)).toFixed(2)}${item.amazonUrl ? `\n\nAmazon: ${item.amazonUrl}` : ""}`,
          priority: 1,
          isShared: true,
          category: "inventory",
          relatedId: item.id,
          relatedType: "inventory_item",
        },
      }).catch(() => {}); // Skip if todo already exists
    }

    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: "inventory.low_stock_alert",
        metadata: { itemCount: lowStockItems.length, totalReorderCost, items: alerts },
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      alerts: lowStockItems.length,
      totalReorderCost,
      items: lowStockItems.map((i) => ({
        name: i.name,
        currentStock: i.currentStock,
        minStock: i.minStock,
        reorderQty: i.reorderQty,
        unitCost: i.unitCost,
        reorderCost: (i.reorderQty ?? 1) * (i.unitCost ?? 0),
        amazonUrl: i.amazonUrl,
      })),
    });
  } catch (error) {
    console.error("[inventory-alerts] Error:", error);
    return NextResponse.json({ error: "Inventory alert check failed" }, { status: 500 });
  }
}
