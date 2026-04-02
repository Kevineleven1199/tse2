import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

// CSV escape helper function
function escapeCSVField(field: unknown): string {
  if (field === null || field === undefined) {
    return "";
  }

  let value = String(field);

  // If field contains comma, newline, or double quote, wrap in quotes and escape quotes
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    value = '"' + value.replace(/"/g, '""') + '"';
  }

  return value;
}

// Helper to convert array of objects to CSV string
function toCSV(headers: string[], rows: Record<string, unknown>[]): string {
  // Create header row
  const csvLines: string[] = [headers.map(escapeCSVField).join(",")];

  // Add data rows
  for (const row of rows) {
    const values = headers.map((header) => escapeCSVField(row[header]));
    csvLines.push(values.join(","));
  }

  return csvLines.join("\n");
}

// Parse and validate date parameter
function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

// Format date for filename
function getFormattedDate(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

const querySchema = z.object({
  type: z.enum(["customers", "leads", "jobs"]),
  format: z.enum(["csv"]).default("csv"),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const GET = async (request: NextRequest) => {
  try {
    const session = await requireSession({ roles: ["HQ", "MANAGER"] });

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse(Object.fromEntries(searchParams));

    const { type, format, from, to } = parsed;

    // Get user's tenant ID
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { tenantId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tenantId = user.tenantId;
    const fromDate = parseDate(from);
    const toDate = to ? new Date(to) : null;

    // Adjust toDate to include the entire day
    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
    }

    let csvData: string;

    if (type === "customers") {
      // Build where clause with date filters
      const whereClause: any = {
        role: "CUSTOMER",
        tenantId,
      };

      if (fromDate) {
        whereClause.createdAt = { gte: fromDate };
      }

      if (toDate) {
        if (whereClause.createdAt) {
          whereClause.createdAt.lte = toDate;
        } else {
          whereClause.createdAt = { lte: toDate };
        }
      }

      const customers = await prisma.user.findMany({
        where: whereClause,
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          createdAt: true,
          status: true,
        },
        orderBy: { createdAt: "desc" },
      });

      // Get most recent service request per customer email for address info
      const customerEmails = customers.map((c) => c.email).filter(Boolean);
      const recentRequests = customerEmails.length > 0
        ? await prisma.serviceRequest.findMany({
            where: { customerEmail: { in: customerEmails }, tenantId },
            select: { customerEmail: true, addressLine1: true, city: true, state: true, postalCode: true },
            orderBy: { createdAt: "desc" },
          })
        : [];
      const addressByEmail = new Map<string, typeof recentRequests[0]>();
      for (const req of recentRequests) {
        if (req.customerEmail && !addressByEmail.has(req.customerEmail)) {
          addressByEmail.set(req.customerEmail, req);
        }
      }

      const headers = [
        "Name",
        "Email",
        "Phone",
        "Address",
        "City",
        "State",
        "Postal Code",
        "Created At",
        "Status",
      ];

      const rows = customers.map((customer) => {
        const addr = addressByEmail.get(customer.email);
        return {
          Name: customer.firstName && customer.lastName
            ? `${customer.firstName} ${customer.lastName}`
            : customer.firstName || "",
          Email: customer.email || "",
          Phone: customer.phone || "",
          Address: addr?.addressLine1 || "",
          City: addr?.city || "",
          State: addr?.state || "",
          "Postal Code": addr?.postalCode || "",
          "Created At": customer.createdAt
            ? new Date(customer.createdAt).toISOString().split("T")[0]
            : "",
          Status: customer.status || "",
        };
      });

      csvData = toCSV(headers, rows);
    } else if (type === "leads") {
      // Build where clause with date filters
      const whereClause: any = { tenantId };

      if (fromDate) {
        whereClause.createdAt = { gte: fromDate };
      }

      if (toDate) {
        if (whereClause.createdAt) {
          whereClause.createdAt.lte = toDate;
        } else {
          whereClause.createdAt = { lte: toDate };
        }
      }

      const leads = await prisma.crmLead.findMany({
        where: whereClause,
        select: {
          businessName: true,
          contactName: true,
          contactEmail: true,
          contactPhone: true,
          industry: true,
          city: true,
          status: true,
          score: true,
          priority: true,
          callCount: true,
          source: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const headers = [
        "Business Name",
        "Contact Name",
        "Contact Email",
        "Contact Phone",
        "Industry",
        "City",
        "Status",
        "Score",
        "Priority",
        "Call Count",
        "Source",
        "Created At",
      ];

      const rows = leads.map((lead) => ({
        "Business Name": lead.businessName || "",
        "Contact Name": lead.contactName || "",
        "Contact Email": lead.contactEmail || "",
        "Contact Phone": lead.contactPhone || "",
        Industry: lead.industry || "",
        City: lead.city || "",
        Status: lead.status || "",
        Score: lead.score ?? "",
        Priority: lead.priority ?? "",
        "Call Count": lead.callCount ?? "",
        Source: lead.source || "",
        "Created At": lead.createdAt
          ? new Date(lead.createdAt).toISOString().split("T")[0]
          : "",
      }));

      csvData = toCSV(headers, rows);
    } else if (type === "jobs") {
      // Build where clause with date filters
      const whereClause: any = { tenantId };

      if (fromDate) {
        whereClause.createdAt = { gte: fromDate };
      }

      if (toDate) {
        if (whereClause.createdAt) {
          whereClause.createdAt.lte = toDate;
        } else {
          whereClause.createdAt = { lte: toDate };
        }
      }

      const jobs = await prisma.job.findMany({
        where: whereClause,
        include: {
          request: {
            select: {
              customerName: true,
              customerEmail: true,
              serviceType: true,
              addressLine1: true,
              city: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const headers = [
        "Job ID",
        "Status",
        "Scheduled Start",
        "Crew Size",
        "Payout Amount",
        "Customer Name",
        "Customer Email",
        "Service Type",
        "Address",
        "City",
      ];

      const rows = jobs.map((job) => ({
        "Job ID": job.id || "",
        Status: job.status || "",
        "Scheduled Start": job.scheduledStart
          ? new Date(job.scheduledStart).toISOString().split("T")[0]
          : "",
        "Crew Size": job.crewSize ?? "",
        "Payout Amount": job.payoutAmount ?? "",
        "Customer Name": job.request?.customerName || "",
        "Customer Email": job.request?.customerEmail || "",
        "Service Type": job.request?.serviceType || "",
        Address: job.request?.addressLine1 || "",
        City: job.request?.city || "",
      }));

      csvData = toCSV(headers, rows);
    } else {
      return NextResponse.json(
        { error: "Invalid export type" },
        { status: 400 }
      );
    }

    const filename = `tse-${type}-${getFormattedDate()}.csv`;

    return new NextResponse(csvData, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid parameters",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
};
