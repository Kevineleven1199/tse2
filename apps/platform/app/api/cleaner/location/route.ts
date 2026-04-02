import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

const updateLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  heading: z.number().optional(),
  speed: z.number().optional(),
});

type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

// POST — cleaner updates their current location
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "CLEANER") {
      return NextResponse.json(
        { error: "Unauthorized - cleaner access required" },
        { status: 403 }
      );
    }

    const json = await request.json();
    const payload = updateLocationSchema.parse(json);

    // Get cleaner profile
    const cleaner = await prisma.cleanerProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });

    if (!cleaner) {
      return NextResponse.json(
        { error: "Cleaner profile not found" },
        { status: 404 }
      );
    }

    // Save location
    const location = await prisma.cleanerLocation.create({
      data: {
        tenantId: session.tenantId,
        cleanerId: cleaner.id,
        lat: payload.lat,
        lng: payload.lng,
        accuracy: payload.accuracy,
        heading: payload.heading,
        speed: payload.speed,
      },
    });

    return NextResponse.json(
      {
        id: location.id,
        lat: location.lat,
        lng: location.lng,
        recordedAt: location.recordedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/cleaner/location] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid location data", details: error.flatten() },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update location" },
      { status: 500 }
    );
  }
}

// GET — get cleaner's last recorded location
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["CLEANER", "HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Get cleaner ID from query param or from session if cleaner
    const cleanerId = request.nextUrl.searchParams.get("cleanerId");

    if (session.role === "CLEANER" && !cleanerId) {
      // Cleaner fetching their own location
      const cleaner = await prisma.cleanerProfile.findUnique({
        where: { userId: session.userId },
        select: { id: true },
      });

      if (!cleaner) {
        return NextResponse.json(
          { error: "Cleaner profile not found" },
          { status: 404 }
        );
      }

      const location = await prisma.cleanerLocation.findFirst({
        where: { cleanerId: cleaner.id },
        orderBy: { recordedAt: "desc" },
        take: 1,
      });

      if (!location) {
        return NextResponse.json({ location: null });
      }

      return NextResponse.json({
        location: {
          id: location.id,
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy,
          heading: location.heading,
          speed: location.speed,
          recordedAt: location.recordedAt.toISOString(),
        },
      });
    } else if (cleanerId && (session.role === "HQ" || session.role === "MANAGER")) {
      // Admin/manager fetching specific cleaner's location
      const location = await prisma.cleanerLocation.findFirst({
        where: { cleanerId },
        orderBy: { recordedAt: "desc" },
        take: 1,
      });

      if (!location) {
        return NextResponse.json({ location: null });
      }

      return NextResponse.json({
        location: {
          id: location.id,
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy,
          heading: location.heading,
          speed: location.speed,
          recordedAt: location.recordedAt.toISOString(),
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[GET /api/cleaner/location] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch location" },
      { status: 500 }
    );
  }
}
