import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const LOYALTY_TIERS = [
  { name: "Seedling", minXp: 0, discount: 0, perks: "Welcome to TriState!" },
  { name: "Sprout", minXp: 50, discount: 5, perks: "5% off recurring cleans" },
  { name: "Bloom", minXp: 200, discount: 10, perks: "10% off + priority scheduling" },
  { name: "Evergreen", minXp: 500, discount: 15, perks: "15% off + free add-on per quarter" },
  { name: "Canopy", minXp: 1000, discount: 20, perks: "20% off + dedicated cleaner + VIP support" },
];

function getTier(xp: number) {
  let tier = LOYALTY_TIERS[0];
  for (const t of LOYALTY_TIERS) {
    if (xp >= t.minXp) tier = t;
  }
  return tier;
}

// GET: Dashboard — all customers with their loyalty tiers
export async function GET() {
  const session = await getSession();
  if (!session || !["HQ", "MANAGER"].includes(session.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customers = await prisma.user.findMany({
    where: { tenantId: session.tenantId, role: "CUSTOMER" },
    select: { id: true, firstName: true, lastName: true, email: true, xp: true, createdAt: true },
    orderBy: { xp: "desc" },
    take: 200,
  });

  const customersWithTiers = customers.map((c) => ({
    ...c,
    tier: getTier(c.xp),
    nextTier: LOYALTY_TIERS.find((t) => t.minXp > c.xp) || null,
    xpToNext: (LOYALTY_TIERS.find((t) => t.minXp > c.xp)?.minXp || c.xp) - c.xp,
  }));

  const tierDistribution = LOYALTY_TIERS.map((t) => ({
    ...t,
    count: customersWithTiers.filter((c) => c.tier.name === t.name).length,
  }));

  return NextResponse.json({
    tiers: LOYALTY_TIERS,
    customers: customersWithTiers,
    distribution: tierDistribution,
    totalCustomers: customers.length,
    avgXp: customers.length > 0 ? Math.round(customers.reduce((s, c) => s + c.xp, 0) / customers.length) : 0,
  });
}
