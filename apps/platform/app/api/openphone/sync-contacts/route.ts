import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface OpenPhoneContact {
  id: string;
  externalId?: string | null;
  source?: string;
  // Default fields (OpenPhone v1 API format)
  defaultFields?: {
    firstName?: string;
    lastName?: string;
    company?: string | null;
    role?: string | null;
    emails?: Array<{ name?: string; value?: string; id?: string }>;
    phoneNumbers?: Array<{ name?: string; value?: string; id?: string }>;
  };
  customFields?: Array<{ name?: string; value?: string }> | Record<string, any>;
  // Legacy/fallback fields
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phoneNumbers?: Array<{ phoneNumber?: string; number?: string; value?: string; label?: string }>;
  emails?: Array<{ email?: string; address?: string; value?: string; label?: string }>;
  company?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SyncResult {
  totalContacts: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ id: string; error: string }>;
  sampleContact?: Record<string, unknown>;
}

export async function GET(request: Request) {
  try {
    const apiKey = process.env.OPENPHONE_API_KEY;
    const tenantId = process.env.DEFAULT_TENANT_ID;

    if (!apiKey) {
      console.error("[openphone-sync] OPENPHONE_API_KEY not set");
      return NextResponse.json(
        { error: "OPENPHONE_API_KEY not configured" },
        { status: 500 }
      );
    }

    if (!tenantId) {
      console.error("[openphone-sync] DEFAULT_TENANT_ID not set");
      return NextResponse.json(
        { error: "DEFAULT_TENANT_ID not configured" },
        { status: 500 }
      );
    }

    console.log("[openphone-sync] Starting contact sync for tenant:", tenantId);

    const result = await syncAllContacts(apiKey, tenantId);

    console.log("[openphone-sync] Sync complete:", {
      totalContacts: result.totalContacts,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors.length,
    });

    return NextResponse.json(
      {
        success: true,
        message: "OpenPhone contact sync completed",
        ...result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[openphone-sync] Fatal error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function syncAllContacts(
  apiKey: string,
  tenantId: string
): Promise<SyncResult> {
  const result: SyncResult = {
    totalContacts: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  let pageNumber = 1;
  const pageSize = 100;
  let hasMore = true;

  while (hasMore) {
    console.log(
      `[openphone-sync] Fetching page ${pageNumber} (size: ${pageSize})...`
    );

    try {
      const response = await fetch(
        `https://api.openphone.com/v1/contacts?page=${pageNumber}&pageSize=${pageSize}`,
        {
          method: "GET",
          headers: {
            Authorization: apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[openphone-sync] API error: ${response.status} - ${errorText}`
        );
        throw new Error(
          `OpenPhone API error: ${response.status} - ${errorText.substring(0, 200)}`
        );
      }

      const data = (await response.json()) as {
        data: OpenPhoneContact[];
        hasNextPage?: boolean;
        nextPage?: number;
        pagination?: { hasNextPage: boolean; nextPage?: number };
      };

      const contacts = data.data || [];
      console.log(
        `[openphone-sync] Page ${pageNumber}: fetched ${contacts.length} contacts`
      );

      // Log first contact structure for debugging
      if (pageNumber === 1 && contacts.length > 0) {
        console.log(
          `[openphone-sync] Sample contact keys: ${JSON.stringify(Object.keys(contacts[0]))}`
        );
        console.log(
          `[openphone-sync] Sample contact: ${JSON.stringify(contacts[0]).substring(0, 500)}`
        );
        result.sampleContact = contacts[0] as unknown as Record<string, unknown>;
      }

      for (const contact of contacts) {
        try {
          await upsertContact(contact, tenantId, result);
        } catch (err) {
          console.error(
            `[openphone-sync] Error upserting contact ${contact.id}:`,
            err
          );
          result.errors.push({
            id: contact.id,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      result.totalContacts += contacts.length;

      // Check for next page
      const hasNextPage =
        data.hasNextPage ?? data.pagination?.hasNextPage ?? false;
      if (!hasNextPage || contacts.length === 0) {
        hasMore = false;
      } else {
        pageNumber++;
      }
    } catch (err) {
      console.error(
        `[openphone-sync] Error fetching page ${pageNumber}:`,
        err
      );
      throw err;
    }
  }

  return result;
}

async function upsertContact(
  contact: OpenPhoneContact,
  tenantId: string,
  result: SyncResult
): Promise<void> {
  const df = contact.defaultFields;

  // Extract phone number — try defaultFields first, then legacy fields
  const phoneNumber =
    df?.phoneNumbers?.[0]?.value ||
    contact.phoneNumbers?.[0]?.phoneNumber ||
    contact.phoneNumbers?.[0]?.number ||
    contact.phoneNumbers?.[0]?.value ||
    null;

  // Extract email — try defaultFields first, then legacy fields
  const email =
    df?.emails?.[0]?.value ||
    contact.emails?.[0]?.email ||
    contact.emails?.[0]?.address ||
    contact.emails?.[0]?.value ||
    null;

  // Extract name — try defaultFields first, then legacy fields
  const firstName = df?.firstName || contact.firstName || "";
  const lastName = df?.lastName || contact.lastName || "";
  const name =
    contact.displayName ||
    `${firstName} ${lastName}`.trim() ||
    df?.company ||
    contact.company ||
    "Unknown";

  // Extract company
  const company = df?.company || contact.company || null;

  // Skip contacts without ANY identifying info
  if (!phoneNumber && !email && name === "Unknown") {
    console.log(
      `[openphone-sync] Skipping contact ${contact.id}: no phone, email, or name.`
    );
    result.skipped++;
    return;
  }

  // Extract address from custom fields (handle both array and object formats)
  let customFieldsObj: Record<string, any> = {};
  if (Array.isArray(contact.customFields)) {
    for (const field of contact.customFields) {
      if (field.name && field.value) {
        customFieldsObj[field.name] = field.value;
      }
    }
  } else if (contact.customFields && typeof contact.customFields === "object") {
    customFieldsObj = contact.customFields;
  }
  const address = extractAddress(customFieldsObj);

  // Build notes with address information
  const notes = address
    ? `Address: ${address}\n\nOpenPhone Contact ID: ${contact.id}`
    : `OpenPhone Contact ID: ${contact.id}`;

  // Build metadata
  const metadata = {
    openphoneId: contact.id,
    openphonePhone: phoneNumber,
    customFields: customFieldsObj,
    defaultFields: contact.defaultFields,
    syncedAt: new Date().toISOString(),
  };

  console.log(
    `[openphone-sync] Upserting contact: ${name} (${phoneNumber}) from OpenPhone`
  );

  try {
    // Try to find existing by phone, then email, then name
    let existing = phoneNumber
      ? await prisma.crmLead.findFirst({
          where: {
            tenantId,
            contactPhone: phoneNumber,
          },
        })
      : null;

    if (!existing && email) {
      existing = await prisma.crmLead.findFirst({
        where: { tenantId, contactEmail: email },
      });
    }

    if (existing) {
      // Update existing record
      await prisma.crmLead.update({
        where: { id: existing.id },
        data: {
          contactName: name,
          contactEmail: email,
          contactPhone: phoneNumber,
          address: address,
          notes: notes,
          metadata: metadata,
          updatedAt: new Date(),
        },
      });
      console.log(`[openphone-sync] Updated contact: ${existing.id}`);
      result.updated++;
    } else {
      // Create new record
      await prisma.crmLead.create({
        data: {
          tenantId,
          businessName: name, // Using businessName field as it's required
          contactName: name,
          contactEmail: email,
          contactPhone: phoneNumber,
          address: address,
          source: "openphone",
          status: "new",
          notes: notes,
          metadata: metadata,
        },
      });
      console.log(`[openphone-sync] Created new contact for: ${name}`);
      result.created++;
    }
  } catch (err) {
    console.error(
      `[openphone-sync] Database error for ${contact.id}:`,
      err
    );
    throw err;
  }
}

function extractAddress(customFields: Record<string, any>): string | null {
  // Look for common address field names
  const addressKeys = [
    "address",
    "homeAddress",
    "home_address",
    "streetAddress",
    "street_address",
    "location",
    "street",
  ];

  for (const key of addressKeys) {
    const value = customFields[key];
    if (value && typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  // Try to construct address from separate fields
  const parts = [];
  const streetKeys = ["street", "address1", "addressLine1"];
  const cityKey = "city";
  const stateKey = "state";
  const zipKey = ["zip", "postalCode", "zipCode"];

  for (const key of streetKeys) {
    if (customFields[key]) {
      parts.push(customFields[key]);
      break;
    }
  }

  if (customFields[cityKey]) parts.push(customFields[cityKey]);
  if (customFields[stateKey]) parts.push(customFields[stateKey]);

  for (const key of zipKey) {
    if (customFields[key]) {
      parts.push(customFields[key]);
      break;
    }
  }

  return parts.length > 0 ? parts.join(", ") : null;
}
