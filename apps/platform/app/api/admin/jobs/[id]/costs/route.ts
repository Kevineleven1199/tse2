export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import { NextRequest, NextResponse } from "next/server";

interface CostBreakdown {
  cleanerName: string;
  hours: number;
  rate: number;
  cost: number;
}

interface CostsResponse {
  jobId: string;
  revenue: number;
  costs: {
    labor: number;
    supplies: number;
    travel: number;
    overhead: number;
    total: number;
  };
  profit: number;
  margin: number;
  breakdown: CostBreakdown[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await requireSession();

    // Check authorization - only HQ or MANAGER
    if (session.role !== "HQ" && session.role !== "MANAGER") {
      return NextResponse.json(
        { error: "Unauthorized - HQ or MANAGER access required" },
        { status: 403 }
      );
    }

    const { id: jobId } = await params;

    // Verify job exists and belongs to user's tenant
    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        tenantId: session.tenantId,
      },
      include: {
        request: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Calculate revenue from PaymentRecord linked to the ServiceRequest
    const paymentRecords = await prisma.paymentRecord.findMany({
      where: {
        requestId: job.requestId,
        status: {
          in: ["CAPTURED", "AUTHORIZED"], // Only count actual/authorized payments
        },
      },
    });

    const revenue = paymentRecords.reduce((sum, payment) => sum + payment.amount, 0);

    // Calculate labor costs from Timesheet entries
    const timesheets = await prisma.timesheet.findMany({
      where: {
        jobId: jobId,
      },
      include: {
        cleaner: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            hourlyRate: true,
          },
        },
      },
    });

    let laborCost = 0;
    const breakdown: CostBreakdown[] = [];

    for (const timesheet of timesheets) {
      if (timesheet.hoursWorked && timesheet.hoursWorked > 0) {
        const rate = timesheet.cleaner.hourlyRate || 25; // Default to $25/hour
        const cost = timesheet.hoursWorked * rate;
        laborCost += cost;

        const cleanerName = `${timesheet.cleaner.user.firstName} ${timesheet.cleaner.user.lastName}`;
        breakdown.push({
          cleanerName,
          hours: timesheet.hoursWorked,
          rate: rate,
          cost: cost,
        });
      }
    }

    // Get supply costs from JobCost entries
    const supplyCosts = await prisma.jobCost.findMany({
      where: {
        jobId: jobId,
        category: "supplies",
      },
    });

    const supplyCost = supplyCosts.reduce((sum, cost) => sum + cost.amount, 0);

    // Get travel costs from JobCost entries
    const travelCosts = await prisma.jobCost.findMany({
      where: {
        jobId: jobId,
        category: "travel",
      },
    });

    const travelCost = travelCosts.reduce((sum, cost) => sum + cost.amount, 0);

    // Calculate overhead as 15% of labor cost
    const overheadPercentage = 0.15;
    const overheadCost = laborCost * overheadPercentage;

    // Calculate totals
    const totalCosts = laborCost + supplyCost + travelCost + overheadCost;
    const profit = revenue - totalCosts;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    const response: CostsResponse = {
      jobId: jobId,
      revenue: parseFloat(revenue.toFixed(2)),
      costs: {
        labor: parseFloat(laborCost.toFixed(2)),
        supplies: parseFloat(supplyCost.toFixed(2)),
        travel: parseFloat(travelCost.toFixed(2)),
        overhead: parseFloat(overheadCost.toFixed(2)),
        total: parseFloat(totalCosts.toFixed(2)),
      },
      profit: parseFloat(profit.toFixed(2)),
      margin: parseFloat(margin.toFixed(2)),
      breakdown: breakdown,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching job costs:", error);
    return NextResponse.json(
      { error: "Failed to fetch job costs" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await requireSession();

    // Check authorization - only HQ or MANAGER
    if (session.role !== "HQ" && session.role !== "MANAGER") {
      return NextResponse.json(
        { error: "Unauthorized - HQ or MANAGER access required" },
        { status: 403 }
      );
    }

    const { id: jobId } = await params;
    const body = await request.json();

    const { category, amount, description } = body;

    // Validate input
    if (!category || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: category, amount" },
        { status: 400 }
      );
    }

    const validCategories = ["labor", "supplies", "travel", "other"];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        {
          error: `Invalid category. Must be one of: ${validCategories.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Verify job exists and belongs to user's tenant
    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        tenantId: session.tenantId,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Create the cost entry
    const jobCost = await prisma.jobCost.create({
      data: {
        tenantId: session.tenantId,
        jobId: jobId,
        category: category,
        amount: parseFloat(amount),
        description: description || "",
        createdBy: session.userId,
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorId: session.userId,
        action: "job.cost_added",
        metadata: {
          jobId: jobId,
          costId: jobCost.id,
          category: category,
          amount: amount,
          description: description || "",
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Cost entry added successfully",
        costId: jobCost.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding job cost:", error);
    return NextResponse.json(
      { error: "Failed to add cost entry" },
      { status: 500 }
    );
  }
}
