import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

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

function parseOptionalInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return undefined;
  return number;
}

function parseTags(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[;,|]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
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
      const businessName =
        getField(row, ["businessName", "business_name", "company", "company_name"]) ??
        getField(row, ["contactName", "contact_name", "name"]);

      if (!businessName) {
        skipped += 1;
        errors.push(`Row ${rowNum}: businessName or company is required.`);
        continue;
      }

      const contactEmail = getField(row, ["contactEmail", "email"]);
      const payload = {
        businessName,
        contactName: getField(row, ["contactName", "name", "full_name"]) ?? null,
        contactEmail: contactEmail ?? null,
        contactPhone: getField(row, ["contactPhone", "phone", "mobile"]) ?? null,
        address: getField(row, ["address", "street", "street_address"]) ?? null,
        city: getField(row, ["city"]) ?? null,
        state: getField(row, ["state", "province"]) ?? null,
        postalCode: getField(row, ["postalCode", "zip", "zipcode"]) ?? null,
        website: getField(row, ["website", "url"]) ?? null,
        industry: getField(row, ["industry"]) ?? null,
        sqft: parseOptionalInt(getField(row, ["sqft", "square_feet"])) ?? null,
        source: getField(row, ["source"]) ?? "manual",
        status: getField(row, ["status"]) ?? "new",
        priority: parseOptionalInt(getField(row, ["priority"])) ?? 3,
        notes: getField(row, ["notes", "note"]) ?? null,
        tags: parseTags(getField(row, ["tags", "labels"])),
        lastContactedAt:
          parseDate(getField(row, ["lastContactedAt", "last_contacted_at"])) ?? null,
        nextFollowUpAt:
          parseDate(getField(row, ["nextFollowUpAt", "next_follow_up_at"])) ?? null,
      };

      try {
        if (id) {
          const existingById = await prisma.crmLead.findUnique({
            where: { id },
            select: { id: true, tenantId: true },
          });

          if (existingById && existingById.tenantId === viewer.tenantId) {
            await prisma.crmLead.update({
              where: { id: existingById.id },
              data: payload,
            });
            updated += 1;
            continue;
          }
        }

        if (contactEmail) {
          const existingByEmail = await prisma.crmLead.findFirst({
            where: {
              tenantId: viewer.tenantId,
              contactEmail,
            },
            select: { id: true },
          });

          if (existingByEmail) {
            await prisma.crmLead.update({
              where: { id: existingByEmail.id },
              data: payload,
            });
            updated += 1;
            continue;
          }
        }

        await prisma.crmLead.create({
          data: {
            tenantId: viewer.tenantId,
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
    console.error("[admin-contacts-import] Failed", error);
    return NextResponse.json({ error: "Failed to import contacts CSV" }, { status: 500 });
  }
}
