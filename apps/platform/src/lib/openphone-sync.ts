/**
 * OpenPhone Contact Auto-Sync Module
 *
 * When a customer books a job or is created, their contact info (including address)
 * is automatically pushed to OpenPhone.
 *
 * Environment variables (set in Railway):
 *   OPENPHONE_API_KEY — your OpenPhone workspace API key
 */

import { prisma } from "@/lib/prisma";
import { toE164 } from "@/src/lib/openphone";

const API_BASE = "https://api.openphone.com/v1";

type SyncContactParams = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  company?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  customerId?: string;
  serviceType?: string;
  nextAppointment?: string;
};

/**
 * Syncs a single contact to OpenPhone.
 * - Checks if contact exists by phone number
 * - If exists: updates with new info (name, email, address)
 * - If not exists: creates new contact
 * - Returns the OpenPhone contact ID
 */
export async function syncContactToOpenPhone(params: SyncContactParams): Promise<string | null> {
  const apiKey = process.env.OPENPHONE_API_KEY;
  if (!apiKey) {
    console.warn("[openphone-sync] Not configured — set OPENPHONE_API_KEY in Railway env vars");
    return null;
  }

  if (!params.phoneNumber) {
    console.warn("[openphone-sync] No phone number provided, skipping sync");
    return null;
  }

  try {
    const phone = toE164(params.phoneNumber);

    // Check if contact exists by phone number
    const searchRes = await fetch(`${API_BASE}/contacts?phoneNumbers[]=${encodeURIComponent(phone)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!searchRes.ok) {
      console.error(`[openphone-sync] Search failed: ${searchRes.status}`);
      return null;
    }

    const searchData = await searchRes.json();
    const existingContact = searchData?.data?.[0];

    // Build contact payload
    const contactPayload: Record<string, unknown> = {
      firstName: params.firstName,
      lastName: params.lastName,
      phoneNumbers: [{ value: phone, type: "mobile" }],
    };

    if (params.email) {
      contactPayload.emails = [{ value: params.email, type: "work" }];
    }

    if (params.company) {
      contactPayload.company = params.company;
    }

    if (params.address) {
      contactPayload.addresses = [{
        street: params.address.street,
        city: params.address.city,
        state: params.address.state,
        zipCode: params.address.zipCode,
        country: params.address.country,
        type: "home",
      }];
    }

    // Build custom fields
    const customFields: Array<{ key: string; value: string }> = [];
    if (params.customerId) customFields.push({ key: "tse_customer_id", value: params.customerId });
    if (params.serviceType) customFields.push({ key: "service_type", value: params.serviceType });
    if (params.nextAppointment) customFields.push({ key: "next_appointment", value: params.nextAppointment });
    if (customFields.length > 0) contactPayload.customFields = customFields;

    if (existingContact?.id) {
      // Update existing contact
      const updateRes = await fetch(`${API_BASE}/contacts/${existingContact.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(contactPayload),
      });

      if (!updateRes.ok) {
        console.error(`[openphone-sync] Update failed: ${updateRes.status}`);
        return null;
      }

      console.log(`[openphone-sync] Updated contact ${existingContact.id} for ${phone}`);
      return existingContact.id;
    } else {
      // Create new contact
      const createRes = await fetch(`${API_BASE}/contacts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(contactPayload),
      });

      if (!createRes.ok) {
        console.error(`[openphone-sync] Create failed: ${createRes.status}`);
        return null;
      }

      const created = await createRes.json();
      console.log(`[openphone-sync] Created contact for ${phone}: ${created?.data?.id}`);
      return created?.data?.id || null;
    }
  } catch (error) {
    console.error("[openphone-sync] Contact sync error:", error);
    return null;
  }
}

/**
 * Called when a job is created/booked.
 * Gets customer info from the ServiceRequest and syncs to OpenPhone.
 */
export async function syncCustomerOnJobBooked(jobId: string): Promise<string | null> {
  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        request: {
          select: {
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            postalCode: true,
            serviceType: true,
          },
        },
      },
    });

    if (!job?.request) {
      console.warn(`[openphone-sync] Job ${jobId} or request not found`);
      return null;
    }

    const req = job.request;
    const nameParts = (req.customerName || "").split(" ");
    const firstName = nameParts[0] || "Unknown";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Look up if this customer has a User account
    const customerUser = await prisma.user.findFirst({
      where: { email: req.customerEmail, role: "CUSTOMER" },
      select: { id: true },
    });

    return syncContactToOpenPhone({
      firstName,
      lastName,
      phoneNumber: req.customerPhone,
      email: req.customerEmail,
      address: req.addressLine1 ? {
        street: req.addressLine2 ? `${req.addressLine1}, ${req.addressLine2}` : req.addressLine1,
        city: req.city,
        state: req.state,
        zipCode: req.postalCode,
        country: "US",
      } : undefined,
      customerId: customerUser?.id,
      serviceType: req.serviceType,
      nextAppointment: job.scheduledStart ? new Date(job.scheduledStart).toISOString().split("T")[0] : undefined,
    });
  } catch (error) {
    console.error(`[openphone-sync] Error syncing job ${jobId}:`, error);
    return null;
  }
}

/**
 * Bulk sync all customers to OpenPhone with their addresses.
 * Fetches every CUSTOMER user, finds their most recent ServiceRequest for address info,
 * and syncs each to OpenPhone with rate limiting.
 */
export async function syncAllContacts(tenantId: string): Promise<{ total: number; synced: number; errors: number }> {
  try {
    // Get all customers
    const customers = await prisma.user.findMany({
      where: { tenantId, role: "CUSTOMER" },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });

    // For each customer, find their most recent service request for address
    let synced = 0;
    let errors = 0;

    for (const customer of customers) {
      try {
        if (!customer.phone) {
          console.warn(`[openphone-sync] Skipping ${customer.email} — no phone`);
          continue;
        }

        // Get most recent service request for address
        const recentRequest = await prisma.serviceRequest.findFirst({
          where: { customerEmail: customer.email, tenantId },
          orderBy: { createdAt: "desc" },
          select: {
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            postalCode: true,
            serviceType: true,
            job: { select: { scheduledStart: true } },
          },
        });

        const contactId = await syncContactToOpenPhone({
          firstName: customer.firstName,
          lastName: customer.lastName,
          phoneNumber: customer.phone,
          email: customer.email,
          address: recentRequest?.addressLine1 ? {
            street: recentRequest.addressLine2
              ? `${recentRequest.addressLine1}, ${recentRequest.addressLine2}`
              : recentRequest.addressLine1,
            city: recentRequest.city,
            state: recentRequest.state,
            zipCode: recentRequest.postalCode,
            country: "US",
          } : undefined,
          customerId: customer.id,
          serviceType: recentRequest?.serviceType,
          nextAppointment: recentRequest?.job?.scheduledStart
            ? new Date(recentRequest.job.scheduledStart).toISOString().split("T")[0]
            : undefined,
        });

        if (contactId) {
          synced++;
        } else {
          errors++;
        }

        // Rate limit: 200ms between API calls
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`[openphone-sync] Error syncing ${customer.email}:`, error);
        errors++;
      }
    }

    console.log(`[openphone-sync] Bulk sync: ${synced}/${customers.length} synced, ${errors} errors`);
    return { total: customers.length, synced, errors };
  } catch (error) {
    console.error("[openphone-sync] Bulk sync error:", error);
    return { total: 0, synced: 0, errors: 1 };
  }
}
