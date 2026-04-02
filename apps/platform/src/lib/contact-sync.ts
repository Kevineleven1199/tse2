import { prisma } from "@/lib/prisma";
import { createOrUpdateOpenPhoneContact } from "@/src/lib/openphone";

/**
 * Sync a CrmLead's data to OpenPhone contacts
 */
export async function syncContactToOpenPhone(leadId: string) {
  try {
    const lead = await prisma.crmLead.findUnique({ where: { id: leadId } });
    if (!lead || !lead.contactPhone) return null;

    // Parse name into first/last
    const nameParts = (lead.contactName || lead.businessName || "").trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Build full address string
    const addressParts = [lead.address, lead.city, lead.state, lead.postalCode].filter(Boolean);
    const fullAddress = addressParts.join(", ");

    const openphoneContactId = await createOrUpdateOpenPhoneContact({
      phoneNumber: lead.contactPhone,
      firstName,
      lastName,
      email: lead.contactEmail || undefined,
      company: lead.businessName || undefined,
      address: fullAddress || undefined,
    });

    if (openphoneContactId) {
      await prisma.crmLead.update({
        where: { id: leadId },
        data: {
          openphoneContactId,
          openphoneSyncedAt: new Date(),
        },
      });
    }

    return openphoneContactId;
  } catch (error) {
    console.error("[contact-sync] Failed to sync to OpenPhone:", error);
    return null;
  }
}

/**
 * Sync a ServiceRequest's customer to CRM + OpenPhone
 */
export async function syncServiceRequestContact(requestId: string) {
  try {
    const request = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) return null;

    // Find or create CrmLead from ServiceRequest data
    const lead = await findOrCreateCrmLead({
      phone: request.customerPhone,
      email: request.customerEmail,
      name: request.customerName,
      address: request.addressLine1,
      city: request.city,
      state: request.state,
      postalCode: request.postalCode,
      tenantId: request.tenantId,
      source: "service_request",
    });

    if (lead) {
      await syncContactToOpenPhone(lead.id);
    }

    return lead;
  } catch (error) {
    console.error("[contact-sync] ServiceRequest sync failed:", error);
    return null;
  }
}

/**
 * Find existing CrmLead by phone/email or create a new one
 */
export async function findOrCreateCrmLead(data: {
  phone: string;
  email?: string | null;
  name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  tenantId: string;
  source?: string;
}) {
  try {
    // Normalize phone (strip non-digits, ensure +1 prefix)
    const normalizedPhone = normalizePhone(data.phone);
    
    // Try to find by phone first
    let lead = await prisma.crmLead.findFirst({
      where: {
        tenantId: data.tenantId,
        contactPhone: { in: [normalizedPhone, data.phone] },
      },
    });

    // Try email if phone didn't match
    if (!lead && data.email) {
      lead = await prisma.crmLead.findFirst({
        where: {
          tenantId: data.tenantId,
          contactEmail: data.email,
        },
      });
    }

    if (lead) {
      // Update existing lead with any new info
      const updates: Record<string, any> = {};
      if (data.address && !lead.address) updates.address = data.address;
      if (data.city && !lead.city) updates.city = data.city;
      if (data.state && !lead.state) updates.state = data.state;
      if (data.postalCode && !lead.postalCode) updates.postalCode = data.postalCode;
      if (data.email && !lead.contactEmail) updates.contactEmail = data.email;
      if (data.name && !lead.contactName) updates.contactName = data.name;

      if (Object.keys(updates).length > 0) {
        lead = await prisma.crmLead.update({
          where: { id: lead.id },
          data: { ...updates, updatedAt: new Date() },
        });
      }
      return lead;
    }

    // Create new CrmLead
    return prisma.crmLead.create({
      data: {
        tenantId: data.tenantId,
        businessName: data.name || "Unknown",
        contactName: data.name,
        contactEmail: data.email,
        contactPhone: normalizedPhone,
        address: data.address,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        source: data.source || "website",
        status: "new",
      },
    });
  } catch (error) {
    console.error("[crm-matching] findOrCreateCrmLead failed:", error);
    return null;
  }
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone;
}
