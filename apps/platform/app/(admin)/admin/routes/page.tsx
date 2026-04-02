import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/src/components/ui/card";
import { RoutesClient } from "./routes-client";

export default async function RoutesPage() {
  const session = await requireSession({ roles: ["HQ"], redirectTo: "/login" });
  const tenantId = session.tenantId || process.env.DEFAULT_TENANT_ID || "ten_tse";

  try {
    // Get today's start and end times
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // Fetch today's scheduled jobs with addresses and assignments
    const jobs = await prisma.job.findMany({
      where: {
        tenantId,
        scheduledStart: { gte: startOfDay, lt: endOfDay },
        status: { in: ["SCHEDULED", "CLAIMED", "PENDING"] },
      },
      include: {
        request: {
          select: {
            customerName: true,
            addressLine1: true,
            city: true,
            state: true,
            serviceType: true,
            lat: true,
            lng: true,
          },
        },
        assignments: {
          include: {
            cleaner: {
              include: {
                user: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
      orderBy: { scheduledStart: "asc" },
    });

    // Fetch all cleaners with their active status
    const cleaners = await prisma.user.findMany({
      where: {
        tenantId,
        role: "CLEANER",
      },
      include: {
        cleaner: {
          select: { active: true },
        },
      },
      orderBy: { firstName: "asc" },
    });

    // Transform data for client component
    const jobsData = jobs.map((job) => ({
      id: job.id,
      customerName: job.request?.customerName || "Unknown Customer",
      address: `${job.request?.addressLine1 || ""}, ${job.request?.city || ""}, ${job.request?.state || ""}`.trim(),
      addressLine1: job.request?.addressLine1 || "",
      city: job.request?.city || "",
      state: job.request?.state || "",
      serviceType: job.request?.serviceType || "Service",
      lat: job.request?.lat || null,
      lng: job.request?.lng || null,
      status: job.status,
      scheduledStart: job.scheduledStart?.toISOString() || null,
      scheduledEnd: job.scheduledEnd?.toISOString() || null,
      estimatedDuration: job.estimatedHours ? job.estimatedHours * 60 : 60,
      assignedCleanerId: job.assignments?.[0]?.cleanerId || null,
    }));

    const cleanersData = cleaners.map((cleaner) => ({
      id: cleaner.id,
      firstName: cleaner.firstName,
      lastName: cleaner.lastName,
      name: `${cleaner.firstName} ${cleaner.lastName}`.trim(),
      active: cleaner.cleaner?.active || false,
    }));

    return (
      <div className="space-y-6">
        <RoutesClient jobs={jobsData} cleaners={cleanersData} />
      </div>
    );
  } catch (error) {
    console.error("Failed to fetch routes data:", error);
    return (
      <div className="space-y-6">
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Error loading routes. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
}
