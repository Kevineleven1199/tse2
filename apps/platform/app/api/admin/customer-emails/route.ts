export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

/**
 * Admin API for listing and managing customer emails
 * 
 * GET: List customer emails with filters
 * PUT: Update email status in bulk
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only HQ and MANAGER roles can access
    if (!["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const status = searchParams.get("status") || undefined;
    const category = searchParams.get("category") || undefined;
    const from = searchParams.get("from") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const tenantId =
      session.role === "HQ"
        ? searchParams.get("tenantId") || undefined
        : session.tenantId;
    const priority = searchParams.get("priority") || undefined;
    const search = searchParams.get("search")?.toLowerCase() || undefined;

    // Build where clause
    const where: any = {
      tenantId,
    };

    if (status && ["unread", "read", "actioned", "archived"].includes(status)) {
      where.status = status;
    }

    if (
      category &&
      [
        "reschedule",
        "cancellation",
        "question",
        "complaint",
        "feedback",
        "quote_request",
        "payment",
        "general",
      ].includes(category)
    ) {
      where.category = category;
    }

    if (priority && ["urgent", "high", "normal", "low"].includes(priority)) {
      where.priority = priority;
    }

    if (from) {
      where.fromEmail = {
        contains: from.toLowerCase(),
        mode: "insensitive",
      };
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: "insensitive" } },
        { bodyText: { contains: search, mode: "insensitive" } },
        { fromEmail: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
      ];
    }

    // Query emails
    const [emails, total] = await Promise.all([
      prisma.customerEmail.findMany({
        where,
        select: {
          id: true,
          fromEmail: true,
          fromName: true,
          subject: true,
          category: true,
          priority: true,
          status: true,
          customerName: true,
          customerId: true,
          jobId: true,
          requestId: true,
          aiSummary: true,
          createdAt: true,
          updatedAt: true,
          processedAt: true,
          todoCreated: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.customerEmail.count({ where }),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: emails,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[admin/customer-emails] GET error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch customer emails",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Require authentication
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only HQ and MANAGER roles can access
    if (!["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { ids, status } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid ids array" },
        { status: 400 }
      );
    }

    if (!status || !["unread", "read", "actioned", "archived"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Verify all emails belong to user's tenant (if not HQ)
    if (session.role !== "HQ") {
      const emailsInTenant = await prisma.customerEmail.count({
        where: {
          id: { in: ids },
          tenantId: session.tenantId,
        },
      });

      if (emailsInTenant !== ids.length) {
        return NextResponse.json(
          { error: "Some emails do not belong to your tenant" },
          { status: 403 }
        );
      }
    }

    // Update emails
    const result = await prisma.customerEmail.updateMany({
      where: { id: { in: ids } },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        updatedCount: result.count,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[admin/customer-emails] PUT error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update emails",
      },
      { status: 500 }
    );
  }
}
