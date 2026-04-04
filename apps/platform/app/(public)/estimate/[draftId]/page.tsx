import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EstimateClient } from "./estimate-client";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

// Block search engines from indexing estimate pages
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const SERVICE_LABELS: Record<string, string> = {
  HOME_CLEAN: "Construction",
  healthy_home: "Construction",
  DEEP_CLEAN: "Deep Refresh & Detox",
  deep_refresh: "Deep Refresh & Detox",
  MOVE_IN_OUT: "Move-In / Move-Out Detail",
  move_in_out: "Move-In / Move-Out Detail",
  PRESSURE_WASH: "Pressure Washing",
  pressure_wash: "Pressure Washing",
  AUTO_DETAIL: "Eco Auto Detail",
  auto_detail: "Eco Auto Detail",
  CUSTOM: "Custom Service",
  commercial: "Eco Commercial Care",
};

const SERVICE_INCLUDES: Record<string, string[]> = {
  HOME_CLEAN: ["All rooms dusted & sanitized", "Kitchen deep wipe & appliance exteriors", "Bathrooms fully sanitized", "Floors vacuumed & mopped", "HEPA-filter vacuuming", "Baseboards & light switches", "Trash & recycling removed"],
  healthy_home: ["All rooms dusted & sanitized", "Kitchen deep wipe & appliance exteriors", "Bathrooms fully sanitized", "Floors vacuumed & mopped", "HEPA-filter vacuuming", "Baseboards & light switches", "Trash & recycling removed"],
  DEEP_CLEAN: ["Full scope includes:", "Inside oven & microwave", "Inside refrigerator", "Cabinet fronts & handles", "Window tracks & sills", "Grout scrubbing", "Ceiling fans & vents", "Blinds & shutters"],
  deep_refresh: ["Full scope includes:", "Inside oven & microwave", "Inside refrigerator", "Cabinet fronts & handles", "Window tracks & sills", "Grout scrubbing", "Ceiling fans & vents", "Blinds & shutters"],
  PRESSURE_WASH: ["Driveway & sidewalks", "Patio, lanai & pool deck", "Exterior walls & fences", "Garage floor", "Eco-friendly detergents"],
  pressure_wash: ["Driveway & sidewalks", "Patio, lanai & pool deck", "Exterior walls & fences", "Garage floor", "Eco-friendly detergents"],
  AUTO_DETAIL: ["Exterior hand wash & dry", "Interior vacuum & wipe-down", "Dashboard & console detail", "Windows inside & out", "Tire dressing & wheels"],
  auto_detail: ["Exterior hand wash & dry", "Interior vacuum & wipe-down", "Dashboard & console detail", "Windows inside & out", "Tire dressing & wheels"],
  CUSTOM: ["Custom scope assessment", "Tailored project plan", "Detail work", "Final inspection", "Client walkthrough"],
  commercial: ["Custom scope assessment", "Tailored project plan", "Detail work", "Final inspection", "Client walkthrough"],
  MOVE_IN_OUT: ["All rooms floor-to-ceiling", "Inside all cabinets & closets", "Inside all appliances", "Construction dust removal", "Garage sweep", "Final walkthrough"],
  move_in_out: ["All rooms floor-to-ceiling", "Inside all cabinets & closets", "Inside all appliances", "Construction dust removal", "Garage sweep", "Final walkthrough"],
};

export default async function EstimatePage({
  params,
  searchParams,
}: {
  params: Promise<{ draftId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { draftId } = await params;
  const { token } = await searchParams;

  if (!token) {
    notFound();
  }

  const draft = await prisma.draftEstimate.findUnique({
    where: { id: draftId },
    select: {
      id: true,
      tenantId: true,
      accessToken: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      address: true,
      serviceType: true,
      estimatedCost: true,
      estimateBreakdown: true,
      status: true,
      expiresAt: true,
      customerConfirmed: true,
      createdAt: true,
    },
  });

  if (!draft || draft.accessToken !== token) {
    notFound();
  }

  // Check if expired
  const isExpired = draft.expiresAt ? new Date(draft.expiresAt) < new Date() : false;
  const isAccepted = draft.customerConfirmed || draft.status === "customer_confirmed";

  // Fetch Google reviews for social proof
  let reviews: { authorName: string; rating: number; text: string }[] = [];
  try {
    const dbReviews = await prisma.googleReview.findMany({
      where: { tenantId: draft.tenantId, rating: { gte: 4 } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { authorName: true, rating: true, text: true },
    });
    reviews = dbReviews.map((r) => ({ ...r, text: r.text ?? "" }));
  } catch { /* graceful fail */ }

  const serviceLabel = SERVICE_LABELS[draft.serviceType ?? "HOME_CLEAN"] ?? "Professional Service";
  const includes = SERVICE_INCLUDES[draft.serviceType ?? "HOME_CLEAN"] ?? SERVICE_INCLUDES.HOME_CLEAN;
  const breakdown = (draft.estimateBreakdown as Record<string, unknown>) ?? {};

  // Days until expiry
  const daysLeft = draft.expiresAt
    ? Math.max(0, Math.ceil((new Date(draft.expiresAt).getTime() - Date.now()) / 86400000))
    : 30;

  return (
    <EstimateClient
      estimate={{
        id: draft.id,
        customerName: draft.customerName ?? "",
        customerEmail: draft.customerEmail ?? "",
        customerPhone: draft.customerPhone ?? "",
        address: draft.address ?? "",
        serviceType: draft.serviceType ?? "HOME_CLEAN",
        serviceLabel,
        estimatedCost: draft.estimatedCost ?? 0,
        breakdown,
        includes,
        isExpired,
        isAccepted,
        daysLeft,
        createdAt: draft.createdAt.toISOString(),
      }}
      reviews={reviews}
      token={token}
    />
  );
}
