import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = new Set([
  "labor",
  "supplies",
  "marketing",
  "software",
  "insurance",
  "fuel",
  "equipment",
  "other",
]);

const categoryAliases: Record<string, string> = {
  labour: "labor",
  payroll: "labor",
  gas: "fuel",
  tools: "equipment",
};

const payloadSchema = z.object({
  rows: z.array(z.record(z.string(), z.any())).min(1),
});

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]/g, "");
}

function getField(row: Record<string, unknown>, candidates: string[]): string | undefined {
  const keyMap = new Map<string, unknown>();
  Object.entries(row).forEach(([key, value]) => {
    keyMap.set(normalizeKey(key), value);
  });

  for (const candidate of candidates) {
    const value = keyMap.get(normalizeKey(candidate));
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text.length > 0) return text;
  }
  return undefined;
}

function parseAmount(value: string | undefined): number | null {
  if (!value) return null;
  const normalized = value.replace(/\$/g, "").replace(/,/g, "").trim();
  const number = Number.parseFloat(normalized);
  return Number.isFinite(number) ? number : null;
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  return ["true", "1", "yes", "y"].includes(value.toLowerCase().trim());
}

function normalizeCategory(value: string | undefined): string {
  if (!value) return "other";
  const base = value.trim().toLowerCase();
  const mapped = categoryAliases[base] ?? base;
  return VALID_CATEGORIES.has(mapped) ? mapped : "other";
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const viewer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { tenantId: true },
    });

    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid import payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [index, row] of parsed.data.rows.entries()) {
      const rowNum = index + 2;
      const id = getField(row, ["id"]);
      const description = getField(row, ["description", "memo", "note", "details"]);
      const amount = parseAmount(getField(row, ["amount", "cost", "value"]));
      const date = parseDate(getField(row, ["date", "expense_date", "transaction_date"]));

      if (!description || amount === null || !date) {
        skipped += 1;
        errors.push(`Row ${rowNum}: description, amount, and date are required.`);
        continue;
      }

      const payload = {
        category: normalizeCategory(getField(row, ["category", "expense_category"])),
        vendor: getField(row, ["vendor", "payee", "merchant"]) ?? null,
        description,
        amount,
        date,
        recurring: parseBoolean(getField(row, ["recurring", "is_recurring"])),
        receiptUrl: getField(row, ["receipturl", "receipt_url"]) ?? null,
      };

      try {
        if (id) {
          const existing = await prisma.expense.findUnique({
            where: { id },
            select: { id: true, tenantId: true },
          });
          if (existing && existing.tenantId === viewer.tenantId) {
            await prisma.expense.update({
              where: { id: existing.id },
              data: payload,
            });
            updated += 1;
            continue;
          }
        }

        await prisma.expense.create({
          data: {
            tenantId: viewer.tenantId,
            createdBy: session.userId,
            ...payload,
          },
        });
        created += 1;
      } catch (error) {
        skipped += 1;
        errors.push(`Row ${rowNum}: failed to import.`);
      }
    }

    return NextResponse.json({
      ok: true,
      created,
      updated,
      skipped,
      total: parsed.data.rows.length,
      errors: errors.slice(0, 25),
    });
  } catch (error) {
    console.error("[admin-expenses-import] Failed", error);
    return NextResponse.json({ error: "Failed to import expenses CSV" }, { status: 500 });
  }
}
