import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

const createLeadSchema = z.object({
  businessName: z.string().min(1),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  sqft: z.number().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
  priority: z.number().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const querySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  sort: z.enum(["name", "date", "score"]).optional().default("date"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
});

export const GET = async (request: NextRequest) => {
  try {
    const session = await requireSession({ roles: ["HQ", "MANAGER"] });

    const viewer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { tenantId: true },
    });

    if (!viewer) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse(Object.fromEntries(searchParams));

    const {
      search,
      status,
      source,
      tags,
      sort,
      order,
      page,
      limit,
    } = parsed;

    // Build where clause
    const where: any = { tenantId: viewer.tenantId };

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
        { contactName: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
        { contactEmail: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
        { contactPhone: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (source) {
      where.source = source;
    }

    if (tags) {
      const tagArray = tags.split(",").map((t) => t.trim());
      where.tags = { hasSome: tagArray };
    }

    // Build orderBy
    let orderBy: any = {};
    switch (sort) {
      case "name":
        orderBy = { businessName: order };
        break;
      case "score":
        orderBy = { score: order };
        break;
      case "date":
      default:
        orderBy = { createdAt: order };
    }

    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      prisma.crmLead.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.crmLead.count({ where }),
    ]);

    return NextResponse.json({
      data: leads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[contacts GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const session = await requireSession({ roles: ["HQ", "MANAGER"] });

    const viewer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { tenantId: true },
    });

    if (!viewer) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createLeadSchema.parse(body);

    const lead = await prisma.crmLead.create({
      data: {
        tenantId: viewer.tenantId,
        businessName: parsed.businessName,
        contactName: parsed.contactName,
        contactEmail: parsed.contactEmail,
        contactPhone: parsed.contactPhone,
        address: parsed.address,
        city: parsed.city,
        state: parsed.state,
        postalCode: parsed.postalCode,
        website: parsed.website,
        industry: parsed.industry,
        sqft: parsed.sqft,
        source: parsed.source || "manual",
        status: parsed.status || "new",
        priority: parsed.priority || 3,
        notes: parsed.notes,
        tags: parsed.tags || [],
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("[contacts POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
};
