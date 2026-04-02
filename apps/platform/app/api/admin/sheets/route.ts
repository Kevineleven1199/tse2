import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  getCleanerCapacity,
  isGoogleSheetsConfigured,
  getDashMetrics,
  getDailyReconciliation,
  syncLeadToSheet,
  syncQuoteToSheet,
  updateDashMetrics,
  syncPaymentVerification
} from "@/src/lib/google-sheets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface SheetsResponse {
  configured: boolean;
  cleanerCapacity?: Array<{
    name: string;
    active: boolean;
    weeklyCapacityHours: number;
    weeklyCapacityCleans: number;
    hireTriggerPercent: number;
    notes: string;
  }>;
  dashMetrics?: {
    totalRevenue: number;
    totalCleanerPay: number;
    profit: number;
    monthlyOverhead: number;
    completedJobs: number;
  };
  recentRecords?: Array<{
    date: string;
    employeeName: string;
    jobNameAddress: string;
    jobType: string;
    serviceType: string;
    expectedHours: number;
    paymentDue: number;
    paymentMethod: string;
    jobCompleted: string;
    paid: string;
  }>;
  timestamp?: string;
  message?: string;
  error?: string;
}

/**
 * GET - Returns cleaner capacity, recent sheet data, and current metrics
 */
export const GET = async (request: NextRequest): Promise<NextResponse<SheetsResponse>> => {
  try {
    // Validate session and HQ role
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { configured: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.role !== "HQ") {
      return NextResponse.json(
        { configured: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    // Check if Google Sheets is configured
    if (!isGoogleSheetsConfigured()) {
      return NextResponse.json({
        configured: false,
        message:
          "Google Sheets not configured: missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_KEY"
      });
    }

    // Fetch all data in parallel
    const [cleanerCapacity, dashMetrics, dailyReconciliation] = await Promise.all(
      [
        getCleanerCapacity(),
        getDashMetrics(),
        getDailyReconciliation(15) // Get last 15 records
      ]
    );

    // Format recent records for response
    const recentRecords = dailyReconciliation.map((record) => ({
      date: record.date,
      employeeName: record.employeeName,
      jobNameAddress: record.jobNameAddress,
      jobType: record.jobType,
      serviceType: record.serviceType,
      expectedHours: record.expectedHours,
      paymentDue: record.paymentDue,
      paymentMethod: record.paymentMethod,
      jobCompleted: record.jobCompleted,
      paid: record.paid
    }));

    return NextResponse.json({
      configured: true,
      cleanerCapacity,
      dashMetrics: dashMetrics || undefined,
      recentRecords,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error in GET /api/admin/sheets:", error);
    return NextResponse.json(
      {
        configured: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};

interface SyncLeadRequest {
  type: "lead";
  dateAdded: string;
  source: string;
  customerName: string;
  phoneNumber: string;
  address: string;
  inquiryType: string;
}

interface SyncQuoteRequest {
  type: "quote";
  date: string;
  employeeName: string;
  jobNameAddress: string;
  jobType: string;
  serviceType: string;
  expectedHours: number;
  paymentDue: number;
  paymentMethod: string;
}

interface UpdateMetricsRequest {
  type: "metrics";
  totalRevenue: number;
  totalCleanerPay: number;
  completedJobs: number;
  monthlyOverhead: number;
  reportDate: string;
}

interface SyncPaymentRequest {
  type: "payment";
  date: string;
  jobAddress: string;
  dueAmount: number;
  paymentMethod: string;
  sentInvoice: string;
}

type AdminSheetsRequest =
  | SyncLeadRequest
  | SyncQuoteRequest
  | UpdateMetricsRequest
  | SyncPaymentRequest;

interface AdminSheetsResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * POST - Sync specific data to the Google Sheet
 * Supports syncing leads, quotes, metrics, and payment verifications
 */
export const POST = async (
  request: NextRequest
): Promise<NextResponse<AdminSheetsResponse>> => {
  try {
    // Validate session and HQ role
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.role !== "HQ") {
      return NextResponse.json(
        { success: false, error: "Forbidden", message: "Forbidden" },
        { status: 403 }
      );
    }

    // Check if Google Sheets is configured
    if (!isGoogleSheetsConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Google Sheets not configured",
          message:
            "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_KEY"
        },
        { status: 503 }
      );
    }

    const body: AdminSheetsRequest = await request.json();

    if (!body.type) {
      return NextResponse.json(
        { success: false, message: "Missing type field", error: "Bad request" },
        { status: 400 }
      );
    }

    // Handle different sync types
    switch (body.type) {
      case "lead": {
        const leadData = body as SyncLeadRequest;
        const success = await syncLeadToSheet({
          dateAdded: leadData.dateAdded,
          source: leadData.source,
          customerName: leadData.customerName,
          phoneNumber: leadData.phoneNumber,
          address: leadData.address,
          inquiryType: leadData.inquiryType
        });

        return NextResponse.json({
          success,
          message: success
            ? "Lead synced to Google Sheet"
            : "Failed to sync lead to Google Sheet"
        });
      }

      case "quote": {
        const quoteData = body as SyncQuoteRequest;
        const success = await syncQuoteToSheet({
          date: quoteData.date,
          employeeName: quoteData.employeeName,
          jobNameAddress: quoteData.jobNameAddress,
          jobType: quoteData.jobType,
          serviceType: quoteData.serviceType,
          expectedHours: quoteData.expectedHours,
          paymentDue: quoteData.paymentDue,
          paymentMethod: quoteData.paymentMethod
        });

        return NextResponse.json({
          success,
          message: success
            ? "Quote synced to Google Sheet"
            : "Failed to sync quote to Google Sheet"
        });
      }

      case "metrics": {
        const metricsData = body as UpdateMetricsRequest;
        const success = await updateDashMetrics({
          totalRevenue: metricsData.totalRevenue,
          totalCleanerPay: metricsData.totalCleanerPay,
          completedJobs: metricsData.completedJobs,
          monthlyOverhead: metricsData.monthlyOverhead,
          reportDate: metricsData.reportDate
        });

        return NextResponse.json({
          success,
          message: success
            ? "Dashboard metrics updated"
            : "Failed to update dashboard metrics"
        });
      }

      case "payment": {
        const paymentData = body as SyncPaymentRequest;
        const success = await syncPaymentVerification({
          date: paymentData.date,
          jobAddress: paymentData.jobAddress,
          dueAmount: paymentData.dueAmount,
          paymentMethod: paymentData.paymentMethod,
          sentInvoice: paymentData.sentInvoice
        });

        return NextResponse.json({
          success,
          message: success
            ? "Payment verification synced"
            : "Failed to sync payment verification"
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            message: `Unknown sync type: ${(body as any).type}`,
            error: "Bad request"
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in POST /api/admin/sheets:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to sync to Google Sheet",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};
