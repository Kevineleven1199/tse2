import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import { syncContactToOpenPhone } from "@/src/lib/contact-sync";

export const dynamic = "force-dynamic";

const updateLeadSchema = z.object({
  businessName: z.string().min(1).optional(),
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
  lastContactedAt: z.string().optional(),
  nextFollowUpAt: z.string().optional(),
  assignedTo: z.string().optional(),
});

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const session = await requireSession({ roles: ["HQ", "MANAGER"] });

    const viewer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { tenantId: true },
    });

    if (!viewer) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id } = await params;

    const lead = await prisma.crmLead.findUnique({
      where: { id },
    });

    if (!lead || lead.tenantId !== viewer.tenantId) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Build OR conditions for service requests
    const orConditions: Array<{ customerEmail?: string } | { customerPhone?: string }> = [];
    if (lead.contactEmail) {
      orConditions.push({ customerEmail: lead.contactEmail });
    }
    if (lead.contactPhone) {
      orConditions.push({ customerPhone: lead.contactPhone });
    }

    // Fetch related activity
    const [serviceRequests, todos, callTranscripts] = await Promise.all([
      prisma.serviceRequest.findMany({
        where: {
          tenantId: lead.tenantId,
          ...(orConditions.length > 0 ? { OR: orConditions } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.todoItem.findMany({
        where: {
          tenantId: lead.tenantId,
          relatedId: lead.id,
          relatedType: "crm_lead",
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.callTranscript.findMany({
        where: {
          tenantId: lead.tenantId,
          ...(lead.contactPhone ? { customerPhone: lead.contactPhone } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      lead,
      activity: {
        serviceRequests,
        todos,
        callTranscripts,
      },
    });
  } catch (error) {
    console.error("[contacts [id] GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch contact" },
      { status: 500 }
    );
  }
};

export const PUT = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const session = await requireSession({ roles: ["HQ", "MANAGER"] });

    const viewer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { tenantId: true },
    });

    if (!viewer) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id } = await params;

    const lead = await prisma.crmLead.findUnique({
      where: { id },
    });

    if (!lead || lead.tenantId !== viewer.tenantId) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateLeadSchema.parse(body);

    const updateData: any = {};
    if (parsed.businessName !== undefined) updateData.businessName = parsed.businessName;
    if (parsed.contactName !== undefined) updateData.contactName = parsed.contactName;
    if (parsed.contactEmail !== undefined) updateData.contactEmail = parsed.contactEmail;
    if (parsed.contactPhone !== undefined) updateData.contactPhone = parsed.contactPhone;
    if (parsed.address !== undefined) updateData.address = parsed.address;
    if (parsed.city !== undefined) updateData.city = parsed.city;
    if (parsed.state !== undefined) updateData.state = parsed.state;
    if (parsed.postalCode !== undefined) updateData.postalCode = parsed.postalCode;
    if (parsed.website !== undefined) updateData.website = parsed.website;
    if (parsed.industry !== undefined) updateData.industry = parsed.industry;
    if (parsed.sqft !== undefined) updateData.sqft = parsed.sqft;
    if (parsed.source !== undefined) updateData.source = parsed.source;
    if (parsed.status !== undefined) updateData.status = parsed.status;
    if (parsed.priority !== undefined) updateData.priority = parsed.priority;
    if (parsed.notes !== undefined) updateData.notes = parsed.notes;
    if (parsed.tags !== undefined) updateData.tags = parsed.tags;
    if (parsed.lastContactedAt !== undefined)
      updateData.lastContactedAt = new Date(parsed.lastContactedAt);
    if (parsed.nextFollowUpAt !== undefined)
      updateData.nextFollowUpAt = new Date(parsed.nextFollowUpAt);
    if (parsed.assignedTo !== undefined) updateData.assignedTo = parsed.assignedTo;

    const updatedLead = await prisma.crmLead.update({
      where: { id },
      data: updateData,
    });

    // Sync to OpenPhone if phone number present
    if (updatedLead.contactPhone) {
      try {
        await syncContactToOpenPhone(updatedLead.id);
      } catch (error) {
        console.error("[contacts [id] PUT] OpenPhone sync failed:", error);
        // Don't fail the request if sync fails
      }
    }

    return NextResponse.json(updatedLead);
  } catch (error) {
    console.error("[contacts [id] PUT]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
};
