import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const applySchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required").default("FL"),
  experience: z.enum(["less_than_1", "1_to_2", "3_to_5", "5_plus"]),
  transportation: z.enum(["yes", "no"]),
  motivation: z.string().min(10, "Please tell us more about your motivation"),
  availability: z.array(z.string()).min(1, "Please select at least one availability option")
});

type ApplyPayload = z.infer<typeof applySchema>;

const getDefaultTenantId = async (): Promise<string> => {
  const tenantId = process.env.DEFAULT_TENANT_ID;
  if (tenantId) return tenantId;

  // If no DEFAULT_TENANT_ID, try to find the default tenant by slug
  const slug = process.env.DEFAULT_TENANT_SLUG ?? "tse";
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (tenant) return tenant.id;

  // If still no tenant, create one
  const created = await prisma.tenant.create({
    data: {
      id: `tenant-${Date.now()}`,
      name: process.env.DEFAULT_TENANT_NAME ?? "TriState HQ",
      slug
    }
  });
  return created.id;
};

const formatApplicationNotes = (payload: ApplyPayload): string => {
  const availabilityLabels: Record<string, string> = {
    weekday_mornings: "Weekday mornings",
    weekday_afternoons: "Weekday afternoons",
    weekends: "Weekends"
  };

  const availabilityText = payload.availability
    .map((slot) => availabilityLabels[slot] || slot)
    .join(", ");

  const experienceLabels: Record<string, string> = {
    less_than_1: "Less than 1 year",
    "1_to_2": "1-2 years",
    "3_to_5": "3-5 years",
    "5_plus": "5+ years"
  };

  return `
Cleaner Application Submitted

Personal Information:
- Name: ${payload.firstName} ${payload.lastName}
- Email: ${payload.email}
- Phone: ${payload.phone}
- Location: ${payload.city}, ${payload.state}

Experience & Background:
- Years of Experience: ${experienceLabels[payload.experience] || payload.experience}
- Has Transportation: ${payload.transportation === "yes" ? "Yes" : "No"}

Motivation:
${payload.motivation}

Availability:
${availabilityText}

Status: Pending review
`;
};

export const POST = async (request: Request) => {
  try {
    const payload = applySchema.parse(await request.json());

    const tenantId = await getDefaultTenantId();

    const notes = formatApplicationNotes(payload);

    // Create a CRM lead for the cleaner application
    const lead = await prisma.crmLead.create({
      data: {
        tenantId,
        businessName: `${payload.firstName} ${payload.lastName}`, // Use name as business name
        contactName: `${payload.firstName} ${payload.lastName}`,
        contactEmail: payload.email,
        contactPhone: payload.phone,
        city: payload.city,
        state: payload.state,
        source: "cleaner_application",
        status: "new",
        tags: ["cleaner-applicant"],
        notes,
        priority: 3,
        score: 0
      }
    });

    return NextResponse.json({
      ok: true,
      message: "Thanks! We'll review your application and get back to you within 48 hours.",
      leadId: lead.id
    });
  } catch (error) {
    console.error("[auth] cleaner application error", error);

    if (error instanceof z.ZodError) {
      const fieldErrors = error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors)[0]?.[0];
      return NextResponse.json(
        { error: firstError || "Invalid application data" },
        { status: 422 }
      );
    }

    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("Foreign key constraint") || msg.includes("violates foreign key")) {
      console.error("[auth] Tenant likely missing in database. Run prisma:bootstrap or set DEFAULT_TENANT_ID.");
      return NextResponse.json(
        { error: "System configuration error. Please contact support." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Unable to submit application. Please try again." },
      { status: 500 }
    );
  }
};
