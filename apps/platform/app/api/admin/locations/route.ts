import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

interface CleanerLocationData {
  cleanerId: string;
  name: string;
  phone?: string | null;
  lat: number;
  lng: number;
  accuracy?: number | null;
  recordedAt: string;
  lastSeenMinutesAgo: number;
}

// GET — get all cleaner locations from the last 30 minutes
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const tenantId = session.tenantId;

    // Get locations from the last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const locations = await prisma.cleanerLocation.findMany({
      where: {
        recordedAt: {
          gte: thirtyMinutesAgo,
        },
      },
      orderBy: {
        recordedAt: "desc",
      },
    });

    // Group by cleaner ID to get the most recent location per cleaner
    const latestByCleanerId = new Map<string, (typeof locations)[0]>();
    for (const loc of locations) {
      if (!latestByCleanerId.has(loc.cleanerId)) {
        latestByCleanerId.set(loc.cleanerId, loc);
      }
    }

    // Get cleaner details
    const cleanerProfiles = await prisma.cleanerProfile.findMany({
      where: {
        id: {
          in: Array.from(latestByCleanerId.keys()),
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    const cleanerMap = new Map(cleanerProfiles.map((p) => [p.id, p]));

    // Build response
    const data: CleanerLocationData[] = Array.from(latestByCleanerId.entries()).map(
      ([cleanerId, location]) => {
        const cleaner = cleanerMap.get(cleanerId);
        const minutesAgo = Math.round((Date.now() - location.recordedAt.getTime()) / 60000);

        return {
          cleanerId,
          name: cleaner
            ? `${cleaner.user.firstName} ${cleaner.user.lastName}`
            : "Unknown",
          phone: cleaner?.user.phone || undefined,
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy || undefined,
          recordedAt: location.recordedAt.toISOString(),
          lastSeenMinutesAgo: minutesAgo,
        };
      }
    );

    return NextResponse.json({
      locations: data.sort((a, b) => a.lastSeenMinutesAgo - b.lastSeenMinutesAgo),
      total: data.length,
    });
  } catch (error) {
    console.error("[GET /api/admin/locations] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}
