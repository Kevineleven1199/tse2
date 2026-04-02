import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { optimizeRoute } from "@/src/lib/route-optimizer";

export const dynamic = "force-dynamic";

const optimizeRouteSchema = z.object({
  jobIds: z.array(z.string()).min(1).max(100),
});

type OptimizeRouteInput = z.infer<typeof optimizeRouteSchema>;

interface JobWithLocation {
  id: string;
  addressLine1: string;
  city: string;
  state: string;
  lat?: number;
  lng?: number;
}

// POST — optimize route for given job IDs
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const json = await request.json();
    const { jobIds } = optimizeRouteSchema.parse(json);

    // Fetch jobs with their related service request details
    const jobs = await prisma.job.findMany({
      where: { id: { in: jobIds } },
      include: {
        request: {
          select: {
            addressLine1: true,
            city: true,
            state: true,
            lat: true,
            lng: true,
          },
        },
      },
    });

    // Validate that all jobs were found
    if (jobs.length !== jobIds.length) {
      return NextResponse.json(
        { error: "Some jobs not found" },
        { status: 404 }
      );
    }

    // Extract job data with location from service request
    const jobsData = jobs.map((job) => ({
      id: job.id,
      addressLine1: job.request.addressLine1,
      city: job.request.city,
      state: job.request.state,
      lat: job.request.lat,
      lng: job.request.lng,
    }));

    // Check that all jobs have coordinates
    const jobsWithCoords = jobsData.filter((j) => j.lat && j.lng) as JobWithLocation[];

    if (jobsWithCoords.length === 0) {
      return NextResponse.json(
        {
          error: "No jobs have coordinates",
          optimizedRoute: [],
        },
        { status: 400 }
      );
    }

    // Optimize the route
    const optimized = optimizeRoute(
      jobsWithCoords.map((j) => ({
        id: j.id,
        location: {
          lat: j.lat!,
          lng: j.lng!,
        },
      }))
    );

    // Enrich with job details
    const jobMap = new Map(jobsData.map((j) => [j.id, j]));
    const result = optimized.map((opt) => {
      const job = jobMap.get(opt.id);
      return {
        ...opt,
        address: job
          ? `${job.addressLine1}, ${job.city}, ${job.state}`
          : "Unknown",
      };
    });

    return NextResponse.json({
      optimizedRoute: result,
      totalDistance: result[result.length - 1]?.cumulativeDistanceMiles || 0,
      estimatedTotalTime: result.reduce(
        (sum, r) => sum + r.estimatedDriveTimeMinutes,
        0
      ),
    });
  } catch (error) {
    console.error("[POST /api/admin/route-optimize] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.flatten() },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: "Failed to optimize route" },
      { status: 500 }
    );
  }
}
