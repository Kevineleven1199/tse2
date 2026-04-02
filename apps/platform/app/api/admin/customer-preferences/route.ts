import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/customer-preferences?email=xxx
 * Get preferences for a customer. Accessible to HQ, MANAGER, and CLEANER.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const prefs = await prisma.customerPreference.findFirst({
    where: { tenantId: session.tenantId, customerEmail: email.toLowerCase() },
  });

  return NextResponse.json({ preferences: prefs });
}

/**
 * POST /api/admin/customer-preferences
 * Create or update preferences. HQ and MANAGER only.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["HQ", "MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const email = (body.customerEmail || "").toLowerCase().trim();
  if (!email) return NextResponse.json({ error: "customerEmail required" }, { status: 400 });

  const data = {
    tenantId: session.tenantId,
    customerEmail: email,
    preferredDays: body.preferredDays ?? [],
    preferredTimeWindow: body.preferredTimeWindow ?? null,
    preferredFrequency: body.preferredFrequency ?? null,
    entryInstructions: body.entryInstructions ?? null,
    parkingNotes: body.parkingNotes ?? null,
    alarmCode: body.alarmCode ?? null,
    keyLocation: body.keyLocation ?? null,
    cleaningNotes: body.cleaningNotes ?? null,
    allergies: body.allergies ?? null,
    petInfo: body.petInfo ?? null,
    doNotTouch: body.doNotTouch ?? null,
    focusAreas: body.focusAreas ?? null,
    productPreferences: body.productPreferences ?? null,
    communicationPref: body.communicationPref ?? "text",
    notifyBefore: body.notifyBefore ?? true,
    notifyAfter: body.notifyAfter ?? true,
    lastUpdatedBy: session.userId,
  };

  const prefs = await prisma.customerPreference.upsert({
    where: { tenantId_customerEmail: { tenantId: session.tenantId, customerEmail: email } },
    create: data,
    update: { ...data, tenantId: undefined, customerEmail: undefined } as any,
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "customer.preferences_updated",
      metadata: { customerEmail: email, updatedFields: Object.keys(body) },
    },
  }).catch(() => {});

  return NextResponse.json({ preferences: prefs });
}
