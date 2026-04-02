import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import { parseCsv } from "@/src/lib/csv";

export const dynamic = "force-dynamic";

// Normalize phone to digits only for dedup
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length === 10) return digits;
  if (digits.length > 10) return digits.slice(-10);
  return digits.length >= 7 ? digits : null;
}

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.includes("@") ? trimmed : null;
}

function getField(row: Record<string, string>, ...candidates: string[]): string | null {
  for (const key of candidates) {
    for (const [k, v] of Object.entries(row)) {
      if (k.trim().toLowerCase().replace(/[\s_-]/g, "") === key.toLowerCase().replace(/[\s_-]/g, "") && v?.trim()) {
        return v.trim();
      }
    }
  }
  return null;
}

type ParsedContact = {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  normalizedPhone: string | null;
  normalizedEmail: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  source: string;
  status: string;
  tags: string[];
  note: string | null;
  bookings: number;
  rawRow: Record<string, string>;
};

/**
 * POST /api/admin/import-master
 * Smart multi-source contact import with duplicate detection.
 * Accepts CSV text from Quo (OpenPhone), Jobber, BookingKoala, or generic format.
 * Deduplicates by phone AND email against each other AND existing DB records.
 *
 * Body: { csvText: string, source: "quo" | "jobber" | "bookingkoala" | "generic", dryRun?: boolean }
 */
export async function POST(request: Request) {
  const session = await requireSession({ roles: ["HQ"] });
  const tenantId = session.tenantId;

  const body = await request.json();
  const { csvText, source, dryRun } = body as { csvText: string; source: string; dryRun?: boolean };

  if (!csvText || !source) {
    return NextResponse.json({ error: "csvText and source are required" }, { status: 400 });
  }

  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows found in CSV" }, { status: 400 });
  }

  // Parse all rows into normalized contacts
  const contacts: ParsedContact[] = [];

  for (const row of rows) {
    let contact: ParsedContact;

    if (source === "quo") {
      const firstName = getField(row, "FirstName", "First Name") || "";
      const lastName = getField(row, "LastName", "Last Name") || "";
      if (!firstName && !lastName) continue;
      contact = {
        firstName, lastName,
        email: getField(row, "Email"),
        phone: getField(row, "PhoneNumber", "Phone Number"),
        normalizedPhone: normalizePhone(getField(row, "PhoneNumber", "Phone Number")),
        normalizedEmail: normalizeEmail(getField(row, "Email")),
        company: getField(row, "Company"),
        address: null, city: null, state: null, zip: null,
        source: "openphone",
        status: "active",
        tags: ["imported-quo"],
        note: getField(row, "Role"),
        bookings: 0,
        rawRow: row,
      };
    } else if (source === "jobber") {
      const firstName = getField(row, "FirstName", "First Name") || "";
      const lastName = getField(row, "LastName", "Last Name") || "";
      if (!firstName && !lastName) continue;
      const addressRaw = getField(row, "Address") || "";
      // Jobber addresses are like "1516 Lakeside Way, Flatwoods, KY, USA"
      const addressParts = addressRaw.split(",").map(s => s.trim());

      contact = {
        firstName, lastName,
        email: getField(row, "EmailAddress", "Email Address"),
        phone: getField(row, "PhoneNumber", "Phone Number"),
        normalizedPhone: normalizePhone(getField(row, "PhoneNumber", "Phone Number")),
        normalizedEmail: normalizeEmail(getField(row, "EmailAddress", "Email Address")),
        company: getField(row, "CompanyName", "Company Name"),
        address: addressParts[0] || null,
        city: getField(row, "City") || addressParts[1] || null,
        state: getField(row, "State") || null,
        zip: getField(row, "ZipPostalCode", "Zip/Postal Code") || null,
        source: "jobber",
        status: (getField(row, "Status") || "active").toLowerCase(),
        tags: (getField(row, "Tags") || "").split(",").map(t => t.trim()).filter(Boolean),
        note: getField(row, "Note"),
        bookings: parseInt(getField(row, "NumberOfBookings", "Number Of Bookings") || "0") || 0,
        rawRow: row,
      };
    } else {
      // Generic CSV
      const firstName = getField(row, "FirstName", "First Name", "first_name", "Name") || "";
      const lastName = getField(row, "LastName", "Last Name", "last_name") || "";
      if (!firstName && !lastName) continue;
      contact = {
        firstName, lastName,
        email: getField(row, "Email", "email", "EmailAddress"),
        phone: getField(row, "Phone", "phone", "PhoneNumber", "Mobile"),
        normalizedPhone: normalizePhone(getField(row, "Phone", "phone", "PhoneNumber")),
        normalizedEmail: normalizeEmail(getField(row, "Email", "email")),
        company: getField(row, "Company", "company"),
        address: getField(row, "Address", "address", "Street"),
        city: getField(row, "City", "city"),
        state: getField(row, "State", "state"),
        zip: getField(row, "Zip", "zip", "PostalCode"),
        source: "manual",
        status: "active",
        tags: ["imported"],
        note: getField(row, "Notes", "notes", "Note"),
        bookings: 0,
        rawRow: row,
      };
    }

    contacts.push(contact);
  }

  // Deduplicate within the import batch (by phone, then email)
  const phoneMap = new Map<string, ParsedContact>();
  const emailMap = new Map<string, ParsedContact>();
  const unique: ParsedContact[] = [];
  let internalDupes = 0;

  for (const c of contacts) {
    const isDupePhone = c.normalizedPhone && phoneMap.has(c.normalizedPhone);
    const isDupeEmail = c.normalizedEmail && emailMap.has(c.normalizedEmail);

    if (isDupePhone || isDupeEmail) {
      // Merge: keep the one with more data
      const existing = (isDupePhone ? phoneMap.get(c.normalizedPhone!) : emailMap.get(c.normalizedEmail!))!;
      // Enrich existing with missing fields
      if (!existing.email && c.email) existing.email = c.email;
      if (!existing.phone && c.phone) existing.phone = c.phone;
      if (!existing.address && c.address) existing.address = c.address;
      if (!existing.city && c.city) existing.city = c.city;
      if (!existing.zip && c.zip) existing.zip = c.zip;
      if (!existing.company && c.company) existing.company = c.company;
      if (c.bookings > existing.bookings) existing.bookings = c.bookings;
      existing.tags = [...new Set([...existing.tags, ...c.tags])];
      internalDupes++;
      continue;
    }

    if (c.normalizedPhone) phoneMap.set(c.normalizedPhone, c);
    if (c.normalizedEmail) emailMap.set(c.normalizedEmail, c);
    unique.push(c);
  }

  // Check against existing DB records
  const existingUsers = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true, email: true, phone: true, firstName: true, lastName: true },
  });

  const dbPhoneSet = new Set(existingUsers.map(u => normalizePhone(u.phone)).filter(Boolean));
  const dbEmailSet = new Set(existingUsers.map(u => u.email.toLowerCase()));

  let newContacts = 0;
  let dbDuplicates = 0;
  let created = 0;
  const duplicateReport: { name: string; reason: string; existingName?: string }[] = [];

  for (const c of unique) {
    const matchByPhone = c.normalizedPhone && dbPhoneSet.has(c.normalizedPhone);
    const matchByEmail = c.normalizedEmail && dbEmailSet.has(c.normalizedEmail);

    if (matchByPhone || matchByEmail) {
      dbDuplicates++;
      const matchedUser = existingUsers.find(u =>
        (matchByEmail && u.email.toLowerCase() === c.normalizedEmail) ||
        (matchByPhone && normalizePhone(u.phone) === c.normalizedPhone)
      );
      duplicateReport.push({
        name: `${c.firstName} ${c.lastName}`.trim(),
        reason: matchByEmail ? `Email match: ${c.normalizedEmail}` : `Phone match: ${c.phone}`,
        existingName: matchedUser ? `${matchedUser.firstName} ${matchedUser.lastName}`.trim() : undefined,
      });
      continue;
    }

    newContacts++;

    if (!dryRun) {
      try {
        await prisma.user.create({
          data: {
            tenantId: tenantId!,
            email: c.email || `imported-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@placeholder.local`,
            firstName: c.firstName,
            lastName: c.lastName,
            phone: c.phone,
            role: "CUSTOMER",
            status: "active",
          },
        });

        // Create address if available
        if (c.address && c.email) {
          await prisma.customerAddress.create({
            data: {
              tenantId: tenantId!,
              customerEmail: c.email,
              label: "Home",
              addressLine1: c.address,
              city: c.city || "",
              state: c.state || "FL",
              postalCode: c.zip || "",
              isPrimary: true,
            },
          }).catch(() => {}); // Skip if duplicate
        }

        created++;
      } catch (createErr: any) {
        if (createErr.code === "P2002") {
          dbDuplicates++;
          duplicateReport.push({
            name: `${c.firstName} ${c.lastName}`.trim(),
            reason: "Unique constraint (email already exists)",
          });
        }
      }
    }
  }

  await prisma.auditLog.create({
    data: {
      tenantId: tenantId!,
      actorId: session.userId,
      action: "contacts.imported",
      metadata: {
        source,
        totalRows: rows.length,
        parsed: contacts.length,
        internalDuplicates: internalDupes,
        dbDuplicates,
        newContacts,
        created: dryRun ? 0 : created,
        dryRun: !!dryRun,
      },
    },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    dryRun: !!dryRun,
    summary: {
      totalCsvRows: rows.length,
      parsed: contacts.length,
      internalDuplicatesMerged: internalDupes,
      uniqueAfterMerge: unique.length,
      alreadyInDatabase: dbDuplicates,
      newContactsToImport: newContacts,
      created: dryRun ? 0 : created,
    },
    duplicateReport: duplicateReport.slice(0, 50), // Show first 50 dupes
    sampleNewContacts: unique
      .filter(c => !dbPhoneSet.has(c.normalizedPhone ?? "") && !dbEmailSet.has(c.normalizedEmail ?? ""))
      .slice(0, 10)
      .map(c => ({ name: `${c.firstName} ${c.lastName}`.trim(), email: c.email, phone: c.phone, city: c.city, source: c.source })),
  });
}
