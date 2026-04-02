import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import CouponsClient from "./coupons-client";

export default async function CouponsPage() {
  await requireSession({ roles: ["HQ"], redirectTo: "/login" });

  try {
    const [coupons, stats] = await Promise.all([
    prisma.coupon.findMany({
      orderBy: {
        createdAt: "desc",
      },
    }).then(coupons => coupons.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    }))),
    (async () => {
      const total = await prisma.coupon.count();
      const active = await prisma.coupon.count({
        where: { active: true },
      });
      const couponData = await prisma.coupon.findMany();
      const totalUsed = couponData.reduce((sum, c) => sum + (c.usedCount || 0), 0);
      const totalDiscount = couponData.reduce((sum, c) => {
        const value = c.discountValue || 0;
        const isPercentage = c.discountType === "PERCENTAGE";
        return sum + (isPercentage ? value : value);
      }, 0);
      return {
        total,
        active,
        totalUsed,
        totalDiscount,
      };
      })(),
    ]);

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
            COUPONS
          </p>
          <h1 className="text-2xl font-semibold">Coupon Management</h1>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <p className="text-sm font-medium text-muted-foreground">Total</p>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <p className="text-sm font-medium text-muted-foreground">Active</p>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.active}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Total Uses
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Total Discount
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.totalDiscount.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        <CouponsClient initialCoupons={coupons} />
      </div>
    );
  } catch (error) {
    console.error("Failed to load Coupons:", error);
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Coupon Management</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Failed to load data. Please try refreshing the page.
        </div>
      </div>
    );
  }
}
