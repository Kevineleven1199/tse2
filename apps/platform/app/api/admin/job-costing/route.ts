import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

const createJobCostSchema = z.object({
  jobId: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().positive(),
});

type CreateJobCostInput = z.infer<typeof createJobCostSchema>;

interface JobCostData {
  id: string;
  jobId: string;
  category: string;
  description: string;
  amount: number;
  createdAt: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !["HQ", "MANAGER"].includes(session.role || "")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const tenantId = session.tenantId;
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get("jobId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const jobIdFilter = jobId ? { jobId } : {};
    const where = { tenantId, ...jobIdFilter };

    const costs = await prisma.jobCost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.jobCost.count({ where });

    return NextResponse.json({
      costs,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Get job costs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch job costs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !["HQ", "MANAGER"].includes(session.role || "")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { jobId, category, description, amount } =
      createJobCostSchema.parse(body);

    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    const cost = await prisma.jobCost.create({
      data: {
        jobId,
        tenantId: job.tenantId,
        category,
        description,
        amount,
      },
    });

    return NextResponse.json({
      success: true,
      cost,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Create job cost error:", error);
    return NextResponse.json(
      { error: "Failed to create job cost" },
      { status: 500 }
    );
  }
}
