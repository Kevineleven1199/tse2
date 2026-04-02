import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import JobCostingClient from "./job-costing-client";

export default async function JobCostingPage() {
  await requireSession({ roles: ["HQ"], redirectTo: "/login" });

  try {
    const jobCosts = await prisma.jobCost.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalCosts = jobCosts.reduce((sum, jc) => sum + jc.amount, 0);
    const avgCostPerJob = jobCosts.length > 0 ? totalCosts / jobCosts.length : 0;

    const costsByCategory = jobCosts.reduce(
      (acc, jc) => {
        const category = jc.category || "Uncategorized";
        if (!acc[category]) {
          acc[category] = { amount: 0, count: 0 };
        }
        acc[category].amount += jc.amount;
        acc[category].count += 1;
        return acc;
      },
      {} as Record<string, { amount: number; count: number }>
    );

    const topCategory = Object.entries(costsByCategory).length > 0
      ? Object.entries(costsByCategory).sort(
          ([, a], [, b]) => b.amount - a.amount
        )[0]
      : undefined;

    // Serialize dates
    const serializedJobCosts = jobCosts.map((jc) => ({
      id: jc.id,
      jobId: jc.jobId,
      category: jc.category,
      description: jc.description,
      amount: jc.amount,
      createdAt: jc.createdAt.toISOString(),
      updatedAt: jc.updatedAt.toISOString(),
    }));

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
            FINANCIAL MANAGEMENT
          </p>
          <h1 className="text-2xl font-semibold">Job Costing</h1>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <p className="text-sm text-muted-foreground">Total Costs</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">${totalCosts.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <p className="text-sm text-muted-foreground">Avg Per Job</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">${avgCostPerJob.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <p className="text-sm text-muted-foreground">Top Category</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {topCategory ? topCategory[0] : "N/A"}
              </p>
            </CardContent>
          </Card>
        </div>

        <JobCostingClient initialData={serializedJobCosts} />
      </div>
    );
  } catch (error) {
    console.error("Failed to load Job Costing:", error);
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Job Costing</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Failed to load data. Please try refreshing the page.
        </div>
      </div>
    );
  }
}
