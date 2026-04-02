import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

interface TimelineEvent {
  id: string;
  type: "email" | "sms" | "call" | "activity" | "payment" | "job";
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession({ roles: ["HQ", "MANAGER"] });
    const { id } = await params;

    // Get the client (User)
    const client = await prisma.user.findFirst({
      where: { id, tenantId: session.tenantId },
      select: { id: true, email: true, phone: true, firstName: true, lastName: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const timeline: TimelineEvent[] = [];

    // 1. Get audit log entries for this client
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        tenantId: session.tenantId,
        OR: [
          { actorId: id },
          { metadata: { path: ["email"], equals: client.email } },
          { metadata: { path: ["customerId"], equals: id } },
          { metadata: { path: ["customerEmail"], equals: client.email } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    for (const log of auditLogs) {
      const meta = (log.metadata || {}) as Record<string, any>;
      timeline.push({
        id: `audit-${log.id}`,
        type: "activity",
        title: formatAuditAction(log.action),
        description: meta.description || log.action,
        timestamp: log.createdAt.toISOString(),
        metadata: meta,
      });
    }

    // 2. Get call transcripts for this client's phone/email
    if (client.phone || client.email) {
      const phoneFilter = client.phone
        ? [
            {
              phoneNumber: {
                contains: client.phone.replace(/\D/g, "").slice(-10),
              },
            },
            {
              fromNumber: {
                contains: client.phone.replace(/\D/g, "").slice(-10),
              },
            },
            {
              toNumber: {
                contains: client.phone.replace(/\D/g, "").slice(-10),
              },
            },
          ]
        : [];

      const emailFilter = client.email
        ? [
            {
              customerEmail: client.email,
            },
          ]
        : [];

      const calls = await prisma.callTranscript.findMany({
        where: {
          tenantId: session.tenantId,
          OR: [...phoneFilter, ...emailFilter],
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      for (const call of calls) {
        const durationSeconds = call.duration || 0;
        timeline.push({
          id: `call-${call.id}`,
          type: "call",
          title: `${call.direction === "inbound" ? "Incoming" : "Outgoing"} Call`,
          description: call.summary || `${Math.round(durationSeconds / 60)}min call`,
          timestamp: call.createdAt.toISOString(),
          metadata: {
            duration: durationSeconds,
            sentiment: call.sentiment,
            transcript: call.transcript?.substring(0, 500),
            callId: call.callId,
          },
        });
      }
    }

    // 3. Get service requests for this client
    const requests = await prisma.serviceRequest.findMany({
      where: {
        tenantId: session.tenantId,
        customerEmail: client.email,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        job: { select: { id: true, status: true, scheduledStart: true } },
        payments: { select: { id: true, amount: true, status: true, createdAt: true } },
      },
    });

    for (const req of requests) {
      timeline.push({
        id: `request-${req.id}`,
        type: "job",
        title: `Service Request: ${req.serviceType}`,
        description: `${req.status} - ${req.addressLine1}, ${req.city}`,
        timestamp: req.createdAt.toISOString(),
        metadata: {
          requestId: req.id,
          status: req.status,
          serviceType: req.serviceType,
          address: `${req.addressLine1}, ${req.city}, ${req.state}`,
          driveFolderUrl: req.driveFolderUrl,
        },
      });

      // Add payment events
      for (const payment of req.payments) {
        timeline.push({
          id: `payment-${payment.id}`,
          type: "payment",
          title: `Payment ${payment.status}`,
          description: `$${(payment.amount / 100).toFixed(2)}`,
          timestamp: payment.createdAt.toISOString(),
          metadata: { amount: payment.amount, status: payment.status },
        });
      }
    }

    // Sort all events by timestamp descending
    timeline.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({
      client: {
        id: client.id,
        name: `${client.firstName || ""} ${client.lastName || ""}`.trim() || client.email,
        email: client.email,
        phone: client.phone,
      },
      timeline,
      total: timeline.length,
    });
  } catch (error) {
    console.error("Timeline error:", error);
    return NextResponse.json(
      { error: "Failed to load timeline" },
      { status: 500 }
    );
  }
}

function formatAuditAction(action: string): string {
  const map: Record<string, string> = {
    "payment.succeeded": "Payment Received",
    "payment.failed": "Payment Failed",
    "charge.refunded": "Refund Processed",
    "invoice.sent": "Invoice Sent",
    "invoice.viewed": "Invoice Viewed",
    "invoice.paid": "Invoice Paid",
    "quote.sent": "Quote Sent",
    "quote.accepted": "Quote Accepted",
    "quote.declined": "Quote Declined",
    "email.sent": "Email Sent",
    "email.opened": "Email Opened",
    "sms.sent": "SMS Sent",
    "sms.received": "SMS Received",
    "review.requested": "Review Requested",
    "review.submitted": "Review Submitted",
    "portal.login": "Customer Portal Login",
    "job.completed": "Job Completed",
    "job.scheduled": "Job Scheduled",
  };
  return (
    map[action] ||
    action
      .replace(/[._]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
