export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

/**
 * Admin API for single customer email operations
 * GET: Retrieve full email detail with related info
 * PUT: Update email (status, category, notes, etc.)
 * POST: Create a todo from this email
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["HQ", "MANAGER"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const email = await prisma.customerEmail.findUnique({ where: { id } });
    if (!email) return NextResponse.json({ error: "Email not found" }, { status: 404 });
    if (session.role === "MANAGER" && email.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch related data separately (CustomerEmail has no Prisma relations)
    const [customer, job, serviceRequest, linkedTodo] = await Promise.all([
      email.customerId
        ? prisma.user.findUnique({
            where: { id: email.customerId },
            select: { id: true, email: true, firstName: true, lastName: true, phone: true },
          })
        : null,
      email.jobId
        ? prisma.job.findUnique({
            where: { id: email.jobId },
            select: { id: true, status: true, scheduledStart: true, requestId: true },
          })
        : null,
      email.requestId
        ? prisma.serviceRequest.findUnique({
            where: { id: email.requestId },
            select: { id: true, serviceType: true, status: true, customerName: true, addressLine1: true, city: true, preferredStart: true },
          })
        : null,
      prisma.todoItem.findFirst({
        where: { relatedId: email.id, relatedType: "customer_email" },
        select: { id: true, title: true, completed: true, priority: true, dueDate: true },
      }),
    ]);

    // Mark as read if unread
    if (email.status === "unread") {
      await prisma.customerEmail.update({ where: { id }, data: { status: "read" } });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...email,
        customer: customer ? { ...customer, name: `${customer.firstName} ${customer.lastName}`.trim() } : null,
        job,
        serviceRequest,
        linkedTodo,
      },
    });
  } catch (error) {
    console.error("[customer-emails/[id]] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch email" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["HQ", "MANAGER"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const email = await prisma.customerEmail.findUnique({ where: { id }, select: { tenantId: true, metadata: true } });
    if (!email) return NextResponse.json({ error: "Email not found" }, { status: 404 });
    if (session.role === "MANAGER" && email.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { status, category, priority, customerId, jobId, requestId, notes } = body;

    const updateData: Record<string, unknown> = {};

    if (status && ["unread", "read", "actioned", "archived"].includes(status)) updateData.status = status;
    if (category && ["reschedule", "cancellation", "question", "complaint", "feedback", "quote_request", "payment", "general"].includes(category)) updateData.category = category;
    if (priority && ["urgent", "high", "normal", "low"].includes(priority)) updateData.priority = priority;
    if (customerId !== undefined) updateData.customerId = customerId;
    if (jobId !== undefined) updateData.jobId = jobId;
    if (requestId !== undefined) updateData.requestId = requestId;
    if (notes !== undefined) {
      const existingMeta = (email.metadata as Record<string, unknown>) || {};
      updateData.metadata = { ...existingMeta, notes, notesUpdatedAt: new Date().toISOString() };
    }

    const updated = await prisma.customerEmail.update({ where: { id }, data: updateData });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[customer-emails/[id]] PUT error:", error);
    return NextResponse.json({ error: "Failed to update email" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["HQ", "MANAGER"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const email = await prisma.customerEmail.findUnique({ where: { id } });
    if (!email) return NextResponse.json({ error: "Email not found" }, { status: 404 });
    if (session.role === "MANAGER" && email.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, priority: todoPriority, dueDate, assignTo } = body;

    // Create TodoItem linked to this email
    const todo = await prisma.todoItem.create({
      data: {
        tenantId: email.tenantId,
        userId: session.userId,
        title: title || `📧 ${email.category === "reschedule" ? "Reschedule" : email.category === "cancellation" ? "Cancellation" : "Follow up"}: ${email.customerName || email.fromName || email.fromEmail}`,
        description: description || `Customer email: "${email.subject}"\n\n${email.aiSummary || email.bodyText?.slice(0, 200) || ""}`,
        priority: todoPriority === "urgent" ? 1 : todoPriority === "high" ? 1 : todoPriority === "low" ? 3 : 2,
        dueDate: dueDate ? new Date(dueDate) : email.category === "reschedule" || email.category === "cancellation" ? new Date() : undefined,
        isShared: true,
        assignedTo: assignTo || session.userId,
        category: email.category,
        relatedId: email.id,
        relatedType: "customer_email",
      },
    });

    // Mark email as todo created + actioned
    await prisma.customerEmail.update({
      where: { id },
      data: { todoCreated: true, status: "actioned" },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId: email.tenantId,
        actorId: session.userId,
        action: "email.todo_created",
        metadata: {
          emailId: email.id,
          todoId: todo.id,
          category: email.category,
          customerEmail: email.fromEmail,
          subject: email.subject,
        },
      },
    });

    return NextResponse.json({ success: true, data: { todoId: todo.id, emailId: email.id } }, { status: 201 });
  } catch (error) {
    console.error("[customer-emails/[id]] POST error:", error);
    return NextResponse.json({ error: "Failed to create todo" }, { status: 500 });
  }
}
