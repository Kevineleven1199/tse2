export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { syncContactToOpenPhone, syncCustomerOnJobBooked, syncAllContacts } from "@/src/lib/openphone-sync";

/**
 * GET /api/admin/openphone-sync — Sync status
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "HQ") {
      return NextResponse.json({ error: "Unauthorized — HQ only" }, { status: 401 });
    }

    // Last sync from audit log
    const lastSync = await prisma.auditLog.findFirst({
      where: { action: "openphone_sync", tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, metadata: true },
    });

    // Count customers with phone numbers (syncable)
    const totalCustomers = await prisma.user.count({
      where: { tenantId: session.tenantId, role: "CUSTOMER", phone: { not: null } },
    });

    // Count customers with recent service requests (have address data)
    const customersWithAddress = await prisma.serviceRequest.groupBy({
      by: ["customerEmail"],
      where: { tenantId: session.tenantId },
      _count: true,
    });

    return NextResponse.json({
      status: "ok",
      apiKeyConfigured: !!process.env.OPENPHONE_API_KEY,
      lastSync: lastSync?.createdAt || null,
      lastSyncResult: lastSync?.metadata || null,
      totalCustomers,
      customersWithAddressData: customersWithAddress.length,
    });
  } catch (error) {
    console.error("[openphone-sync] GET error:", error);
    return NextResponse.json({ error: "Failed to get sync status" }, { status: 500 });
  }
}

/**
 * POST /api/admin/openphone-sync — Trigger sync
 * Body: { action: "sync_all" | "sync_customer" | "sync_job", id?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "HQ") {
      return NextResponse.json({ error: "Unauthorized — HQ only" }, { status: 401 });
    }

    const body = await req.json();
    const { action, id } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing: action" }, { status: 400 });
    }

    if (action === "sync_all") {
      // Start bulk sync in background
      const startTime = Date.now();
      syncAllContacts(session.tenantId).then(async (result) => {
        await prisma.auditLog.create({
          data: {
            tenantId: session.tenantId,
            actorId: session.userId,
            action: "openphone_sync",
            metadata: { type: "bulk", ...result, durationMs: Date.now() - startTime },
          },
        });
      }).catch(console.error);

      return NextResponse.json({
        success: true,
        message: "Bulk sync started — check back in a few minutes for results",
      });
    }

    if (action === "sync_customer") {
      if (!id) return NextResponse.json({ error: "Missing: id (user ID)" }, { status: 400 });

      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      });
      if (!user) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

      // Get most recent service request for address
      const recentReq = await prisma.serviceRequest.findFirst({
        where: { customerEmail: user.email, tenantId: session.tenantId },
        orderBy: { createdAt: "desc" },
        select: { addressLine1: true, addressLine2: true, city: true, state: true, postalCode: true, serviceType: true },
      });

      const contactId = await syncContactToOpenPhone({
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phone || "",
        email: user.email,
        address: recentReq?.addressLine1 ? {
          street: recentReq.addressLine2 ? `${recentReq.addressLine1}, ${recentReq.addressLine2}` : recentReq.addressLine1,
          city: recentReq.city,
          state: recentReq.state,
          zipCode: recentReq.postalCode,
          country: "US",
        } : undefined,
        customerId: user.id,
        serviceType: recentReq?.serviceType,
      });

      await prisma.auditLog.create({
        data: {
          tenantId: session.tenantId,
          actorId: session.userId,
          action: "openphone_sync",
          metadata: { type: "customer", customerId: id, contactId, success: !!contactId },
        },
      });

      return NextResponse.json({ success: !!contactId, contactId });
    }

    if (action === "sync_job") {
      if (!id) return NextResponse.json({ error: "Missing: id (job ID)" }, { status: 400 });

      const contactId = await syncCustomerOnJobBooked(id);

      await prisma.auditLog.create({
        data: {
          tenantId: session.tenantId,
          actorId: session.userId,
          action: "openphone_sync",
          metadata: { type: "job", jobId: id, contactId, success: !!contactId },
        },
      });

      return NextResponse.json({ success: !!contactId, contactId });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error("[openphone-sync] POST error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
