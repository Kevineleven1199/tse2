import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateQuote, type QuoteAddOn, type QuoteFrequency, type QuoteLocationTier, type QuoteServiceType } from "@/src/lib/pricing";
import { prisma } from "@/lib/prisma";
import { getTenantFromRequest } from "@/lib/tenant";
import {
  JobStatus,
  PaymentProvider,
  PaymentStatus,
  RequestStatus,
  ServiceType
} from "@prisma/client";
import { sendOperationalSms, sendEmail, sendSms } from "@/src/lib/notifications";
import { autoAssignCleaner, notifyMatchingCleaners } from "@/lib/automation-engine";
import { awardXp, checkAchievements } from "@/src/lib/achievements";
import { getSession } from "@/src/lib/auth/session";
import { getOrCreateClientFolder } from "@/src/lib/google-drive";

export const dynamic = "force-dynamic";

const SERVICE_TYPE_VALUES = ["healthy_home", "deep_refresh", "move_in_out", "commercial"] as const;
const FREQUENCY_VALUES = ["one_time", "weekly", "biweekly", "monthly"] as const;
const LOCATION_VALUES = ["sarasota", "manatee", "pinellas", "hillsborough", "pasco", "out_of_area"] as const;
const ADD_ON_VALUES = [
  "inside_appliances",
  "interior_windows",
  "pressure_washing",
  "car_detailing",
  "laundry_organization",
  "eco_disinfection"
] as const;

const quoteRequestSchema = z.object({
  action: z.enum(["preview", "accept", "decline"]).default("preview"),
  quoteId: z.string().optional(),
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(7).max(18),
  address: z.string().max(160).optional().default(""),
  city: z.string().max(120).optional().default(""),
  serviceType: z.enum(SERVICE_TYPE_VALUES),
  frequency: z.enum(FREQUENCY_VALUES),
  locationTier: z.enum(LOCATION_VALUES),
  bedrooms: z.coerce.number().int().min(0).max(9),
  bathrooms: z.coerce.number().int().min(0).max(9),
  squareFootage: z.coerce.number().min(400).max(8500),
  addOns: z.array(z.enum(ADD_ON_VALUES)).optional().default([]),
  preferredDate: z.string().max(40).optional(),
  preferredDays: z.array(z.string()).optional().default([]),
  preferredTimes: z.array(z.string()).optional().default([]),
  referralCode: z.string().max(40).optional(),
  notes: z.string().max(600).optional(),
  isFirstTimeClient: z.boolean().optional().default(true),
  // Granular fields passed through from form
  flooringType: z.string().optional(),
  conditionLevel: z.string().optional(),
  petSituation: z.string().optional(),
  kitchenType: z.string().optional(),
  clutterLevel: z.string().optional(),
  homeAge: z.string().optional(),
  hasGarage: z.boolean().optional(),
  hasLaundryRoom: z.boolean().optional(),
  hasLanaiPatio: z.boolean().optional(),
  stories: z.coerce.number().optional()
});

type QuoteAction = "preview" | "accept" | "decline";

const schedulingUrl = process.env.NEXT_PUBLIC_SCHEDULING_URL ?? "https://tsenow.com/request";

const SERVICE_LABELS: Record<QuoteServiceType, string> = {
  healthy_home: "Healthy Home Cleaning",
  deep_refresh: "Deep Refresh & Detox",
  move_in_out: "Move-In / Move-Out Detail",
  commercial: "Eco Commercial Care"
};

const FREQUENCY_LABELS: Record<QuoteFrequency, string> = {
  one_time: "One-time",
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly"
};

const LOCATION_LABELS: Record<QuoteLocationTier, string> = {
  sarasota: "Flatwoods County",
  manatee: "Manatee County",
  pinellas: "Pinellas County",
  hillsborough: "Hillsborough County",
  pasco: "Pasco County",
  out_of_area: "Extended Service Area"
};

const ADD_ON_LABELS: Record<string, string> = {
  inside_appliances: "Inside fridge + oven",
  interior_windows: "Interior windows",
  pressure_washing: "Pressure washing",
  car_detailing: "Car detailing",
  laundry_organization: "Laundry & organization boost",
  eco_disinfection: "Eco disinfection fogging"
};

const SERVICE_TYPE_MAP: Record<QuoteServiceType, ServiceType> = {
  healthy_home: ServiceType.HOME_CLEAN,
  deep_refresh: ServiceType.HOME_CLEAN,
  move_in_out: ServiceType.HOME_CLEAN,
  commercial: ServiceType.CUSTOM
};

export const POST = async (request: Request) => {
  try {
    const json = await request.json();
    const payload = quoteRequestSchema.parse(json);

    const {
      action,
      serviceType,
      frequency,
      locationTier,
      bedrooms,
      bathrooms,
      squareFootage,
      addOns,
      isFirstTimeClient
    } = payload;

    const breakdown = calculateQuote({
      serviceType,
      frequency,
      locationTier,
      bedrooms,
      bathrooms,
      squareFootage,
      addOns: addOns as QuoteAddOn[],
      isFirstTimeClient
    });

    const tenant = await getTenantFromRequest();
    const tenantId = tenant?.id ?? null;
    const session = await getSession();

    // Check if customer is blocked
    if (tenantId && payload.email) {
      const blockedUser = await prisma.user.findFirst({
        where: {
          tenantId,
          email: payload.email,
          blocked: true
        },
      });
      if (blockedUser) {
        return NextResponse.json(
          { error: "This account has been restricted. Please contact us for assistance." },
          { status: 403 }
        );
      }
    }

    let quoteId = payload.quoteId ?? `Q-${Date.now()}`;
    let requestId: string | null = null;
    let persisted = true;

    if (tenantId) {
      try {
        const existingQuote = payload.quoteId
          ? await prisma.quote.findUnique({
              where: { id: payload.quoteId },
              include: { request: true }
            })
          : null;

        if (existingQuote) {
          if (existingQuote.request.tenantId !== tenantId) {
            return NextResponse.json({ error: "Quote not found." }, { status: 404 });
          }

          quoteId = existingQuote.id;
          requestId = existingQuote.requestId;

          await prisma.serviceRequest.update({
            where: { id: existingQuote.requestId },
            data: {
              customerName: payload.name,
              customerEmail: payload.email,
              customerPhone: payload.phone,
              addressLine1: payload.address || "TBD",
              city: payload.city || "Flatwoods",
              state: "FL",
              postalCode: existingQuote.request.postalCode ?? "00000",
              squareFootage: Math.round(squareFootage),
              notes: payload.notes,
              status:
                action === "accept"
                  ? RequestStatus.ACCEPTED
                  : action === "decline"
                  ? RequestStatus.CANCELED
                  : RequestStatus.QUOTED
            }
          });

          await prisma.quote.update({
            where: { id: existingQuote.id },
            data: {
              subtotal: breakdown.totalBeforeDiscount,
              fees: breakdown.travelFee,
              taxes: 0,
              total: breakdown.total,
              smartNotes: payload.notes,
              updatedAt: new Date()
            }
          });
        } else {
          const createdRequest = await prisma.serviceRequest.create({
            data: {
              tenantId,
              customerName: payload.name,
              customerEmail: payload.email,
              customerPhone: payload.phone,
              addressLine1: payload.address || "TBD",
              city: payload.city || "Flatwoods",
              state: "FL",
              postalCode: "00000",
              serviceType: SERVICE_TYPE_MAP[serviceType],
              squareFootage: Math.round(squareFootage),
              notes: payload.notes,
              status:
                action === "accept"
                  ? RequestStatus.ACCEPTED
                  : action === "decline"
                  ? RequestStatus.CANCELED
                  : RequestStatus.QUOTED
            }
          });

          requestId = createdRequest.id;

          const createdQuote = await prisma.quote.create({
            data: {
              requestId: createdRequest.id,
              subtotal: breakdown.totalBeforeDiscount,
              fees: breakdown.travelFee,
              taxes: 0,
              total: breakdown.total,
              smartNotes: payload.notes,
              expiresAt: payload.preferredDate ? new Date(payload.preferredDate) : undefined
            }
          });

          quoteId = createdQuote.id;

          // Persist scheduling preferences (preferred days/times from the form)
          const prefDays = payload.preferredDays ?? [];
          const prefTimes = payload.preferredTimes ?? [];
          if (prefDays.length > 0 || prefTimes.length > 0) {
            try {
              const dayTimeLabel = (day: string, time: string) => {
                const timeMap: Record<string, [number, number]> = {
                  morning: [8, 12],
                  afternoon: [12, 17],
                  evening: [17, 20],
                };
                const [startH, endH] = timeMap[time] ?? [8, 17];
                const base = new Date();
                // Map day names to next occurrence
                const dayMap: Record<string, number> = {
                  monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
                  friday: 5, saturday: 6, sunday: 0,
                };
                const targetDay = dayMap[day.toLowerCase()] ?? base.getDay();
                const diff = (targetDay - base.getDay() + 7) % 7 || 7;
                const target = new Date(base);
                target.setDate(base.getDate() + diff);
                const start = new Date(target);
                start.setHours(startH, 0, 0, 0);
                const end = new Date(target);
                end.setHours(endH, 0, 0, 0);
                return { start, end };
              };

              let priority = 1;
              for (const day of prefDays) {
                const time = prefTimes[0] || "morning";
                const { start, end } = dayTimeLabel(day, time);
                await prisma.schedulingPreference.create({
                  data: {
                    requestId: createdRequest.id,
                    windowStart: start,
                    windowEnd: end,
                    priority: priority++,
                  },
                });
              }
            } catch (schedErr) {
              console.error("[quotes] Failed to persist scheduling preferences:", schedErr);
            }
          }

          // Hook: Award XP to admin for sending quote
          if (session?.userId) {
            try {
              await awardXp(session.userId, "quote_sent", 5, createdQuote.id, "quote");
              await checkAchievements(session.userId);
            } catch (err) {
              console.error("[quote] XP award failed:", err);
            }
          }

          // Auto-create Google Drive folder (fire and forget)
          const address = [payload.address, payload.city, "FL"]
            .filter(Boolean)
            .join(", ");
          getOrCreateClientFolder(payload.name, address)
            .then(async (result) => {
              if (result) {
                await prisma.serviceRequest.update({
                  where: { id: createdRequest.id },
                  data: {
                    driveFolderId: result.folderId,
                    driveFolderUrl: result.folderUrl,
                  },
                });
              }
            })
            .catch((err) => {
              console.error("[quote] Google Drive folder creation failed:", err);
            });
        }

        if (action === "accept" && requestId) {
          const job = await prisma.job.upsert({
            where: { requestId },
            update: {
              status: JobStatus.PENDING,
              payoutAmount: breakdown.cleanerPay,
              estimatedHours: breakdown.estimatedDurationHours,
              updatedAt: new Date()
            },
            create: {
              tenantId,
              requestId,
              status: JobStatus.PENDING,
              payoutAmount: breakdown.cleanerPay,
              estimatedHours: breakdown.estimatedDurationHours
            }
          });

          const existingDeposit = await prisma.paymentRecord.findFirst({
            where: { requestId, deposit: true }
          });

          if (existingDeposit) {
            await prisma.paymentRecord.update({
              where: { id: existingDeposit.id },
              data: {
                amount: breakdown.recommendedDeposit,
                status: PaymentStatus.PENDING,
                metadata: {
                  ...(typeof existingDeposit.metadata === "object" && existingDeposit.metadata !== null
                    ? (existingDeposit.metadata as Record<string, unknown>)
                    : {}),
                  charge_type: "deposit",
                  quote_total: breakdown.total
                }
              }
            });
          } else {
            await prisma.paymentRecord.create({
              data: {
                requestId,
                quoteId,
                provider: PaymentProvider.STRIPE,
                amount: breakdown.recommendedDeposit,
                status: PaymentStatus.PENDING,
                deposit: true,
                metadata: {
                  charge_type: "deposit",
                  quote_total: breakdown.total
                }
              }
            });
          }

          // Trigger smart cleaner assignment automation
          // This runs in background - tries auto-assign if high match, else notifies cleaners
          autoAssignCleaner(job.id).catch((err) => {
            console.error("[quotes] Auto-assign failed, falling back to notifications", err);
            notifyMatchingCleaners(job.id).catch(console.error);
          });
        }

        // Auto-create recurring schedule for recurring quotes
        if (action === "accept" && requestId && frequency !== "one_time") {
          try {
            const freqMap: Record<string, string> = {
              weekly: "WEEKLY",
              biweekly: "BIWEEKLY",
              monthly: "MONTHLY",
            };
            const recurringFreq = freqMap[frequency];
            if (recurringFreq) {
              const startDate = payload.preferredDate
                ? new Date(payload.preferredDate)
                : new Date();

              await prisma.recurringSchedule.create({
                data: {
                  tenantId,
                  customerName: payload.name,
                  customerEmail: payload.email,
                  customerPhone: payload.phone,
                  address: [payload.address, payload.city, "FL"].filter(Boolean).join(", "),
                  serviceType: SERVICE_TYPE_MAP[serviceType].toString(),
                  frequency: recurringFreq as any,
                  startDate,
                  nextRunDate: new Date(startDate.getTime() + (
                    recurringFreq === "WEEKLY" ? 7 * 86400000 :
                    recurringFreq === "BIWEEKLY" ? 14 * 86400000 :
                    30 * 86400000
                  )),
                  basePrice: breakdown.total,
                  notes: payload.notes ?? null,
                  active: true,
                },
              });
              console.log(`[quotes] Created recurring schedule for ${payload.name} (${recurringFreq})`);
            }
          } catch (err) {
            console.error("[quotes] Failed to create recurring schedule:", err);
          }
        }
      } catch (error) {
        persisted = false;
        console.error("[quotes] Failed to persist quote to database", error);
      }
    }

    const monthlyValue = frequency === "weekly" ? breakdown.total * 4 : frequency === "biweekly" ? breakdown.total * 2 : breakdown.total;

    const responseBody = {
      quoteId,
      action,
      summary: {
        serviceLabel: SERVICE_LABELS[serviceType],
        frequencyLabel: FREQUENCY_LABELS[frequency],
        locationLabel: LOCATION_LABELS[locationTier]
      },
      pricing: breakdown,
      monthlyValue: Number(monthlyValue.toFixed(2)),
      message:
        action === "preview"
          ? "Quote generated successfully."
          : action === "accept"
          ? "Quote accepted. Our scheduling team will follow up shortly."
          : "Quote declined. Thank you for considering us.",
      schedulingUrl,
      persisted
    };

    // Create a DraftEstimate for the stunning estimate page
    // This allows customers to view a beautiful branded page and accept there
    if (tenantId && payload.name && payload.email && action === "preview") {
      try {
        const crypto = await import("crypto");
        const accessToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        const draft = await prisma.draftEstimate.create({
          data: {
            tenantId,
            customerName: payload.name,
            customerEmail: payload.email,
            customerPhone: payload.phone,
            address: `${payload.address || ""}, ${payload.city || "Flatwoods"}, KY`,
            serviceType: payload.serviceType,
            estimatedCost: breakdown.total,
            estimateBreakdown: breakdown as any,
            accessToken,
            expiresAt,
            status: "draft",
          },
        });

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://web-production-cfe11.up.railway.app";
        (responseBody as any).estimateUrl = `${baseUrl}/estimate/${draft.id}?token=${accessToken}`;
        (responseBody as any).estimateId = draft.id;
      } catch (err) {
        console.error("[quotes] DraftEstimate creation failed (non-blocking):", err);
      }
    }

    if (action !== "preview") {
      const addOnLabelList = payload.addOns.length ? payload.addOns.map((item) => ADD_ON_LABELS[item]).join(", ") : "No add-ons";
      const alertMessage =
        `Quote ${action.toUpperCase()} – ${payload.name} (${payload.phone})\n` +
        `${SERVICE_LABELS[payload.serviceType]} • ${FREQUENCY_LABELS[payload.frequency]} • ${LOCATION_LABELS[locationTier]}\n` +
        `Home: ${payload.bedrooms}BR/${payload.bathrooms}BA, ${squareFootage} sqft\n` +
        `Total: $${breakdown.total.toFixed(2)} | Cleaner pay: $${breakdown.cleanerPay.toFixed(2)}\n` +
        `Add-ons: ${addOnLabelList}` +
        (payload.preferredDate ? `\nPreferred date: ${payload.preferredDate}` : "") +
        (payload.notes ? `\nNotes: ${payload.notes}` : "");

      try { await sendOperationalSms(alertMessage); } catch (err) { console.error("[quotes] sendOperationalSms failed:", err); }

      try {
        await sendEmail({
          to: payload.email,
          subject:
            action === "accept"
              ? "Your Tri State Enterprise visit is being scheduled"
              : action === "decline"
              ? "We're here if you need us"
              : "Your Tri State Enterprise quote",
          html:
            action === "accept"
              ? `<p>Hi ${payload.name},</p><p>Thanks for choosing Tri State Enterprise! We're lining up the perfect cleaner for you. Please choose up to three preferred time windows so we can lock in your visit.</p><p>Total per visit: <strong>$${breakdown.total.toFixed(2)}</strong><br>Deposit to reserve: <strong>$${breakdown.recommendedDeposit.toFixed(2)}</strong></p><p>We'll text you updates as soon as your cleaning pro claims the job.</p>`
              : action === "decline"
              ? `<p>Hi ${payload.name},</p><p>Thanks for considering Tri State Enterprise. If you'd like a revised estimate or have questions about our process, just reply to this email or text us at ${process.env.OPENPHONE_DEFAULT_NUMBER ?? "(606) 555-0100"}.</p>`
              : `<p>Hi ${payload.name},</p><p>Here's your personalized quote for ${SERVICE_LABELS[serviceType]}.</p><p>Total per visit: <strong>$${breakdown.total.toFixed(2)}</strong><br>Recurring value ≈ <strong>$${monthlyValue.toFixed(2)}/month</strong></p><p><a href="${schedulingUrl}" target="_blank">Accept & reserve your clean</a> when you're ready!</p>`
        });
      } catch (err) { console.error("[quotes] sendEmail failed:", err); }

      if (action === "accept") {
        try {
          await sendSms({
            to: payload.phone,
            text:
              "Thanks for booking with Tri State Enterprise! Share your preferred cleaning windows and we'll confirm once your pro claims the job."
          });
        } catch (err) { console.error("[quotes] sendSms failed:", err); }
      }
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Quote API error", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid quote request", details: error.flatten() }, { status: 422 });
    }

    return NextResponse.json({ error: "Unable to process quote at this time." }, { status: 500 });
  }
};
