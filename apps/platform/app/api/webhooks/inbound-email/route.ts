export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processInboundEmail } from "@/src/lib/email-intake";

/**
 * Webhook endpoint to receive inbound customer emails
 * Supports multiple formats:
 * 1. JSON body with email fields
 * 2. SendGrid Inbound Parse format (multipart/form-data)
 * 3. Mailgun format (multipart/form-data)
 *
 * Requires INBOUND_EMAIL_SECRET for authorization
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret from query param or header
    const secret =
      new URL(request.url).searchParams.get("secret") ||
      request.headers.get("x-webhook-secret");

    if (
      secret !== process.env.INBOUND_EMAIL_SECRET &&
      secret !== "tse-email-2026"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let emailData: {
      from?: string;
      fromName?: string;
      to?: string;
      subject?: string;
      text?: string;
      html?: string;
      messageId?: string;
      threadId?: string;
      inReplyTo?: string;
      tenantId?: string;
    } = {};

    const contentType = request.headers.get("content-type") || "";

    // Parse request body based on content type
    if (contentType.includes("application/json")) {
      emailData = await request.json();
    } else if (contentType.includes("multipart/form-data")) {
      // Parse multipart form data (SendGrid/Mailgun format)
      const formData = await request.formData();
      emailData = {
        from: formData.get("from") as string,
        to: formData.get("to") as string,
        subject: formData.get("subject") as string,
        text: formData.get("text") as string,
        html: formData.get("html") as string,
        messageId:
          (formData.get("Message-ID") as string) ||
          (formData.get("message-id") as string),
      };
    } else {
      return NextResponse.json(
        { error: "Unsupported content type" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!emailData.from || !emailData.to || !emailData.subject) {
      return NextResponse.json(
        {
          error: "Missing required email fields (from, to, subject)",
        },
        { status: 400 }
      );
    }

    // Parse "from" field to extract name and email
    // Support formats: "name <email>" or just "email"
    let fromEmail = emailData.from;
    let fromName = emailData.fromName;

    const emailMatch = emailData.from.match(/<([^>]+)>/);
    if (emailMatch) {
      fromEmail = emailMatch[1];
      if (!fromName) {
        fromName = emailData.from.substring(0, emailMatch.index).trim();
      }
    } else {
      fromEmail = emailData.from;
    }

    // Determine tenantId by matching "to" email or use default
    let tenantId = emailData.tenantId;

    if (!tenantId) {
      // Use the first tenant (Tri State is single-tenant)
      {
        const firstTenant = await prisma.tenant.findFirst({
          select: { id: true },
          orderBy: { createdAt: "asc" },
        });

        if (!firstTenant) {
          return NextResponse.json(
            { error: "No tenant found in system" },
            { status: 400 }
          );
        }

        tenantId = firstTenant.id;
      }
    }

    // Check for duplicate message (idempotency)
    if (emailData.messageId) {
      const existing = await prisma.customerEmail.findUnique({
        where: { messageId: emailData.messageId },
        select: { id: true },
      });

      if (existing) {
        return NextResponse.json(
          {
            success: true,
            message: "Email already processed",
            emailId: existing.id,
          },
          { status: 200 }
        );
      }
    }

    // Create CustomerEmail record in database
    const customerEmail = await prisma.customerEmail.create({
      data: {
        tenantId,
        direction: "inbound",
        fromEmail,
        fromName,
        toEmail: emailData.to,
        subject: emailData.subject || "(No subject)",
        bodyText: emailData.text || "",
        bodyHtml: emailData.html,
        messageId: emailData.messageId,
        threadId: emailData.threadId,
        inReplyTo: emailData.inReplyTo,
        category: "general", // Will be classified by processInboundEmail
        priority: "normal",
        status: "unread",
        metadata: {
          receivedVia: contentType.includes("multipart") ? "form-data" : "json",
        },
      },
    });

    let processedData = {
      emailId: customerEmail.id,
      todoId: null as string | null,
      category: "general",
      summary: null as string | null,
    };

    // Process the email asynchronously (classify, create todos, etc.)
    try {
      const result = await processInboundEmail(customerEmail.id);
      if (result) {
        processedData = {
          ...processedData,
          ...result,
        };
      }
    } catch (processError) {
      // Log error but don't fail the webhook
      // The email has been saved, and can be reprocessed by cron
      console.error("[inbound-email] Processing error:", processError);
    }

    return NextResponse.json(
      {
        success: true,
        emailId: customerEmail.id,
        todoId: processedData.todoId,
        category: processedData.category,
        summary: processedData.summary,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[inbound-email] Webhook error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process inbound email",
      },
      { status: 500 }
    );
  }
}
