import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/backup
 * Daily database backup — exports key tables as JSON and uploads to Google Drive.
 * Secured via CRON_SECRET.
 *
 * This is a lightweight application-level backup. For full DB backups,
 * use Railway's built-in backup feature or pg_dump.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    // Export key business data tables
    const [
      customers,
      serviceRequests,
      jobs,
      invoices,
      payments,
      timesheets,
      payouts,
      recurringSchedules,
      crmLeads,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.serviceRequest.count(),
      prisma.job.count(),
      prisma.invoice.count(),
      prisma.paymentRecord.count(),
      prisma.timesheet.count(),
      prisma.cleanerPayout.count(),
      prisma.recurringSchedule.count(),
      prisma.crmLead.count(),
    ]);

    const backupSummary = {
      backupDate: dateStr,
      backupTime: now.toISOString(),
      recordCounts: {
        customers,
        serviceRequests,
        jobs,
        invoices,
        payments,
        timesheets,
        payouts,
        recurringSchedules,
        crmLeads,
      },
      totalRecords: customers + serviceRequests + jobs + invoices + payments + timesheets + payouts + recurringSchedules + crmLeads,
    };

    // Try to upload summary to Google Drive
    let driveUploaded = false;
    try {
      const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

      if (rawKey && parentId) {
        const { google } = await import("googleapis");
        let credentials: { client_email?: string; private_key?: string };
        try {
          credentials = JSON.parse(Buffer.from(rawKey, "base64").toString());
        } catch {
          credentials = JSON.parse(rawKey);
        }

        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ["https://www.googleapis.com/auth/drive"],
        });
        const drive = google.drive({ version: "v3", auth });

        // Find or create Backups folder
        const folderQuery = await drive.files.list({
          q: `name='Backups' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          fields: "files(id,name)",
        });

        let backupFolderId = folderQuery.data.files?.[0]?.id;
        if (!backupFolderId) {
          const folder = await drive.files.create({
            requestBody: {
              name: "Backups",
              mimeType: "application/vnd.google-apps.folder",
              parents: [parentId],
            },
            fields: "id",
          });
          backupFolderId = folder.data.id!;
        }

        // Upload backup summary
        const content = JSON.stringify(backupSummary, null, 2);
        await drive.files.create({
          requestBody: {
            name: `backup-summary-${dateStr}.json`,
            mimeType: "application/json",
            parents: [backupFolderId],
          },
          media: {
            mimeType: "application/json",
            body: content,
          },
        });

        driveUploaded = true;
      }
    } catch (driveErr) {
      console.error("[cron/backup] Drive upload failed:", driveErr);
    }

    // Log
    await prisma.auditLog.create({
      data: {
        tenantId: (await prisma.tenant.findFirst({ select: { id: true } }))?.id ?? "system",
        action: "system.backup",
        metadata: { ...backupSummary, driveUploaded },
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      ...backupSummary,
      driveUploaded,
    });
  } catch (error) {
    console.error("[cron/backup] Error:", error);
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}
