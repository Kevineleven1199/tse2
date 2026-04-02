import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";


export const dynamic = "force-dynamic";

const createCustomerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

interface CustomerWithStats {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  address?: string;
  totalJobs: number;
  totalSpent: number;
  lastService?: string;
  status: "Active" | "Inactive" | "New";
  tags: string[];
  createdAt: string;
}

interface StatsData {
  totalCustomers: number;
  activeThisMonth: number;
  avgLifetimeValue: number;
  churnRate: number;
}

// Helper function to determine customer status based on job history
function determineCustomerStatus(
  lastServiceDate: Date | null,
  createdDate: Date
): "Active" | "Inactive" | "New" {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (!lastServiceDate) {
    // No jobs yet - check if created in last 30 days
    return createdDate > thirtyDaysAgo ? "New" : "Inactive";
  }

  // Has jobs - check if recent
  return lastServiceDate > ninetyDaysAgo ? "Active" : "Inactive";
}

export async function GET(request: NextRequest) {
  try {
    // Check session and authorization
    const session = await getSession();

    if (!session || session.role !== "HQ") {
      return NextResponse.json(
        { error: "Unauthorized - HQ access required" },
        { status: 403 }
      );
    }

    const tenantId = session.tenantId;

    // Get query parameters for filtering and sorting
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const sortBy = searchParams.get("sortBy") || "name";
    const sortDir = searchParams.get("sortDir") || "asc";

    // Fetch customers from database
    const users = await prisma.user.findMany({
      where: {
        tenantId,
        role: "CUSTOMER",
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
            { lastName: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
            { email: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
            { phone: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
          ],
        }),
      },
    });

    // Fetch service requests for these customers
    const allRequests = await prisma.serviceRequest.findMany({
      where: {
        tenantId,
        customerEmail: {
          in: users.map((u) => u.email),
        },
      },
      include: {
        job: {
          select: {
            id: true,
            payoutAmount: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Build customer list with stats
    const customers: CustomerWithStats[] = users.map((user) => {
      const userRequests = allRequests.filter((r) => r.customerEmail === user.email);
      const totalJobs = userRequests.filter((r) => r.job).length;
      const totalSpent = userRequests
        .filter((r) => r.job)
        .reduce((sum, r) => sum + (r.job?.payoutAmount || 0), 0);
      const lastService = userRequests.find((r) => r.job)?.createdAt || null;

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        totalJobs,
        totalSpent,
        lastService: lastService?.toISOString(),
        status: determineCustomerStatus(lastService, user.createdAt),
        tags: determineCustomerTags(userRequests),
        createdAt: user.createdAt.toISOString(),
      };
    });

    // Apply status filter if provided
    let filtered = customers;
    if (status) {
      filtered = customers.filter((c) => c.status === status);
    }

    // Calculate stats
    const stats: StatsData = {
      totalCustomers: customers.length,
      activeThisMonth: customers.filter((c) => c.status === "Active").length,
      avgLifetimeValue: customers.length > 0
        ? customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length
        : 0,
      churnRate: 0,
    };

    return NextResponse.json({
      customers: filtered,
      stats,
      total: filtered.length,
    });
  } catch (error) {
    console.error("[GET /api/admin/customers] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check session and authorization
    const session = await getSession();

    if (!session || session.role !== "HQ") {
      return NextResponse.json(
        { error: "Unauthorized - HQ access required" },
        { status: 403 }
      );
    }

    const tenantId = session.tenantId;

    const json = await request.json();
    const payload = createCustomerSchema.parse(json);

    // Check if email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: payload.email,
        tenantId,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Create new customer user
    const customer = await prisma.user.create({
      data: {
        tenantId,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        role: "CUSTOMER",
        status: "active",
      },
    });

    return NextResponse.json(
      {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        message: "Customer created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/admin/customers] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.flatten() },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}

// Helper function to determine customer tags based on service history
function determineCustomerTags(
  requests: Array<{ job: { id: string; payoutAmount: number | null } | null; createdAt: Date }>
): string[] {
  const tags: string[] = [];

  // VIP if they have 15+ jobs
  if (requests.filter((r) => r.job).length >= 15) {
    tags.push("VIP");
  }

  // Recurring if they have 4+ jobs
  if (requests.filter((r) => r.job).length >= 4) {
    tags.push("Recurring");
  }

  return tags;
}
