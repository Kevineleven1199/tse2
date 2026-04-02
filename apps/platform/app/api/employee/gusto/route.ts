/**
 * GET /api/employee/gusto
 * Fetch pay stubs for a cleaner from Gusto
 * Query params: employeeId, year
 */

import { NextRequest, NextResponse } from "next/server";
import { getPayStubs } from "@/src/lib/gusto";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const employeeId = searchParams.get("employeeId");
  const year = searchParams.get("year") || new Date().getFullYear().toString();

  if (!employeeId) {
    return NextResponse.json(
      { error: "Missing required parameter: employeeId" },
      { status: 400 }
    );
  }

  try {
    // Fetch pay stubs for the specified year
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const payStubs = await getPayStubs(employeeId, startDate, endDate);

    if (!payStubs) {
      return NextResponse.json(
        { error: "Failed to fetch pay stubs from Gusto" },
        { status: 500 }
      );
    }

    if (payStubs.length === 0) {
      return NextResponse.json(
        {
          year: parseInt(year),
          payHistory: [],
          summary: {
            totalGrossPay: 0,
            totalNetPay: 0,
            totalDeductions: 0,
            payPeriods: 0,
          },
        },
        { status: 200 }
      );
    }

    // Format pay history for display
    const payHistory = payStubs.map((stub) => {
      // Calculate total deductions
      const totalDeductions = stub.deductions?.reduce(
        (sum, d) => sum + d.amount,
        0
      ) ?? 0;

      return {
        id: stub.id,
        payPeriod: {
          start: stub.pay_period_start,
          end: stub.pay_period_end,
          label: formatPayPeriod(stub.pay_period_start, stub.pay_period_end),
        },
        grossPay: stub.gross_pay,
        netPay: stub.net_pay,
        deductions: totalDeductions,
        deductionDetails: stub.deductions ?? [],
        checkNumber: stub.check_number,
        processedDate: stub.processed_date,
        paymentMethod: stub.payment_method,
      };
    });

    // Calculate summary statistics
    const summary = {
      totalGrossPay: payStubs.reduce((sum, s) => sum + s.gross_pay, 0),
      totalNetPay: payStubs.reduce((sum, s) => sum + s.net_pay, 0),
      totalDeductions: payHistory.reduce((sum, p) => sum + p.deductions, 0),
      payPeriods: payStubs.length,
    };

    return NextResponse.json(
      {
        year: parseInt(year),
        employeeId,
        payHistory,
        summary,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[gusto-api] Error fetching pay stubs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Format a pay period date range as a readable label
 */
function formatPayPeriod(startDate: string, endDate: string): string {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startMonth = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const endMonth = end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return `${startMonth} - ${endMonth}`;
  } catch {
    return `${startDate} to ${endDate}`;
  }
}
