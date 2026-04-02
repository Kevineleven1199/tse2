import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  syncQuoteToSheet,
  syncPaymentVerification,
  getCleanerCapacity,
  isGoogleSheetsConfigured,
  getDashMetrics,
  getDailyReconciliation
} from "@/src/lib/google-sheets";
import { SERVICE_LABELS, estimateDurationHours } from "@/src/lib/pricing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST - Triggers a full sync of recent accepted quotes/jobs to the Google Sheet
 */
export const POST = async (request: NextRequest) => {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "HQ") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isGoogleSheetsConfigured()) {
      return NextResponse.json(
        {
          error: "Google Sheets not configured",
          message: "Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_KEY in Railway env vars"
        },
        { status: 503 }
      );
    }

    const tenantId = session.tenantId;

    // Fetch recent accepted service requests with quotes and jobs
    const recentRequests = await prisma.serviceRequest.findMany({
      where: {
        tenantId,
        status: { in: ["ACCEPTED", "SCHEDULED", "COMPLETED"] },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        quote: { select: { total: true } },
        job: {
          include: {
            assignments: {
              include: {
                cleaner: {
                  include: {
                    user: { select: { firstName: true, lastName: true } }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    let syncedCount = 0;
    const errors: string[] = [];

    for (const req of recentRequests) {
      try {
        const quoteDate = new Intl.DateTimeFormat("en-US", {
          month: "numeric", day: "numeric", year: "numeric"
        }).format(new Date(req.createdAt));

        const address = `${req.addressLine1}${req.city ? ` / ${req.city}` : ""}${req.state ? `, ${req.state}` : ""}`;
        const jobNameAddress = `${req.customerName} - ${address}`;

        // Determine service label from preferredWindows data
        const extData = req.preferredWindows as Record<string, unknown> | null;
        const serviceTypeKey = (extData?.serviceType as string) || "";
        const serviceLabel = SERVICE_LABELS[serviceTypeKey as keyof typeof SERVICE_LABELS]
          || req.serviceType.replace("_", " ");

        // Determine frequency
        const frequency = (extData?.frequency as string) || "one_time";
        const jobType = frequency === "one_time" ? "One-Off" : "Recurring";

        // Get assigned cleaner name
        const assignment = req.job?.assignments?.[0];
        const employeeName = assignment
          ? `${assignment.cleaner.user.firstName} ${assignment.cleaner.user.lastName}`.trim()
          : "Unassigned";

        const sqft = req.squareFootage ?? 1200;
        const svcKey = (serviceTypeKey || "healthy_home") as "healthy_home" | "deep_refresh" | "move_in_out" | "commercial";
        const expectedHours = estimateDurationHours({
          serviceType: svcKey,
          frequency: (frequency || "one_time") as "one_time" | "weekly" | "biweekly" | "monthly",
          locationTier: "sarasota",
          bedrooms: (extData?.bedrooms as number) || 2,
          bathrooms: (extData?.bathrooms as number) || 2,
          squareFootage: sqft,
          addOns: ((extData?.addOns as string[]) || []) as any[],
          isFirstTimeClient: false,
        });
        const paymentDue = req.quote?.total ?? 0;

        const success = await syncQuoteToSheet({
          date: quoteDate,
          employeeName,
          jobNameAddress,
          jobType,
          serviceType: serviceLabel,
          expectedHours,
          paymentDue,
          paymentMethod: "CC"
        });

        if (success) syncedCount++;
        else errors.push(`Failed to sync request ${req.id}`);
      } catch (err) {
        errors.push(
          `Error syncing ${req.id}: ${err instanceof Error ? err.message : "Unknown"}`
        );
      }
    }

    // Also sync payment verifications
    const recentPayments = await prisma.paymentRecord.findMany({
      where: {
        request: { tenantId },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      },
      include: {
        request: { select: { customerName: true, addressLine1: true, city: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    for (const payment of recentPayments) {
      try {
        const payDate = new Intl.DateTimeFormat("en-US", {
          month: "numeric", day: "numeric", year: "numeric"
        }).format(new Date(payment.createdAt));

        await syncPaymentVerification({
          date: payDate,
          jobAddress: `${payment.request.customerName} - ${payment.request.addressLine1}, ${payment.request.city}`,
          dueAmount: payment.amount,
          paymentMethod: payment.provider === "STRIPE" ? "CC" : payment.provider === "MANUAL" ? "Cash/Check" : payment.provider,
          sentInvoice: payment.deposit ? "Yes" : "No"
        });
      } catch {
        // Payment sync errors are non-fatal
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedCount} of ${recentRequests.length} quotes + ${recentPayments.length} payments to Google Sheet`,
      syncedCount,
      totalQuotes: recentRequests.length,
      totalPayments: recentPayments.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error("[sheets/sync] POST error:", error);
    return NextResponse.json(
      { error: "Failed to sync", message: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
};

/**
 * GET - Returns the current sync status and cleaner capacity data from the sheet
 */
export const GET = async (request: NextRequest) => {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "HQ") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isGoogleSheetsConfigured()) {
      return NextResponse.json({
        configured: false,
        message: "Google Sheets not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_KEY."
      });
    }

    const [cleanerCapacity, dashMetrics, dailyReconciliation] = await Promise.all([
      getCleanerCapacity(),
      getDashMetrics(),
      getDailyReconciliation(10)
    ]);

    return NextResponse.json({
      configured: true,
      cleanerCapacity,
      dashMetrics,
      recentRecords: dailyReconciliation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[sheets/sync] GET error:", error);
    return NextResponse.json(
      { configured: false, error: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
};
