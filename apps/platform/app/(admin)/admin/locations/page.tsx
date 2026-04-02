import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import LocationsClient from "./locations-client";

export default async function LocationsPage() {
  await requireSession({ roles: ["HQ"], redirectTo: "/login" });

  try {
    const locations = await prisma.cleanerLocation.findMany({
      orderBy: {
        recordedAt: "desc",
      },
      take: 100,
    });

    const groupedByCleanerId = locations.reduce(
      (acc, loc) => {
        const cleanerId = loc.cleanerId;
        if (!acc[cleanerId]) {
          acc[cleanerId] = {
            cleanerId,
            locations: [],
          };
        }
        acc[cleanerId].locations.push({
          id: loc.id,
          latitude: loc.lat,
          longitude: loc.lng,
          accuracy: loc.accuracy,
          heading: loc.heading,
          speed: loc.speed,
          recordedAt: loc.recordedAt.toISOString(),
        });
        return acc;
      },
      {} as Record<
        string,
        {
          cleanerId: string;
          locations: any[];
        }
      >
    );

    const cleanerData = Object.values(groupedByCleanerId);

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
            FIELD OPERATIONS
          </p>
          <h1 className="text-2xl font-semibold">Cleaner Locations</h1>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <p className="text-sm text-muted-foreground">Active Cleaners</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{cleanerData.length}</p>
            </CardContent>
          </Card>
        </div>

        <LocationsClient initialData={cleanerData} />
      </div>
    );
  } catch (error) {
    console.error("Failed to load Cleaner Locations:", error);
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Cleaner Locations</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Failed to load data. Please try refreshing the page.
        </div>
      </div>
    );
  }
}
