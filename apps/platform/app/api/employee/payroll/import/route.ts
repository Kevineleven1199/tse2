import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  dataset: z.enum(["timesheets", "adjustments", "paystubs"]),
  rows: z.array(z.record(z.string(), z.any())).min(1),
});

type CleanerLookup = {
  id: string;
  email: string;
  fullName: string;
};

const adjustmentTypeAliases: Record<string, "deduction" | "reimbursement" | "bonus"> = {
  deduction: "deduction",
  deduct: "deduction",
  reimburse: "reimbursement",
  reimbursement: "reimbursement",
  bonus: "bonus",
};

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

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const normalized = value.replace(/\$/g, "").replace(/,/g, "");
  const number = Number.parseFloat(normalized);
  return Number.isFinite(number) ? number : null;
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  return ["true", "1", "yes", "y"].includes(value.toLowerCase());
}

function buildPeriodLabel(start: Date, end: Date): string {
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

function resolveCleaner(
  row: Record<string, unknown>,
  cleanersById: Map<string, CleanerLookup>,
  cleanersByEmail: Map<string, CleanerLookup>,
  cleanersByName: Map<string, CleanerLookup>
): CleanerLookup | null {
  const byId = getField(row, ["cleanerId", "cleaner_id", "employee_id"]);
  if (byId && cleanersById.has(byId)) return cleanersById.get(byId)!;

  const byEmail = getField(row, ["cleanerEmail", "email", "employee_email"]);
  if (byEmail) {
    const key = byEmail.toLowerCase();
    if (cleanersByEmail.has(key)) return cleanersByEmail.get(key)!;
  }

  const byName = getField(row, ["cleanerName", "employee", "employee_name", "name"]);
  if (byName) {
    const key = byName.toLowerCase().replace(/\s+/g, " ").trim();
    if (cleanersByName.has(key)) return cleanersByName.get(key)!;
  }

  return null;
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

    const cleanerProfiles = await prisma.cleanerProfile.findMany({
      where: { user: { tenantId: viewer.tenantId } },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    const cleanersById = new Map<string, CleanerLookup>();
    const cleanersByEmail = new Map<string, CleanerLookup>();
    const cleanersByName = new Map<string, CleanerLookup>();

    cleanerProfiles.forEach((profile) => {
      const cleaner: CleanerLookup = {
        id: profile.id,
        email: profile.user.email.toLowerCase(),
        fullName: `${profile.user.firstName} ${profile.user.lastName}`
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim(),
      };
      cleanersById.set(cleaner.id, cleaner);
      cleanersByEmail.set(cleaner.email, cleaner);
      cleanersByName.set(cleaner.fullName, cleaner);
    });

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [index, row] of parsed.data.rows.entries()) {
      const rowNum = index + 2;
      const id = getField(row, ["id"]);
      const cleaner = resolveCleaner(row, cleanersById, cleanersByEmail, cleanersByName);

      if (!cleaner) {
        skipped += 1;
        errors.push(`Row ${rowNum}: cleaner reference not found.`);
        continue;
      }

      try {
        if (parsed.data.dataset === "timesheets") {
          const date = parseDate(getField(row, ["date", "work_date"]));
          const clockIn =
            parseDate(getField(row, ["clockIn", "clock_in", "start", "start_time"])) ??
            date;
          const clockOut = parseDate(getField(row, ["clockOut", "clock_out", "end", "end_time"]));
          const explicitHours = parseNumber(getField(row, ["hoursWorked", "hours", "total_hours"]));

          if (!date || !clockIn) {
            skipped += 1;
            errors.push(`Row ${rowNum}: date and clockIn are required for timesheets.`);
            continue;
          }

          const calculatedHours =
            explicitHours ??
            (clockOut
              ? Math.round(((clockOut.getTime() - clockIn.getTime()) / 3600000) * 100) / 100
              : null);

          const payload = {
            cleanerId: cleaner.id,
            jobId: getField(row, ["jobId", "job_id"]) ?? null,
            date,
            clockIn,
            clockOut,
            hoursWorked: calculatedHours,
            source: getField(row, ["source"]) ?? "manual",
            notes: getField(row, ["notes", "note"]) ?? null,
            approved: parseBoolean(getField(row, ["approved", "is_approved"])),
            approvedBy: parseBoolean(getField(row, ["approved", "is_approved"]))
              ? session.userId
              : null,
          };

          if (id) {
            const existing = await prisma.timesheet.findUnique({
              where: { id },
              include: { cleaner: { include: { user: { select: { tenantId: true } } } } },
            });
            if (existing && existing.cleaner.user.tenantId === viewer.tenantId) {
              await prisma.timesheet.update({ where: { id }, data: payload });
              updated += 1;
              continue;
            }
          }

          await prisma.timesheet.create({ data: payload });
          created += 1;
          continue;
        }

        if (parsed.data.dataset === "adjustments") {
          const rawType = getField(row, ["type", "adjustment_type"])?.toLowerCase() ?? "";
          const type = adjustmentTypeAliases[rawType];
          const amount = parseNumber(getField(row, ["amount", "value"]));
          const description = getField(row, ["description", "memo", "note"]);
          const payPeriodStart = parseDate(getField(row, ["payPeriodStart", "period_start"]));
          const payPeriodEnd = parseDate(getField(row, ["payPeriodEnd", "period_end"]));

          if (!type || amount === null || !description || !payPeriodStart || !payPeriodEnd) {
            skipped += 1;
            errors.push(
              `Row ${rowNum}: type, amount, description, payPeriodStart and payPeriodEnd are required for adjustments.`
            );
            continue;
          }

          const payload = {
            cleanerId: cleaner.id,
            type,
            amount,
            description,
            payPeriodStart,
            payPeriodEnd,
            createdBy: session.userId,
          };

          if (id) {
            const existing = await prisma.payrollAdjustment.findUnique({
              where: { id },
              include: { cleaner: { include: { user: { select: { tenantId: true } } } } },
            });
            if (existing && existing.cleaner.user.tenantId === viewer.tenantId) {
              await prisma.payrollAdjustment.update({ where: { id }, data: payload });
              updated += 1;
              continue;
            }
          }

          await prisma.payrollAdjustment.create({ data: payload });
          created += 1;
          continue;
        }

        const periodStart = parseDate(getField(row, ["periodStart", "period_start"]));
        const periodEnd = parseDate(getField(row, ["periodEnd", "period_end"]));
        const totalHours = parseNumber(getField(row, ["totalHours", "hours", "hours_worked"]));
        const hourlyRate = parseNumber(getField(row, ["hourlyRate", "hourly_rate", "rate"]));
        const grossPay = parseNumber(getField(row, ["grossPay", "gross_pay", "gross"]));
        const deductions = parseNumber(getField(row, ["deductions"])) ?? 0;
        const reimbursements = parseNumber(getField(row, ["reimbursements"])) ?? 0;
        const bonuses = parseNumber(getField(row, ["bonuses"])) ?? 0;
        const netPay = parseNumber(getField(row, ["netPay", "net_pay", "net"]));
        const status = (getField(row, ["status"]) ?? "finalized").toLowerCase() === "draft"
          ? "draft"
          : "finalized";

        if (!periodStart || !periodEnd || totalHours === null || hourlyRate === null || grossPay === null || netPay === null) {
          skipped += 1;
          errors.push(
            `Row ${rowNum}: periodStart, periodEnd, totalHours, hourlyRate, grossPay and netPay are required for paystubs.`
          );
          continue;
        }

        const payload = {
          cleanerId: cleaner.id,
          periodStart,
          periodEnd,
          periodLabel: getField(row, ["periodLabel", "period_label"]) ?? buildPeriodLabel(periodStart, periodEnd),
          totalHours,
          hourlyRate,
          grossPay,
          deductions,
          reimbursements,
          bonuses,
          netPay,
          status,
          finalizedAt: status === "finalized" ? new Date() : null,
          finalizedBy: status === "finalized" ? session.userId : null,
        };

        if (id) {
          const existing = await prisma.paystub.findUnique({
            where: { id },
            include: { cleaner: { include: { user: { select: { tenantId: true } } } } },
          });
          if (existing && existing.cleaner.user.tenantId === viewer.tenantId) {
            await prisma.paystub.update({ where: { id }, data: payload });
            updated += 1;
            continue;
          }
        }

        await prisma.paystub.upsert({
          where: {
            cleanerId_periodStart_periodEnd: {
              cleanerId: cleaner.id,
              periodStart,
              periodEnd,
            },
          },
          update: payload,
          create: payload,
        });
        created += 1;
      } catch (error) {
        skipped += 1;
        errors.push(`Row ${rowNum}: failed to import ${parsed.data.dataset}.`);
      }
    }

    return NextResponse.json({
      ok: true,
      dataset: parsed.data.dataset,
      created,
      updated,
      skipped,
      total: parsed.data.rows.length,
      errors: errors.slice(0, 25),
    });
  } catch (error) {
    console.error("[employee-payroll-import] Failed", error);
    return NextResponse.json({ error: "Failed to import payroll CSV" }, { status: 500 });
  }
}
