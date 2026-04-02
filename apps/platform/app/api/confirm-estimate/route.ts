import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/src/lib/openphone";
import { applyPasswordHash, extractPasswordHash } from "@/src/lib/auth/password";
import { buildSessionCookie } from "@/src/lib/auth/cookies";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/confirm-estimate?draftId=X&token=Y
 * Fetch draft estimate data for the confirmation page
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const draftId = searchParams.get("draftId");
  const token = searchParams.get("token");

  if (!draftId || !token) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const draft = await prisma.draftEstimate.findUnique({ where: { id: draftId } });
  if (!draft || draft.accessToken !== token) {
    return NextResponse.json({ error: "Invalid or expired estimate link" }, { status: 403 });
  }

  return NextResponse.json({
    customerName: draft.customerName,
    serviceType: draft.serviceType,
    estimatedCost: draft.estimatedCost,
    address: draft.address,
    status: draft.status,
    customerConfirmed: draft.customerConfirmed,
  });
}

/**
 * POST /api/confirm-estimate
 * Customer confirms their estimate → creates ServiceRequest + Quote + Job (PENDING)
 * Then notifies cleaners and admins.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { draftId, token, preferredDate, preferredTime, password } = body;

    if (!draftId || !token) {
      return NextResponse.json({ error: "Missing draftId or token" }, { status: 400 });
    }

    const draft = await prisma.draftEstimate.findUnique({ where: { id: draftId } });
    if (!draft || draft.accessToken !== token) {
      return NextResponse.json({ error: "Invalid or expired estimate" }, { status: 403 });
    }

    if (draft.customerConfirmed) {
      return NextResponse.json({ error: "Already confirmed", status: draft.status }, { status: 409 });
    }

    if (draft.status === "expired") {
      return NextResponse.json({ error: "This estimate has expired. Please call (606) 555-0100 for a new one." }, { status: 410 });
    }

    // Create ServiceRequest + Quote + Job
    const tenantId = draft.tenantId;
    const scheduledStart = preferredDate && preferredTime
      ? new Date(`${preferredDate}T${preferredTime}`)
      : null;

    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        tenantId,
        customerName: draft.customerName,
        customerEmail: draft.customerEmail || "",
        customerPhone: draft.customerPhone,
        addressLine1: draft.address || "",
        city: draft.address?.split(",")[1]?.trim() || "Flatwoods",
        state: "FL",
        postalCode: "",
        serviceType: (draft.serviceType as any) || "HOME_CLEAN",
        status: "ACCEPTED",
        notes: preferredDate ? `Preferred: ${preferredDate} ${preferredTime || ""}`.trim() : null,
      },
    });

    await prisma.quote.create({
      data: {
        requestId: serviceRequest.id,
        subtotal: draft.estimatedCost || 0,
        fees: 0,
        taxes: 0,
        total: draft.estimatedCost || 0,
      },
    });

    const job = await prisma.job.create({
      data: {
        tenantId,
        requestId: serviceRequest.id,
        status: "PENDING",
        payoutAmount: (draft.estimatedCost || 0) * 0.62,
        estimatedHours: 3,
        scheduledStart,
        scheduledEnd: scheduledStart ? new Date(scheduledStart.getTime() + 3 * 3600000) : null,
      },
    });

    // Auto-create Google Drive folder for this customer's job (non-blocking)
    try {
      const { getOrCreateClientFolder } = await import("@/src/lib/google-drive");
      const folder = await getOrCreateClientFolder(
        draft.customerName ?? "Customer",
        draft.address ?? "Unknown"
      );
      if (folder?.folderId) {
        await prisma.serviceRequest.update({
          where: { id: serviceRequest.id },
          data: { driveFolderId: folder.folderId, driveFolderUrl: folder.folderUrl },
        });
        console.log(`[confirm-estimate] Drive folder created: ${folder.folderUrl}`);
      }
    } catch (driveErr) {
      console.error("[confirm-estimate] Drive folder creation failed (non-blocking):", driveErr);
    }

    // Update draft estimate
    await prisma.draftEstimate.update({
      where: { id: draftId },
      data: {
        customerConfirmed: true,
        jobId: job.id,
        status: "customer_confirmed",
      },
    });

    // Notify cleaners about the new job
    try {
      const { notifyMatchingCleaners } = await import("@/lib/automation-engine");
      await notifyMatchingCleaners(job.id);
    } catch (e) {
      console.warn("[confirm-estimate] Cleaner notification failed:", e);
    }

    // SMS to admin
    const hqNumbers = (process.env.OPENPHONE_HQ_NUMBERS || "").split(",").map((n) => n.trim()).filter(Boolean);
    if (hqNumbers.length > 0) {
      sendSms({
        to: hqNumbers,
        content: `✅ ESTIMATE ACCEPTED!\n\n${draft.customerName} confirmed their ${draft.serviceType?.replace(/_/g, " ") || "cleaning"} estimate${draft.estimatedCost ? ` ($${draft.estimatedCost.toFixed(0)})` : ""}.\n\nCleaners have been notified. Awaiting cleaner claim.`,
      }).catch(() => {});
    }

    // Create todo
    await prisma.todoItem.create({
      data: {
        tenantId,
        userId: "system",
        title: `[CONFIRMED] ${draft.customerName} accepted estimate — awaiting cleaner`,
        description: `${draft.serviceType?.replace(/_/g, " ") || "Cleaning"} · ${draft.estimatedCost ? `$${draft.estimatedCost.toFixed(0)}` : "Custom"} · ${draft.address || "Address TBD"}\n\nCleaners have been broadcast. First to claim gets the job.`,
        priority: 1,
        isShared: true,
        category: "confirmed",
        relatedId: job.id,
        relatedType: "job",
      },
    });

    // Create or update customer account
    let sessionCookie: { name: string; value: string; options: any } | null = null;
    try {
      const email = (draft.customerEmail || "").toLowerCase().trim();
      if (email) {
        let user = await prisma.user.findUnique({ where: { email } });
        const nameParts = (draft.customerName || "Customer").trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ") || "";

        if (!user) {
          // Create new customer account
          const avatarPayload = password && password.length >= 8
            ? await applyPasswordHash(password)
            : null;

          user = await prisma.user.create({
            data: {
              tenantId,
              email,
              firstName,
              lastName,
              phone: draft.customerPhone || null,
              role: Role.CUSTOMER,
              ...(avatarPayload ? { avatarUrl: avatarPayload } : {}),
            },
          });
        } else if (password && password.length >= 8 && !extractPasswordHash(user.avatarUrl)) {
          // Existing user without password — set it
          const avatarPayload = await applyPasswordHash(password, user.avatarUrl ?? undefined);
          await prisma.user.update({
            where: { id: user.id },
            data: { avatarUrl: avatarPayload },
          });
        }

        // Build session cookie so customer is logged in after accepting
        sessionCookie = await buildSessionCookie({
          userId: user.id,
          email: user.email,
          role: user.role,
          name: `${user.firstName} ${user.lastName}`.trim(),
          tenantId: user.tenantId,
        });
      }
    } catch (accountErr) {
      console.error("[confirm-estimate] Account creation failed (non-blocking):", accountErr);
    }

    const response = NextResponse.json({ ok: true, jobId: job.id, message: "Estimate confirmed! We're matching you with a crew member." });

    // Set session cookie if account was created
    if (sessionCookie) {
      response.cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.options);
    }

    return response;
  } catch (error) {
    console.error("[confirm-estimate] Error:", error);
    return NextResponse.json({ error: "Failed to confirm estimate" }, { status: 500 });
  }
}
