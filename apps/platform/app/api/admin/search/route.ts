import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export interface SearchResult {
  id: string;
  type: "customer" | "lead" | "request" | "job" | "invoice" | "cleaner";
  title: string;
  subtitle: string;
  href: string;
  metadata?: Record<string, any>;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
}

/**
 * Universal global search API for the admin portal
 * Searches across customers, CRM leads, service requests, and jobs
 *
 * Query parameters:
 * - q: Search query (minimum 2 characters, required)
 * - type: Filter to specific type ("customer" | "lead" | "request" | "job", optional)
 *
 * Returns up to 5 results per type (20 total)
 */
export const GET = async (request: NextRequest): Promise<NextResponse<SearchResponse>> => {
  try {
    const session = await getSession();

    // Check authorization - only HQ and MANAGER roles
    if (!session?.userId || (session.role !== "HQ" && session.role !== "MANAGER")) {
      return NextResponse.json(
        { results: [], total: 0, error: "Unauthorized" } as any,
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q")?.trim();
    const type = searchParams.get("type") as "customer" | "lead" | "request" | "job" | "invoice" | "cleaner" | null;

    // Validate search query
    if (!q || q.length < 2) {
      return NextResponse.json(
        { results: [], total: 0 },
        { status: 200 }
      );
    }

    const tenantId = session.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { results: [], total: 0, error: "No tenant context" } as any,
        { status: 403 }
      );
    }
    const results: SearchResult[] = [];

    // Search customers (User with role=CUSTOMER)
    if (!type || type === "customer") {
      const customers = await prisma.user.findMany({
        where: {
          tenantId,
          role: "CUSTOMER",
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
        take: 5,
      });

      results.push(
        ...customers.map((customer) => ({
          id: customer.id,
          type: "customer" as const,
          title: `${customer.firstName} ${customer.lastName}`,
          subtitle: customer.email || customer.phone || "No contact info",
          href: `/admin/customers/${customer.id}`,
          metadata: {
            email: customer.email,
            phone: customer.phone,
          },
        }))
      );
    }

    // Search CRM leads
    if (!type || type === "lead") {
      const leads = await prisma.crmLead.findMany({
        where: {
          tenantId,
          OR: [
            { businessName: { contains: q, mode: "insensitive" } },
            { contactName: { contains: q, mode: "insensitive" } },
            { contactEmail: { contains: q, mode: "insensitive" } },
            { contactPhone: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { address: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          businessName: true,
          contactName: true,
          contactEmail: true,
          contactPhone: true,
          city: true,
          status: true,
          priority: true,
        },
        take: 5,
      });

      results.push(
        ...leads.map((lead) => ({
          id: lead.id,
          type: "lead" as const,
          title: lead.businessName,
          subtitle: lead.contactName || lead.city || "No details",
          href: `/admin/leads`,
          metadata: {
            contactName: lead.contactName,
            contactEmail: lead.contactEmail,
            city: lead.city,
            status: lead.status,
            priority: lead.priority,
            leadId: lead.id, // For navigation context
          },
        }))
      );
    }

    // Search service requests
    if (!type || type === "request") {
      const requests = await prisma.serviceRequest.findMany({
        where: {
          tenantId,
          OR: [
            { customerName: { contains: q, mode: "insensitive" } },
            { customerEmail: { contains: q, mode: "insensitive" } },
            { customerPhone: { contains: q, mode: "insensitive" } },
            { addressLine1: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          customerName: true,
          customerEmail: true,
          customerPhone: true,
          addressLine1: true,
          city: true,
          serviceType: true,
          createdAt: true,
        },
        take: 5,
      });

      results.push(
        ...requests.map((request) => ({
          id: request.id,
          type: "request" as const,
          title: `${request.customerName} - ${request.serviceType}`,
          subtitle: `${request.addressLine1}, ${request.city}`,
          href: `/admin/schedule`,
          metadata: {
            customerEmail: request.customerEmail,
            customerPhone: request.customerPhone,
            serviceType: request.serviceType,
            requestId: request.id,
            createdAt: request.createdAt,
          },
        }))
      );
    }

    // Search jobs (via linked ServiceRequest)
    if (!type || type === "job") {
      const jobs = await prisma.job.findMany({
        where: {
          tenantId,
          request: {
            OR: [
              { customerName: { contains: q, mode: "insensitive" } },
              { customerEmail: { contains: q, mode: "insensitive" } },
              { customerPhone: { contains: q, mode: "insensitive" } },
              { addressLine1: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
            ],
          },
        },
        select: {
          id: true,
          status: true,
          scheduledStart: true,
          request: {
            select: {
              id: true,
              customerName: true,
              customerEmail: true,
              customerPhone: true,
              addressLine1: true,
              city: true,
              serviceType: true,
            },
          },
        },
        take: 5,
      });

      results.push(
        ...jobs.map((job) => ({
          id: job.id,
          type: "job" as const,
          title: `Job: ${job.request.customerName}`,
          subtitle: `${job.request.addressLine1}, ${job.request.city} - ${job.status}`,
          href: `/admin/schedule`,
          metadata: {
            customerEmail: job.request.customerEmail,
            customerPhone: job.request.customerPhone,
            status: job.status,
            scheduledStart: job.scheduledStart,
            jobId: job.id,
            serviceType: job.request.serviceType,
          },
        }))
      );
    }

    // Search invoices
    if (!type || type === "invoice") {
      const invoices = await prisma.invoice.findMany({
        where: {
          tenantId,
          OR: [
            { customerName: { contains: q, mode: "insensitive" } },
            { customerEmail: { contains: q, mode: "insensitive" } },
            { invoiceNumber: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          invoiceNumber: true,
          customerName: true,
          customerEmail: true,
          total: true,
          status: true,
        },
        take: 5,
      });

      results.push(
        ...invoices.map((inv) => ({
          id: inv.id,
          type: "invoice" as const,
          title: `Invoice #${inv.invoiceNumber}`,
          subtitle: `${inv.customerName} — $${inv.total.toFixed(2)} (${inv.status})`,
          href: `/admin/invoices`,
          metadata: {
            customerEmail: inv.customerEmail,
            total: inv.total,
            status: inv.status,
            invoiceId: inv.id,
          },
        }))
      );
    }

    // Search cleaners / team
    if (!type || type === "cleaner") {
      const cleaners = await prisma.user.findMany({
        where: {
          tenantId,
          role: { in: ["CLEANER", "MANAGER"] },
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
        },
        take: 5,
      });

      results.push(
        ...cleaners.map((c) => ({
          id: c.id,
          type: "cleaner" as const,
          title: `${c.firstName} ${c.lastName}`,
          subtitle: `${c.role} — ${c.email}`,
          href: `/admin/team`,
          metadata: {
            email: c.email,
            phone: c.phone,
            role: c.role,
          },
        }))
      );
    }

    return NextResponse.json(
      {
        results: results.slice(0, 25), // Max 25 total results
        total: results.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[admin/search] Error:", error);
    return NextResponse.json(
      { results: [], total: 0, error: "Internal server error" } as any,
      { status: 500 }
    );
  }
};
