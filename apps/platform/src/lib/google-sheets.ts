import { google } from "googleapis";
import type { sheets_v4 } from "googleapis";

// Spreadsheet ID for the cleaning business Google Sheet
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID ?? "1JOXlmqZDju97-zICFlvdrmMGpKsgPfmPsPsXhIXbfLk";

// Tab identifiers (gid values)
const SHEET_TABS = {
  DASH: "Dash",
  DAILY_RECONCILIATION: "Daily Reconciliation",
  LOOSE_ENDS: "Loose",
  PAYROLL: "Payroll",
  CLEANER_CAPACITY: "Cleaner Capacity Setup",
  CALL_SUMMARIES: "Call Summaries",
  ESTIMATES: "Estimates"
};

const TAB_GIDS = {
  DASH: 1019951164,
  DAILY_RECONCILIATION: 1492458543,
  LOOSE_ENDS: 149099048,
  PAYROLL: 0,
  CLEANER_CAPACITY: 296038453
};

// Singleton for cached sheets client
let sheetsClient: sheets_v4.Sheets | null = null;

/**
 * Initialize and return the cached Google Sheets client
 * Uses service account credentials from environment variables
 */
function getSheetsClient(): sheets_v4.Sheets {
  if (sheetsClient) {
    return sheetsClient;
  }

  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const serviceAccountKeyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountEmail || !serviceAccountKeyBase64) {
    throw new Error(
      "Google Sheets not configured: missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_KEY"
    );
  }

  let privateKey: string;
  try {
    const keyJson = Buffer.from(serviceAccountKeyBase64, "base64").toString(
      "utf-8"
    );
    const keyObject = JSON.parse(keyJson);
    privateKey = keyObject.private_key;
  } catch (error) {
    throw new Error(
      "Failed to decode GOOGLE_SERVICE_ACCOUNT_KEY: must be base64-encoded JSON"
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: "service_account" as const,
      project_id: process.env.GOOGLE_PROJECT_ID || "",
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID || "",
      private_key: privateKey,
      client_email: serviceAccountEmail,
      client_id: process.env.GOOGLE_CLIENT_ID || ""
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

/**
 * Check if Google Sheets is properly configured
 */
export function isGoogleSheetsConfigured(): boolean {
  return (
    !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  );
}

/**
 * Stamp "Last Updated" cell on the Dash tab so the team can see at a glance
 * when the system last wrote to the sheet.
 * Writes to cell L1 (label) and L2 (timestamp) — far-right area of Dash.
 */
async function stampLastUpdated(source: string): Promise<void> {
  try {
    const sheets = getSheetsClient();
    const now = new Date();
    const timestamp = now.toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        data: [
          {
            range: `'${SHEET_TABS.DASH}'!L1`,
            values: [["Last Auto-Sync"]],
          },
          {
            range: `'${SHEET_TABS.DASH}'!L2`,
            values: [[`${timestamp} ET`]],
          },
          {
            range: `'${SHEET_TABS.DASH}'!L3`,
            values: [[`Source: ${source}`]],
          },
        ],
        valueInputOption: "USER_ENTERED",
      },
    });
  } catch (error) {
    // Never let the timestamp fail block the actual sync
    console.error("Failed to stamp Last Updated:", error);
  }
}

/**
 * Append a new row to the Daily Reconciliation tab when a quote is accepted
 * @param data Quote data to sync to the sheet
 * @returns true if successful, false otherwise
 */
export async function syncQuoteToSheet(data: {
  date: string; // e.g. "2/12/2026"
  employeeName: string; // cleaner name or "Unassigned"
  jobNameAddress: string; // "Customer Name - Address / City, State ZIP"
  jobType: string; // "One-Off" or "Recurring"
  serviceType: string; // "Basic/Maintenance Clean", "Deep Clean", etc.
  expectedHours: number;
  paymentDue: number;
  paymentMethod: string; // "CC", "Zelle", "Cash/Check"
}): Promise<boolean> {
  try {
    if (!isGoogleSheetsConfigured()) {
      console.warn(
        "Google Sheets not configured: skipping quote sync to sheet"
      );
      return false;
    }

    const sheets = getSheetsClient();

    // Row values for Daily Reconciliation sheet
    // Columns: Date, Pay Period, Employee Name, Job Name/Address, Job Type,
    //          Service Type, Expected Hours, ETA, Arrival Time, End Time,
    //          Logged Hours, Logged Hours (Decimal), Payment Due, Discount?,
    //          After Stripe, Actual Revenue, Payment Method, Job Completed?,
    //          Sent Invoice?, Paid?, Notes/Discrepancies
    const row = [
      data.date, // Date
      "", // Pay Period (to be filled manually or by automation)
      data.employeeName, // Employee Name
      data.jobNameAddress, // Job Name/Address
      data.jobType, // Job Type
      data.serviceType, // Service Type
      data.expectedHours, // Expected Hours
      "", // ETA
      "", // Arrival Time
      "", // End Time
      "", // Logged Hours
      "", // Logged Hours (Decimal)
      data.paymentDue, // Payment Due
      "", // Discount?
      "", // After Stripe
      "", // Actual Revenue
      data.paymentMethod, // Payment Method
      "", // Job Completed?
      "", // Sent Invoice?
      "", // Paid?
      "" // Notes/Discrepancies
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_TABS.DAILY_RECONCILIATION}'!A:U`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row]
      }
    });

    await stampLastUpdated("Quote Accepted → Daily Reconciliation");
    return true;
  } catch (error) {
    console.error("Failed to sync quote to Google Sheet:", error);
    return false;
  }
}

/**
 * Append a new lead to the Loose Ends tab
 * @param data Lead data to sync to the sheet
 * @returns true if successful, false otherwise
 */
export async function syncLeadToSheet(data: {
  dateAdded: string;
  source: string; // "Website Quote", "Inbound Call/Text (Openphone)", etc.
  customerName: string;
  phoneNumber: string;
  address: string;
  inquiryType: string; // "One-Time Deep Clean", "Recurring", "Move In/Out", etc.
}): Promise<boolean> {
  try {
    if (!isGoogleSheetsConfigured()) {
      console.warn("Google Sheets not configured: skipping lead sync to sheet");
      return false;
    }

    const sheets = getSheetsClient();

    // Row values for Loose Ends sheet
    // Columns: Date Added, Source, Customer Name, Phone Number, Address, Inquiry Type, Property type
    const row = [
      data.dateAdded, // Date Added
      data.source, // Source
      data.customerName, // Customer Name
      data.phoneNumber, // Phone Number
      data.address, // Address
      data.inquiryType, // Inquiry Type
      "" // Property type (to be filled manually)
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_TABS.LOOSE_ENDS}'!A:G`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row]
      }
    });

    await stampLastUpdated("New Lead → Loose Ends");
    return true;
  } catch (error) {
    console.error("Failed to sync lead to Google Sheet:", error);
    return false;
  }
}

interface CleanerCapacityData {
  name: string;
  active: boolean;
  weeklyCapacityHours: number;
  weeklyCapacityCleans: number;
  hireTriggerPercent: number;
  notes: string;
}

/**
 * Read cleaner capacity data from the sheet
 * @returns Array of cleaner capacity records, or empty array on failure
 */
export async function getCleanerCapacity(): Promise<CleanerCapacityData[]> {
  try {
    if (!isGoogleSheetsConfigured()) {
      console.warn(
        "Google Sheets not configured: cannot read cleaner capacity"
      );
      return [];
    }

    const sheets = getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_TABS.CLEANER_CAPACITY}'!A:F`
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      return []; // Only headers or empty
    }

    const cleaners: CleanerCapacityData[] = [];

    // Skip header row (row 0)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      cleaners.push({
        name: row[0] || "",
        active: (row[1] || "").toUpperCase() === "YES",
        weeklyCapacityHours: parseFloat(row[2]) || 0,
        weeklyCapacityCleans: parseFloat(row[3]) || 0,
        hireTriggerPercent: parseFloat(row[4]) || 0,
        notes: row[5] || ""
      });
    }

    return cleaners;
  } catch (error) {
    console.error("Failed to read cleaner capacity from Google Sheet:", error);
    return [];
  }
}

/**
 * Update the Dash tab with current metrics
 * @param data Metrics to update in the dashboard
 * @returns true if successful, false otherwise
 */
export async function updateDashMetrics(data: {
  totalRevenue: number;
  totalCleanerPay: number;
  completedJobs: number;
  monthlyOverhead: number;
  reportDate: string;
}): Promise<boolean> {
  try {
    if (!isGoogleSheetsConfigured()) {
      console.warn("Google Sheets not configured: skipping dash metrics update");
      return false;
    }

    const sheets = getSheetsClient();

    // Update the financial metrics section in columns A-B
    // Assuming structure: A1=label, B1=value format
    const updates = [
      {
        range: `'${SHEET_TABS.DASH}'!B1`,
        values: [[data.totalRevenue]]
      },
      {
        range: `'${SHEET_TABS.DASH}'!B2`,
        values: [[data.totalCleanerPay]]
      },
      {
        range: `'${SHEET_TABS.DASH}'!B3`,
        values: [[data.totalRevenue - data.totalCleanerPay - data.monthlyOverhead]]
      },
      {
        range: `'${SHEET_TABS.DASH}'!B4`,
        values: [[data.monthlyOverhead]]
      },
      {
        range: `'${SHEET_TABS.DASH}'!B5`,
        values: [[data.completedJobs]]
      }
    ];

    // Batch update all values
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        data: updates,
        valueInputOption: "USER_ENTERED"
      }
    });

    await stampLastUpdated("Dash Metrics Refresh");
    return true;
  } catch (error) {
    console.error("Failed to update Dash metrics in Google Sheet:", error);
    return false;
  }
}

/**
 * Append a new row to the Verify Payment section on the Dash tab
 * @param data Payment verification data
 * @returns true if successful, false otherwise
 */
export async function syncPaymentVerification(data: {
  date: string;
  jobAddress: string;
  dueAmount: number;
  paymentMethod: string;
  sentInvoice: string; // "Yes" or "No"
}): Promise<boolean> {
  try {
    if (!isGoogleSheetsConfigured()) {
      console.warn(
        "Google Sheets not configured: skipping payment verification sync"
      );
      return false;
    }

    const sheets = getSheetsClient();

    // Row values for Verify Payment section (columns C-J)
    // Columns: Date, Job/Address, Due amount, Method, Sent Invoice, Paid?, Mark as Verified, Notes
    const row = [
      data.date, // Date (Column C)
      data.jobAddress, // Job/Address (Column D)
      data.dueAmount, // Due amount (Column E)
      data.paymentMethod, // Method (Column F)
      data.sentInvoice, // Sent Invoice (Column G)
      "", // Paid? (Column H)
      "", // Mark as Verified (Column I)
      "" // Notes (Column J)
    ];

    // Find the first empty row in the Verify Payment section
    // This typically starts around column C and extends to J
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_TABS.DASH}'!C:J`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row]
      }
    });

    await stampLastUpdated("Payment Verification → Dash");
    return true;
  } catch (error) {
    console.error(
      "Failed to sync payment verification to Google Sheet:",
      error
    );
    return false;
  }
}

interface DashMetrics {
  totalRevenue: number;
  totalCleanerPay: number;
  profit: number;
  monthlyOverhead: number;
  completedJobs: number;
}

/**
 * Read current metrics from the Dash tab
 * @returns Dashboard metrics or null on failure
 */
export async function getDashMetrics(): Promise<DashMetrics | null> {
  try {
    if (!isGoogleSheetsConfigured()) {
      console.warn("Google Sheets not configured: cannot read dash metrics");
      return null;
    }

    const sheets = getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_TABS.DASH}'!A1:B5`
    });

    const values = response.data.values || [];
    if (values.length < 5) {
      return null;
    }

    return {
      totalRevenue: parseFloat(values[0]?.[1]) || 0,
      totalCleanerPay: parseFloat(values[1]?.[1]) || 0,
      profit: parseFloat(values[2]?.[1]) || 0,
      monthlyOverhead: parseFloat(values[3]?.[1]) || 0,
      completedJobs: parseFloat(values[4]?.[1]) || 0
    };
  } catch (error) {
    console.error("Failed to read dash metrics from Google Sheet:", error);
    return null;
  }
}

interface DailyReconciliationRecord {
  date: string;
  payPeriod: string;
  employeeName: string;
  jobNameAddress: string;
  jobType: string;
  serviceType: string;
  expectedHours: number;
  eta: string;
  arrivalTime: string;
  endTime: string;
  loggedHours: number;
  loggedHoursDecimal: number;
  paymentDue: number;
  discount: string;
  afterStripe: number;
  actualRevenue: number;
  paymentMethod: string;
  jobCompleted: string;
  sentInvoice: string;
  paid: string;
  notes: string;
}

/**
 * Read recent records from the Daily Reconciliation tab
 * @param limit Maximum number of rows to return (default 50)
 * @returns Array of reconciliation records, or empty array on failure
 */
export async function getDailyReconciliation(
  limit: number = 50
): Promise<DailyReconciliationRecord[]> {
  try {
    if (!isGoogleSheetsConfigured()) {
      console.warn(
        "Google Sheets not configured: cannot read daily reconciliation"
      );
      return [];
    }

    const sheets = getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_TABS.DAILY_RECONCILIATION}'!A:U`
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      return []; // Only headers or empty
    }

    const records: DailyReconciliationRecord[] = [];

    // Skip header row and process up to limit
    for (let i = 1; i < Math.min(rows.length, limit + 1); i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      records.push({
        date: row[0] || "",
        payPeriod: row[1] || "",
        employeeName: row[2] || "",
        jobNameAddress: row[3] || "",
        jobType: row[4] || "",
        serviceType: row[5] || "",
        expectedHours: parseFloat(row[6]) || 0,
        eta: row[7] || "",
        arrivalTime: row[8] || "",
        endTime: row[9] || "",
        loggedHours: parseFloat(row[10]) || 0,
        loggedHoursDecimal: parseFloat(row[11]) || 0,
        paymentDue: parseFloat(row[12]) || 0,
        discount: row[13] || "",
        afterStripe: parseFloat(row[14]) || 0,
        actualRevenue: parseFloat(row[15]) || 0,
        paymentMethod: row[16] || "",
        jobCompleted: row[17] || "",
        sentInvoice: row[18] || "",
        paid: row[19] || "",
        notes: row[20] || ""
      });
    }

    return records;
  } catch (error) {
    console.error(
      "Failed to read daily reconciliation from Google Sheet:",
      error
    );
    return [];
  }
}

/**
 * Ensure a tab exists in the spreadsheet; create it if missing.
 */
async function ensureTabExists(tabName: string): Promise<void> {
  try {
    const sheets = getSheetsClient();
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      fields: "sheets.properties.title",
    });
    const existing = meta.data.sheets?.map((s) => s.properties?.title) || [];
    if (existing.includes(tabName)) return;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tabName } } }],
      },
    });
    console.log(`[google-sheets] Created new tab: ${tabName}`);
  } catch (err) {
    console.error(`[google-sheets] Failed to ensure tab ${tabName}:`, err);
  }
}

/**
 * Append a call summary row to the "Call Summaries" tab.
 * Auto-creates the tab + header row on first use.
 */
export async function syncCallSummaryToSheet(data: {
  date: string;
  callId: string;
  phoneNumber: string;
  direction: string;
  duration: number;
  customerName: string | null;
  summary: string;
  sentiment: string | null;
  serviceType: string | null;
  followUpNeeded: boolean;
  followUpNotes: string | null;
}): Promise<boolean> {
  try {
    if (!isGoogleSheetsConfigured()) {
      console.warn("[google-sheets] Not configured, skipping call summary sync");
      return false;
    }

    const sheets = getSheetsClient();
    const tabName = SHEET_TABS.CALL_SUMMARIES;

    await ensureTabExists(tabName);

    // Check if header row exists
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${tabName}'!A1:K1`,
    });

    if (!existing.data.values || existing.data.values.length === 0) {
      // Write header row
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${tabName}'!A1:K1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [["Date", "Call ID", "Phone", "Direction", "Duration (s)", "Customer Name", "Summary", "Sentiment", "Service Type", "Follow-Up?", "Follow-Up Notes"]],
        },
      });
    }

    const serviceNames: Record<string, string> = {
      healthy_home: "Healthy Home",
      deep_refresh: "Deep Refresh",
      move_in_out: "Move In/Out",
      commercial: "Commercial",
      pressure_wash: "Pressure Wash",
      auto_detail: "Auto Detail",
    };

    const row = [
      data.date,
      data.callId,
      data.phoneNumber,
      data.direction,
      data.duration,
      data.customerName || "",
      data.summary,
      data.sentiment || "",
      data.serviceType ? (serviceNames[data.serviceType] || data.serviceType) : "",
      data.followUpNeeded ? "YES" : "NO",
      data.followUpNotes || "",
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${tabName}'!A:K`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });

    await stampLastUpdated("Call Summary → Call Summaries");
    return true;
  } catch (error) {
    console.error("[google-sheets] Failed to sync call summary:", error);
    return false;
  }
}

/**
 * Append an estimate row to the "Estimates" tab.
 * Auto-creates the tab + header row on first use.
 */
export async function syncEstimateToSheet(data: {
  date: string;
  callId: string;
  customerName: string | null;
  phoneNumber: string;
  address: string | null;
  sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  serviceType: string | null;
  estimatedCost: number | null;
  sentiment: string | null;
  summary: string;
}): Promise<boolean> {
  try {
    if (!isGoogleSheetsConfigured()) {
      console.warn("[google-sheets] Not configured, skipping estimate sync");
      return false;
    }

    const sheets = getSheetsClient();
    const tabName = SHEET_TABS.ESTIMATES;

    await ensureTabExists(tabName);

    // Check if header row exists
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${tabName}'!A1:L1`,
    });

    if (!existing.data.values || existing.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${tabName}'!A1:L1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [["Date", "Call ID", "Customer Name", "Phone", "Address", "Sqft", "Beds", "Baths", "Service Type", "Estimated Cost", "Sentiment", "Notes"]],
        },
      });
    }

    const serviceNames: Record<string, string> = {
      healthy_home: "Healthy Home",
      deep_refresh: "Deep Refresh",
      move_in_out: "Move In/Out",
      commercial: "Commercial",
      pressure_wash: "Pressure Wash",
      auto_detail: "Auto Detail",
    };

    const row = [
      data.date,
      data.callId,
      data.customerName || "",
      data.phoneNumber,
      data.address || "",
      data.sqft || "",
      data.bedrooms || "",
      data.bathrooms || "",
      data.serviceType ? (serviceNames[data.serviceType] || data.serviceType) : "",
      data.estimatedCost ? `$${data.estimatedCost.toFixed(2)}` : "",
      data.sentiment || "",
      data.summary,
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${tabName}'!A:L`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });

    await stampLastUpdated("Call Estimate → Estimates");
    return true;
  } catch (error) {
    console.error("[google-sheets] Failed to sync estimate:", error);
    return false;
  }
}
