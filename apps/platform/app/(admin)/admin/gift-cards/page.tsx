import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import GiftCardsClient from "./gift-cards-client";

export default async function GiftCardsPage() {
  await requireSession({ roles: ["HQ"], redirectTo: "/login" });

  try {
    const giftCards = await prisma.giftCard.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalIssued = giftCards.length;
    const totalBalance = giftCards.reduce((sum, gc) => sum + gc.currentBalance, 0);

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
            SALES & MARKETING
          </p>
          <h1 className="text-2xl font-semibold">Gift Cards</h1>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <p className="text-sm text-muted-foreground">Total Issued</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalIssued}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <p className="text-sm text-muted-foreground">Total Balance</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">${totalBalance.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        <GiftCardsClient initialData={giftCards.map(gc => ({
          ...gc,
          createdAt: gc.createdAt.toISOString(),
          updatedAt: gc.updatedAt.toISOString(),
          expiresAt: gc.expiresAt?.toISOString() ?? null,
        }))} />
      </div>
    );
  } catch (error) {
    console.error("Failed to load Gift Cards:", error);
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Gift Cards</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Failed to load data. Please try refreshing the page.
        </div>
      </div>
    );
  }
}
