/**
 * Admin Approval Queue — GET and POST
 *
 * GET  /api/admin/approvals         → List pending approvals
 * POST /api/admin/approvals         → Approve/reject a pending item
 *
 * Flow: Call/lead comes in → AI summary → Admin reviews → Approves →
 *       local Job created + pushed to Jobber (if configured)
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { getTenantFromRequest } from "@/lib/tenant";
import { JobStatus, RequestStatus, ServiceType } from "@prisma/client";
import { sendOperationalSms } from "@/src/lib/notifications";
import {
  isJobberConfigured,
  findOrCreateJobberClient,
  createJobberJob,
  scheduleJobberVisit,
} from "@/src/lib/jobber";

export const dynamic = "force-dynamic";

// ─── GET: List pending approvals ───

export async function GET(request: Request) {
  try {
    // Auth check — admin only (HQ or MANAGER)
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    const approvals = await prisma.adminApproval.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      approvals,
      jobberConnected: isJobberConfigured(),
    });
  } catch (error: any) {
    console.error("[admin-approvals] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST: Approve or reject ───

export async function POST(request: Request) {
  try {
    // Auth check — admin only (HQ or MANAGER)
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { approvalId, action, notes } = body;

    if (!approvalId || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "approvalId and action (approve/reject) required" },
        { status: 400 }
      );
    }

    const approval = await prisma.adminApproval.findUnique({
      where: { id: approvalId },
    });

    if (!approval) {
      return NextResponse.json({ error: "Approval not found" }, { status: 404 });
    }

    if (approval.status !== "pending") {
      return NextResponse.json(
        { error: `Already ${approval.status}` },
        { status: 400 }
      );
    }

    if (action === "reject") {
      await prisma.adminApproval.update({
        where: { id: approvalId },
        data: { status: "rejected", notes: notes || null, resolvedAt: new Date() },
      });
      return NextResponse.json({ success: true, status: "rejected" });
    }

    // ─── APPROVE: Create local Job + push to Jobber if configured ───

    const tenant = await getTenantFromRequest();
    const tenantId = tenant?.id ?? "default";
    const meta = approval.metadata as any;

    const serviceTypeMap: Record<string, ServiceType> = {
      home_clean: ServiceType.HOME_CLEAN,
      pressure_wash: ServiceType.PRESSURE_WASH,
      auto_detail: ServiceType.AUTO_DETAIL,
      custom: ServiceType.CUSTOM,
    };

    const svcType = serviceTypeMap[approval.serviceType?.toLowerCase() ?? ""] ?? ServiceType.HOME_CLEAN;

    // 1. Create local ServiceRequest + Job
    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        tenantId,
        customerName: approval.customerName ?? "Unknown",
        customerEmail: approval.customerEmail ?? "",
        customerPhone: approval.customerPhone ?? "",
        addressLine1: approval.address ?? "TBD",
        city: "Flatwoods",
        state: "FL",
        postalCode: "00000",
        serviceType: svcType,
        notes: [approval.aiSummary, notes].filter(Boolean).join("\n"),
        status: RequestStatus.ACCEPTED,
      },
    });

    const visitStart = buildVisitDateTime(approval.requestedDay ?? undefined, approval.requestedTime ?? undefined);
    const estimatedHours = approval.estimatedHours ?? 3;
    const visitEnd = visitStart
      ? new Date(visitStart.getTime() + estimatedHours * 3600_000)
      : null;

    const job = await prisma.job.create({
      data: {
        tenantId,
        requestId: serviceRequest.id,
        status: JobStatus.PENDING,
        estimatedHours,
        scheduledStart: visitStart,
        scheduledEnd: visitEnd,
      },
    });

    // 2. Push to Jobber if configured
    let jobberId: string | null = null;
    let jobberVisitId: string | null = null;

    if (isJobberConfigured()) {
      try {
        const nameParts = (meta?.customerName || approval.customerName || "Unknown").split(" ");
        const firstName = nameParts[0] || "Unknown";
        const lastName = nameParts.slice(1).join(" ") || "Customer";

        const clientId = await findOrCreateJobberClient({
          firstName,
          lastName,
          email: meta?.customerEmail || approval.customerEmail,
          phone: meta?.customerPhone || approval.customerPhone,
          address: (meta?.address || approval.address)
            ? {
                street1: meta?.address || approval.address,
                city: meta?.city || "Flatwoods",
                province: meta?.state || "FL",
                postalCode: meta?.postalCode || "",
              }
            : undefined,
        });

        const svcLabel =
          (approval.serviceType || "cleaning")
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c: string) => c.toUpperCase());

        jobberId = await createJobberJob({
          clientId,
          title: `${svcLabel} — ${approval.customerName || "Customer"}`,
          instructions: [
            approval.aiSummary,
            estimatedHours ? `Est. ${estimatedHours} hours` : "",
            notes || "",
          ]
            .filter(Boolean)
            .join("\n"),
        });

        if (visitStart) {
          jobberVisitId = await scheduleJobberVisit({
            jobId: jobberId,
            startAt: visitStart.toISOString(),
            endAt: (visitEnd ?? new Date(visitStart.getTime() + 3 * 3600_000)).toISOString(),
          });
        }
      } catch (err: any) {
        console.error("[admin-approvals] Jobber push failed:", err);
      }
    }

    await prisma.adminApproval.update({
      where: { id: approvalId },
      data: {
        status: "approved",
        notes: notes || null,
        resolvedAt: new Date(),
        jobberJobId: jobberId,
        jobberVisitId: jobberVisitId,
      },
    });

    // Notify ops team
    try {
      const svcLabel = (approval.serviceType || "cleaning").replace(/_/g, " ");
      await sendOperationalSms(
        `Approved: ${approval.customerName} – ${svcLabel}\n` +
        `${approval.address ?? "No address"}\n` +
        `Est. ${estimatedHours} hrs • Job ${job.id.slice(0, 8)}`
      );
    } catch (err) {
      console.error("[admin-approvals] SMS notify failed:", err);
    }

    return NextResponse.json({
      success: true,
      status: "approved",
      jobId: job.id,
      requestId: serviceRequest.id,
      jobber: jobberId ? { jobId: jobberId, visitId: jobberVisitId } : null,
    });
  } catch (error: any) {
    console.error("[admin-approvals] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── Helpers ───

function buildVisitDateTime(day?: string, time?: string): Date | null {
  if (!day && !time) return null;

  const now = new Date();
  const target = new Date(now);

  // Parse day of week
  if (day) {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const targetDay = days.findIndex((d) => day.toLowerCase().startsWith(d.slice(0, 3)));
    if (targetDay >= 0) {
      const currentDay = now.getDay();
      let daysAhead = targetDay - currentDay;
      if (daysAhead <= 0) daysAhead += 7;
      target.setDate(now.getDate() + daysAhead);
    }
  }

  // Parse time
  if (time) {
    const match = time.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2] || "0");
      const ampm = match[3]?.toLowerCase();
      if (ampm === "pm" && hours < 12) hours += 12;
      if (ampm === "am" && hours === 12) hours = 0;
      target.setHours(hours, minutes, 0, 0);
    }
  } else {
    target.setHours(9, 0, 0, 0); // Default 9 AM
  }

  return target;
}
