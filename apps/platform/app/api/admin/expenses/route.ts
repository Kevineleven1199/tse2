import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

const createExpenseSchema = z.object({
  category: z.string().min(1),
  vendor: z.string().optional(),
  description: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().datetime().or(z.string().date()),
  recurring: z.boolean().default(false),
});

type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

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

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const sortBy = searchParams.get("sortBy") || "date";
    const sortDir = (searchParams.get("sortDir") || "desc") as "asc" | "desc";

    const where: any = { tenantId };

    if (category && category !== "all") {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
        { vendor: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
      ];
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: {
        [sortBy]: sortDir,
      },
    });

    // Calculate stats
    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalCount = expenses.length;

    return NextResponse.json({
      expenses,
      stats: {
        totalAmount,
        totalCount,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/expenses] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "HQ") {
      return NextResponse.json(
        { error: "Unauthorized - HQ access required" },
        { status: 403 }
      );
    }

    const tenantId = session.tenantId;

    const json = await request.json();
    const payload = createExpenseSchema.parse(json);

    // Parse date - handle both ISO and simple date formats
    const expenseDate = payload.date.includes("T")
      ? new Date(payload.date)
      : new Date(payload.date + "T00:00:00Z");

    const expense = await prisma.expense.create({
      data: {
        tenantId,
        category: payload.category,
        vendor: payload.vendor || null,
        description: payload.description,
        amount: payload.amount,
        date: expenseDate,
        recurring: payload.recurring,
      },
    });

    return NextResponse.json(
      {
        ...expense,
        date: expense.date.toISOString(),
        createdAt: expense.createdAt.toISOString(),
        updatedAt: expense.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/admin/expenses] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.flatten() },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    );
  }
}
