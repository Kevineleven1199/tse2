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

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "HQ") {
      return NextResponse.json(
        { error: "Unauthorized - HQ access required" },
        { status: 403 }
      );
    }

    const tenantId = session.tenantId;
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // Build where clause
    const where: Record<string, unknown> = { tenantId };
    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }
    if (Object.keys(dateFilter).length > 0) {
      where.date = dateFilter;
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
    });

    const headers = [
      "Date",
      "Category",
      "Description",
      "Amount",
      "Vendor",
    ];

    const rows = expenses.map((exp) => ({
      Date: new Date(exp.date).toISOString().split("T")[0],
      Category: exp.category,
      Description: exp.description,
      Amount: exp.amount.toFixed(2),
      Vendor: exp.vendor || "",
    }));

    const csvData = toCSV(headers, rows);
    const today = new Date().toISOString().split("T")[0];
    const filename = `tse-expenses-${today}.csv`;

    return new NextResponse(csvData, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/expenses/export] Error:", error);
    return NextResponse.json(
      { error: "Failed to export expenses" },
      { status: 500 }
    );
  }
}
