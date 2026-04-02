import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import ExpensesClient from "./expenses-client";

export default async function ExpensesPage() {
  await requireSession({ roles: ["HQ"], redirectTo: "/login" });

  try {
    const expenses = await prisma.expense.findMany({
      orderBy: {
        date: "desc",
      },
    });

    // Calculate stats
    const totalExpenses = expenses.length;
    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Group by category
    const byCategory: { [key: string]: number } = {};
    expenses.forEach((exp) => {
      byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
    });

    // Serialize dates
    const serializedExpenses = expenses.map((exp) => ({
      ...exp,
      date: exp.date.toISOString(),
      createdAt: exp.createdAt.toISOString(),
      updatedAt: exp.updatedAt.toISOString(),
    }));

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
            EXPENSES
          </p>
          <h1 className="text-2xl font-semibold">Expense Management</h1>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">{totalExpenses} entries</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <p className="text-sm font-medium text-muted-foreground">This Month</p>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                $
                {expenses
                  .filter((exp) => {
                    const expDate = new Date(exp.date);
                    const now = new Date();
                    return (
                      expDate.getMonth() === now.getMonth() &&
                      expDate.getFullYear() === now.getFullYear()
                    );
                  })
                  .reduce((sum, exp) => sum + exp.amount, 0)
                  .toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        <ExpensesClient initialExpenses={serializedExpenses} />
      </div>
    );
  } catch (error) {
    console.error("Failed to load Expenses:", error);
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Expense Management</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Failed to load data. Please try refreshing the page.
        </div>
      </div>
    );
  }
}
