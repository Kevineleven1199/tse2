import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serviceRequestSchema } from "@/lib/validators";
import { generateQuoteForRequest } from "@/lib/quote-engine";
import { notifyCustomerQuoteReady } from "@/lib/notifications";
import { getTenantFromRequest } from "@/lib/tenant";
import { syncServiceRequestContact } from "@/src/lib/contact-sync";
import { awardXp, checkAchievements } from "@/src/lib/achievements";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = serviceRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          issues: parsed.error.flatten().fieldErrors
        },
        { status: 422 }
      );
    }

    const payload = parsed.data;

    const tenant = await getTenantFromRequest();

    if (!tenant) {
      return NextResponse.json(
        {
          error: "Tenant not configured.",
          message: "Tenant not configured."
        },
        { status: 404 }
      );
    }

    const createdRequest = await prisma.serviceRequest.create({
      data: {
        tenantId: tenant.id,
        customerName: `${payload.contact.firstName} ${payload.contact.lastName}`.trim(),
        customerEmail: payload.contact.email.toLowerCase(),
        customerPhone: payload.contact.phone,
        addressLine1: payload.location.addressLine1,
        addressLine2: payload.location.addressLine2,
        city: payload.location.city,
        state: payload.location.state,
        postalCode: payload.location.postalCode,
        lat: payload.location.lat,
        lng: payload.location.lng,
        serviceType: payload.serviceType,
        squareFootage: payload.squareFootage ?? null,
        surfaces: payload.surfaces,
        preferredStart: payload.preferredWindows[0]
          ? new Date(payload.preferredWindows[0]?.start)
          : null,
        preferredEnd: payload.preferredWindows[0]
          ? new Date(payload.preferredWindows[0]?.end)
          : null,
        preferredWindows: payload.preferredWindows,
        notes: payload.notes ?? null
      }
    });

    // Hook: Sync service request contact to OpenPhone + CRM
    try {
      await syncServiceRequestContact(createdRequest.id);
    } catch (err) {
      console.error("[request] OpenPhone sync failed:", err);
    }

    // Hook: Award XP to customer for booking
    try {
      const customer = await prisma.user.findFirst({
        where: {
          email: payload.contact.email.toLowerCase(),
          role: "CUSTOMER"
        }
      });
      if (customer) {
        await awardXp(customer.id, "booking_created", 5, createdRequest.id, "service_request");
        await checkAchievements(customer.id);
      }
    } catch (err) {
      console.error("[request] XP award failed:", err);
    }

    queueQuoteGeneration(createdRequest.id).catch((error) => {
      console.error("Background quote generation failed", error);
    });

    return NextResponse.json(
      {
        requestId: createdRequest.id,
        status: createdRequest.status
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}

const queueQuoteGeneration = async (requestId: string) => {
  const quote = await generateQuoteForRequest(requestId);
  await notifyCustomerQuoteReady(requestId);
  return quote;
};
