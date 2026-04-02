import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

// CSV escape helper
function escapeCSV(field: unknown): string {
  if (field === null || field === undefined) return "";
  let value = String(field);
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    value = '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function toCSV(headers: string[], rows: Record<string, unknown>[]): string {
  const lines: string[] = [headers.map(escapeCSV).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCSV(row[h])).join(","));
  }
  return lines.join("\n");
}

function formatTime(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "HQ") {
      return NextResponse.json(
        { error: "Unauthorized - HQ access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // Build date filter
    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }

    const where: Record<string, unknown> = {};
    if (Object.keys(dateFilter).length > 0) {
      where.date = dateFilter;
    }

    const timesheets = await prisma.timesheet.findMany({
      where,
      include: {
        cleaner: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    const headers = [
      "Cleaner Name",
      "Date",
      "Clock In",
      "Clock Out",
      "Hours Worked",
      "Hourly Rate",
      "Total Pay",
    ];

    const rows = timesheets.map((ts) => {
      const cleanerName = ts.cleaner.user
        ? `${ts.cleaner.user.firstName || ""} ${ts.cleaner.user.lastName || ""}`.trim()
        : "Unknown";
      const hours = ts.hoursWorked ?? 0;
      const rate = ts.cleaner.hourlyRate ?? 25;
      const totalPay = hours * rate;

      return {
        "Cleaner Name": cleanerName,
        Date: formatDate(ts.date),
        "Clock In": formatTime(ts.clockIn),
        "Clock Out": formatTime(ts.clockOut),
        "Hours Worked": hours.toFixed(2),
        "Hourly Rate": rate.toFixed(2),
        "Total Pay": totalPay.toFixed(2),
      };
    });

    const csvData = toCSV(headers, rows);
    const today = new Date().toISOString().split("T")[0];
    const filename = `tse-payroll-${today}.csv`;

    return new NextResponse(csvData, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/payroll/export] Error:", error);
    return NextResponse.json(
      { error: "Failed to export payroll data" },
      { status: 500 }
    );
  }
}
