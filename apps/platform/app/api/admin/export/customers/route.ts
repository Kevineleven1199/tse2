import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !["HQ", "MANAGER"].includes(session.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "customers";

    if (type === "customers") {
      const users = await prisma.user.findMany({
        where: { tenantId: session.tenantId, role: "CUSTOMER" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true,
          blocked: true,
          createdAt: true,
        },
      });

      const csv = [
        "ID,First Name,Last Name,Email,Phone,Status,Blocked,Created At",
        ...users.map((u) =>
          [
            u.id,
            escapeCsv(u.firstName),
            escapeCsv(u.lastName),
            u.email,
            u.phone || "",
            u.status,
            u.blocked ? "Yes" : "No",
            u.createdAt.toISOString(),
          ].join(",")
        ),
      ].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="customers-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    if (type === "leads") {
      const leads = await prisma.crmLead.findMany({
        where: { tenantId: session.tenantId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          businessName: true,
          contactName: true,
          contactEmail: true,
          contactPhone: true,
          source: true,
          status: true,
          priority: true,
          createdAt: true,
        },
      });

      const csv = [
        "ID,Business Name,Contact Name,Email,Phone,Source,Status,Priority,Created At",
        ...leads.map((l) =>
          [
            l.id,
            escapeCsv(l.businessName),
            escapeCsv(l.contactName || ""),
            l.contactEmail || "",
            l.contactPhone || "",
            l.source || "",
            l.status,
            l.priority,
            l.createdAt.toISOString(),
          ].join(",")
        ),
      ].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    if (type === "jobs") {
      const jobs = await prisma.job.findMany({
        where: { tenantId: session.tenantId },
        orderBy: { createdAt: "desc" },
        include: {
          request: {
            select: {
              customerName: true,
              customerEmail: true,
              customerPhone: true,
              addressLine1: true,
              city: true,
              serviceType: true,
            },
          },
        },
      });

      const csv = [
        "Job ID,Status,Customer,Email,Phone,Address,City,Service Type,Scheduled Start,Payout Amount,Created At",
        ...jobs.map((j) =>
          [
            j.id,
            j.status,
            escapeCsv(j.request.customerName),
            j.request.customerEmail,
            j.request.customerPhone,
            escapeCsv(j.request.addressLine1),
            escapeCsv(j.request.city),
            j.request.serviceType,
            j.scheduledStart?.toISOString() || "",
            j.payoutAmount?.toFixed(2) || "",
            j.createdAt.toISOString(),
          ].join(",")
        ),
      ].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="jobs-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid export type. Use: customers, leads, or jobs" }, { status: 400 });
  } catch (error) {
    console.error("[export] CSV export failed:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

function escapeCsv(value: string): string {
  if (!value) return "";
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
