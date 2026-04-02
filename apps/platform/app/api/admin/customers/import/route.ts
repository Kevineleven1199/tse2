import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";

interface ImportRecord {
  [key: string]: string | undefined;
}

interface ImportRequest {
  records: ImportRecord[];
  type?: "customer" | "lead";
}

interface ImportResponse {
  imported: number;
  skipped: number;
  errors: string[];
}

export async function POST(request: Request): Promise<NextResponse<ImportResponse>> {
  try {
    const session = await getSession();

    // Auth check: require HQ role
    if (!session || session.role !== "HQ") {
      return NextResponse.json(
        { imported: 0, skipped: 0, errors: ["Unauthorized: HQ role required"] },
        { status: 401 }
      );
    }

    const tenantId = session.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { imported: 0, skipped: 0, errors: ["Session missing tenantId"] },
        { status: 400 }
      );
    }

    const body: ImportRequest = await request.json();
    const { records, type = "customer" } = body;

    if (!Array.isArray(records)) {
      return NextResponse.json(
        { imported: 0, skipped: 0, errors: ["Records must be an array"] },
        { status: 400 }
      );
    }

    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    if (type === "customer") {
      for (let i = 0; i < records.length; i++) {
        const record = records[i];

        // Extract fields (normalize to titleCase/camelCase)
        const firstName = normalizeString(record.firstName);
        const lastName = normalizeString(record.lastName);
        const email = normalizeString(record.email);
        const phone = normalizeString(record.phone);
        const address = normalizeString(record.address);
        const city = normalizeString(record.city);
        const state = normalizeString(record.state);
        const postalCode = normalizeString(record.postalCode);

        // Validation: email is required
        if (!email) {
          skipped++;
          continue;
        }

        // Check for duplicate
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          skipped++;
          continue;
        }

        try {
          await prisma.user.create({
            data: {
              firstName: firstName || "Unknown",
              lastName: lastName || "Unknown",
              email,
              phone: phone || null,
              role: "CUSTOMER" as const,
              tenantId,
            },
          });
          imported++;
        } catch (error) {
          errors.push(
            `Row ${i + 1}: Failed to create customer for ${email}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
          skipped++;
        }
      }
    } else if (type === "lead") {
      for (let i = 0; i < records.length; i++) {
        const record = records[i];

        // Extract fields
        const businessName = normalizeString(record.businessName);
        const contactName = normalizeString(record.contactName);
        const contactEmail = normalizeString(record.contactEmail);
        const contactPhone = normalizeString(record.contactPhone);
        const address = normalizeString(record.address);
        const city = normalizeString(record.city);
        const state = normalizeString(record.state);
        const postalCode = normalizeString(record.postalCode);
        const website = normalizeString(record.website);
        const industry = normalizeString(record.industry);
        const sqft = record.sqft ? parseInt(record.sqft, 10) : null;
        const source = normalizeString(record.source);
        const notes = normalizeString(record.notes);

        // Validation: businessName is required
        if (!businessName) {
          skipped++;
          continue;
        }

        try {
          await prisma.crmLead.create({
            data: {
              businessName,
              contactName: contactName || null,
              contactEmail: contactEmail || null,
              contactPhone: contactPhone || null,
              address: address || null,
              city: city || null,
              state: state || null,
              postalCode: postalCode || null,
              website: website || null,
              industry: industry || null,
              sqft: sqft,
              source: source ?? undefined,
              notes: notes || null,
              lifecycleStage: "COLD_LEAD",
              tenantId,
            },
          });
          imported++;
        } catch (error) {
          errors.push(
            `Row ${i + 1}: Failed to create lead for ${businessName}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
          skipped++;
        }
      }
    } else {
      return NextResponse.json(
        { imported: 0, skipped: 0, errors: ['Type must be "customer" or "lead"'] },
        { status: 400 }
      );
    }

    return NextResponse.json({
      imported,
      skipped,
      errors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        imported: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      },
      { status: 500 }
    );
  }
}

/**
 * Normalize string: trim whitespace and return null if empty
 */
function normalizeString(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
