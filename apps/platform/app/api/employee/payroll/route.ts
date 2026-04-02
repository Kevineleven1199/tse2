import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  calculatePayroll,
  calculateTeamPayroll,
  getCurrentPayPeriod,
} from "@/src/lib/payroll";

export const dynamic = "force-dynamic";

/**
 * GET /api/employee/payroll
 * Get payroll summary.
 * CLEANER: own payroll only.
 * HQ/MANAGER: any cleaner or ?all=true for team view.
 *
 * Query params:
 *   ?cleanerId=xxx
 *   ?all=true
 *   ?periodStart=2025-01-01&periodEnd=2025-01-15
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = ["HQ", "MANAGER"].includes(session.role);
    const url = new URL(request.url);
    const queryCleanerId = url.searchParams.get("cleanerId");
    const all = url.searchParams.get("all") === "true";
    const periodStartParam = url.searchParams.get("periodStart");
    const periodEndParam = url.searchParams.get("periodEnd");

    // Determine pay period
    const period = getCurrentPayPeriod();
    const periodStart = periodStartParam ? new Date(periodStartParam) : period.start;
    const periodEnd = periodEndParam ? new Date(periodEndParam) : period.end;

    // Team view (HQ/MANAGER only)
    if (all && isAdmin) {
      const team = await calculateTeamPayroll(session.tenantId, periodStart, periodEnd);
      return NextResponse.json({ team, period: { start: periodStart.toISOString(), end: periodEnd.toISOString(), label: period.label } });
    }

    // Single cleaner view
    let cleanerId = queryCleanerId;

    if (!isAdmin) {
      // CLEANER can only see own payroll
      const profile = await prisma.cleanerProfile.findUnique({
        where: { userId: session.userId },
        select: { id: true },
      });
      if (!profile) {
        return NextResponse.json({ error: "Cleaner profile not found" }, { status: 404 });
      }
      cleanerId = profile.id;
    }

    if (!cleanerId) {
      return NextResponse.json({ error: "cleanerId is required" }, { status: 400 });
    }

    // Verify the target cleaner belongs to the caller's tenant
    if (isAdmin) {
      const cleanerOwnership = await prisma.cleanerProfile.findFirst({
        where: { id: cleanerId, user: { tenantId: session.tenantId } },
        select: { id: true },
      });
      if (!cleanerOwnership) {
        return NextResponse.json({ error: "Cleaner not found" }, { status: 404 });
      }
    }

    const payroll = await calculatePayroll(cleanerId, periodStart, periodEnd);
    if (!payroll) {
      return NextResponse.json({ error: "Cleaner not found" }, { status: 404 });
    }

    return NextResponse.json(payroll);
  } catch (error) {
    console.error("[GET /api/employee/payroll] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
