/**
 * Database Health Check — GET /api/admin/db-health
 *
 * Shows table row counts and last-activity timestamps so you can verify
 * data is persisting across deploys. HQ-only access.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "HQ") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Run all counts concurrently for speed
    const [
      users,
      jobs,
      serviceRequests,
      quotes,
      callTranscripts,
      crmLeads,
      todoItems,
      paymentRecords,
      invoices,
      cleanerProfiles,
      recurringSchedules,
      smsMessages,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.job.count(),
      prisma.serviceRequest.count(),
      prisma.quote.count(),
      prisma.callTranscript.count(),
      prisma.crmLead.count(),
      prisma.todoItem.count(),
      prisma.paymentRecord.count(),
      prisma.invoice.count(),
      prisma.cleanerProfile.count(),
      prisma.recurringSchedule.count(),
      prisma.smsMessage.count().catch(() => 0), // May not exist yet
    ]);

    // Get the most recent record from key tables
    const [lastJob, lastTranscript, lastLead, lastTodo] = await Promise.all([
      prisma.job.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      prisma.callTranscript.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      prisma.crmLead.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      prisma.todoItem.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    ]);

    return NextResponse.json({
      connected: true,
      checkedAt: new Date().toISOString(),
      tables: {
        users,
        jobs,
        serviceRequests,
        quotes,
        callTranscripts,
        crmLeads,
        todoItems,
        paymentRecords,
        invoices,
        cleanerProfiles,
        recurringSchedules,
        smsMessages,
      },
      lastActivity: {
        lastJob: lastJob?.createdAt?.toISOString() ?? null,
        lastTranscript: lastTranscript?.createdAt?.toISOString() ?? null,
        lastCrmLead: lastLead?.createdAt?.toISOString() ?? null,
        lastTodo: lastTodo?.createdAt?.toISOString() ?? null,
      },
      env: {
        DATABASE_URL: process.env.DATABASE_URL ? "✅ set" : "❌ MISSING",
        DEFAULT_TENANT_ID: process.env.DEFAULT_TENANT_ID ? `✅ ${process.env.DEFAULT_TENANT_ID}` : "❌ MISSING",
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "✅ set" : "⚠️ not set",
        SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ? "✅ set" : "⚠️ not set",
        OPENPHONE_API_KEY: process.env.OPENPHONE_API_KEY ? "✅ set" : "❌ MISSING",
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? "✅ set" : "⚠️ not set",
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      error: error.message,
      checkedAt: new Date().toISOString(),
    }, { status: 500 });
  }
}
