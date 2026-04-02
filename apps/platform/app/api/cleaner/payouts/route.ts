import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/src/lib/utils";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  cleanerId: z.string().min(1).optional(),
  timezone: z.string().optional().default("America/New_York")
});

export const GET = async (request: Request) => {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "CLEANER" && session.role !== "HQ") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const viewer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { tenantId: true }
    });

    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      cleanerId: searchParams.get("cleanerId") ?? undefined,
      timezone: searchParams.get("timezone") ?? undefined
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Missing cleanerId." }, { status: 400 });
    }

    const { cleanerId: requestedCleanerId, timezone } = parsed.data;

    let cleanerProfileId: string;

    if (session.role === "CLEANER") {
      const profile = await prisma.cleanerProfile.findUnique({
        where: { userId: session.userId },
        select: { id: true }
      });

      if (!profile) {
        return NextResponse.json({ error: "Cleaner profile not found." }, { status: 404 });
      }

      cleanerProfileId = profile.id;
    } else {
      if (!requestedCleanerId) {
        return NextResponse.json({ error: "Missing cleanerId." }, { status: 400 });
      }

      cleanerProfileId = requestedCleanerId;
    }

    if (session.role === "HQ") {
      const target = await prisma.cleanerProfile.findUnique({
        where: { id: cleanerProfileId },
        select: {
          user: {
            select: { tenantId: true }
          }
        }
      });

      if (!target) {
        return NextResponse.json({ error: "Cleaner not found." }, { status: 404 });
      }

      if (target.user.tenantId !== viewer.tenantId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Fetch per-job payouts
    const payouts = await prisma.cleanerPayout.findMany({
      where: { cleanerId: cleanerProfileId },
      include: {
        job: {
          include: {
            request: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 50
    });

    // Also fetch paystubs (period-based payroll records)
    const cleanerProfile = await prisma.cleanerProfile.findUnique({
      where: { id: cleanerProfileId },
      select: { userId: true }
    });

    const paystubs = cleanerProfile
      ? await prisma.paystub.findMany({
          where: { cleanerId: cleanerProfileId },
          orderBy: { periodEnd: "desc" },
          take: 50
        })
      : [];

    type PayoutRow = (typeof payouts)[number];

    const upcoming = payouts.filter((payout: PayoutRow) => payout.status !== "SENT").map((payout: PayoutRow) => ({
      id: payout.id,
      amount: payout.amount,
      currency: payout.currency,
      status: payout.status,
      initiatedAt: payout.initiatedAt,
      customerName: payout.job.request.customerName,
      serviceType: payout.job.request.serviceType,
      address: {
        line1: payout.job.request.addressLine1,
        city: payout.job.request.city,
        state: payout.job.request.state
      },
      formattedAmount: formatCurrency(payout.amount, payout.currency),
      formattedInitiatedAt: payout.initiatedAt
        ? new Date(payout.initiatedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short", timeZone: timezone })
        : null
    }));

    // Combine per-job payout history with paystub history
    const payoutHistory = payouts.filter((payout: PayoutRow) => payout.status === "SENT").map((payout: PayoutRow) => ({
      id: payout.id,
      amount: payout.amount,
      currency: payout.currency,
      status: "SENT" as const,
      completedAt: payout.completedAt,
      formattedAmount: formatCurrency(payout.amount, payout.currency),
      formattedCompletedAt: payout.completedAt
        ? new Date(payout.completedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short", timeZone: timezone })
        : null,
      customerName: payout.job.request.customerName
    }));

    const paystubHistory = paystubs.map((stub) => ({
      id: stub.id,
      amount: stub.netPay,
      currency: "USD",
      status: "SENT" as const,
      completedAt: stub.periodEnd,
      formattedAmount: formatCurrency(stub.netPay),
      formattedCompletedAt: new Date(stub.periodEnd).toLocaleString([], { dateStyle: "medium", timeStyle: "short", timeZone: timezone }),
      customerName: `Pay period ${new Date(stub.periodStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(stub.periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    }));

    // Merge and sort by date descending
    const history = [...payoutHistory, ...paystubHistory].sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateB - dateA;
    });

    type UpcomingRow = (typeof upcoming)[number];

    const payoutTotal = payouts.reduce((total: number, payout: PayoutRow) => total + payout.amount, 0);
    const paystubTotal = paystubs.reduce((total, stub) => total + stub.netPay, 0);

    const totals = {
      lifetimeEarnings: payoutTotal + paystubTotal,
      pending: upcoming.reduce((total: number, payout: UpcomingRow) => total + payout.amount, 0),
      completed: payoutHistory.reduce((total, h) => total + h.amount, 0) + paystubTotal
    };

    return NextResponse.json({
      cleanerId: cleanerProfileId,
      upcoming,
      history,
      totals: {
        lifetimeEarnings: formatCurrency(totals.lifetimeEarnings),
        pending: formatCurrency(totals.pending),
        completed: formatCurrency(totals.completed)
      }
    });
  } catch (error) {
    console.error("[payouts] Failed to load cleaner payouts", error);
    return NextResponse.json({ error: "Unable to load payouts." }, { status: 500 });
  }
};
