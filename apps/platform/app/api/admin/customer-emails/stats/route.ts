export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { NextResponse } from "next/server";

interface CategoryCounts {
  [key: string]: number;
}

interface RecentEmail {
  id: string;
  fromName: string | null;
  subject: string;
  category: string;
  priority: string;
  createdAt: string;
  status: string;
}

interface EmailStatsResponse {
  unreadCount: number;
  urgentCount: number;
  todayCount: number;
  byCategory: CategoryCounts;
  recentEmails: RecentEmail[];
}

export async function GET() {
  try {
    const session = await getSession();

    // Authorization check - only HQ/MANAGER can access
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json(
        { error: "Unauthorized - HQ/MANAGER access required" },
        { status: 403 }
      );
    }

    const tenantId = session.tenantId;

    // Get today's start time
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Query all customer emails for the tenant
    const allEmails = await prisma.customerEmail.findMany({
      where: { tenantId },
      select: {
        id: true,
        fromName: true,
        fromEmail: true,
        subject: true,
        category: true,
        priority: true,
        status: true,
        createdAt: true,
      },
    });

    // Calculate metrics
    const unreadCount = allEmails.filter(
      (e) => e.status !== "read" && e.status !== "archived"
    ).length;

    const urgentCount = allEmails.filter(
      (e) =>
        e.priority === "urgent" &&
        e.status !== "read" &&
        e.status !== "archived"
    ).length;

    const todayCount = allEmails.filter(
      (e) => e.createdAt >= today
    ).length;

    // Count by category
    const byCategory: CategoryCounts = {};
    allEmails.forEach((email) => {
      const cat = email.category || "general";
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    // Get recent emails (last 5)
    const recentEmails: RecentEmail[] = allEmails
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5)
      .map((email) => ({
        id: email.id,
        fromName: email.fromName,
        subject: email.subject,
        category: email.category,
        priority: email.priority,
        createdAt: email.createdAt.toISOString(),
        status: email.status || "received",
      }));

    const response: EmailStatsResponse = {
      unreadCount,
      urgentCount,
      todayCount,
      byCategory,
      recentEmails,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Customer email stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch email statistics" },
      { status: 500 }
    );
  }
}
