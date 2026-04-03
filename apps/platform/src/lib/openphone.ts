/**
 * OpenPhone SMS Integration
 *
 * Sends SMS notifications via OpenPhone API when:
 * - A new quote is submitted (notifies HQ)
 * - A cleaner claims a job (notifies customer)
 * - Job status changes (notifies relevant parties)
 *
 * Environment variables (set in Railway):
 *   OPENPHONE_API_KEY    — your OpenPhone workspace API key
 *   OPENPHONE_FROM       — your OpenPhone number in E.164 format (e.g. +16068362534)
 *   OPENPHONE_HQ_NUMBERS — comma-separated HQ numbers to notify (e.g. +16068362534,+15551234567)
 */

const API_BASE = "https://api.openphone.com/v1";

type SmsOpts = {
  to: string[];
  content: string;
};

/**
 * Send an SMS via OpenPhone API
 * Returns true if sent, false if not configured or failed
 */
export async function sendSms(opts: SmsOpts): Promise<boolean> {
  const apiKey = process.env.OPENPHONE_API_KEY;
  const fromNumber = process.env.OPENPHONE_FROM;

  if (!apiKey || !fromNumber) {
    console.warn(
      "[openphone] Not configured — set OPENPHONE_API_KEY and OPENPHONE_FROM in Railway env vars"
    );
    console.log(`[openphone] Would have sent to ${opts.to.join(", ")}: ${opts.content}`);
    return false;
  }

  try {
    const res = await fetch(`${API_BASE}/messages`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: opts.content,
        from: fromNumber,
        to: opts.to,
      }),
    });

    if (res.ok || res.status === 202) {
      console.log(`[openphone] SMS sent to ${opts.to.join(", ")}`);
      return true;
    }

    const errText = await res.text().catch(() => "unknown error");
    console.error(`[openphone] API error ${res.status}: ${errText}`);
    return false;
  } catch (err) {
    console.error("[openphone] Failed to send SMS:", err);
    return false;
  }
}

/**
 * Format a phone number to E.164 (US numbers)
 * Handles: (606) 836-2534, 941-271-7948, 6065550100, +16068362534
 */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.startsWith("+")) return phone;
  return `+${digits}`;
}

/**
 * Get the HQ notification numbers from env
 */
function getHqNumbers(): string[] {
  const raw = process.env.OPENPHONE_HQ_NUMBERS;
  if (!raw) {
    // Default to the from number
    const from = process.env.OPENPHONE_FROM;
    return from ? [from] : [];
  }
  return raw.split(",").map((n) => n.trim()).filter(Boolean);
}

/* ─── Pre-built notification templates ─── */

/**
 * Notify HQ when a new quote is submitted
 */
export async function smsNewQuoteToHQ(data: {
  customerName: string;
  customerPhone: string;
  serviceLabel: string;
  total: number;
  city: string;
  quoteId: string;
}): Promise<void> {
  const hqNumbers = getHqNumbers();
  if (hqNumbers.length === 0) return;

  const msg = [
    `🌿 NEW QUOTE #${data.quoteId.slice(0, 6).toUpperCase()}`,
    `${data.customerName} — ${data.city}`,
    `${data.serviceLabel}: $${data.total.toFixed(2)}`,
    `📞 ${data.customerPhone}`,
    `View in dashboard: ${process.env.NEXT_PUBLIC_BASE_URL || "web-production-cfe11.up.railway.app"}/admin/requests`,
  ].join("\n");

  await sendSms({ to: hqNumbers, content: msg });
}

/**
 * Notify customer when their quote is confirmed
 */
export async function smsQuoteConfirmationToCustomer(data: {
  customerName: string;
  customerPhone: string;
  total: number;
  serviceLabel: string;
}): Promise<void> {
  const phone = toE164(data.customerPhone);

  const msg = [
    `Hi ${data.customerName}! 🌿`,
    `Your Tri State Enterprise quote is confirmed:`,
    `${data.serviceLabel} — $${data.total.toFixed(2)}`,
    ``,
    `A cleaner in your area will claim your job shortly. We'll text you when they're confirmed!`,
    ``,
    `Questions? Reply here or call (606) 836-2534`,
    `— Tri State Enterprise`,
  ].join("\n");

  await sendSms({ to: [phone], content: msg });
}

/**
 * Notify customer when a cleaner claims their job
 */
export async function smsCleanerClaimedToCustomer(data: {
  customerName: string;
  customerPhone: string;
  cleanerName: string;
}): Promise<void> {
  const phone = toE164(data.customerPhone);

  const msg = [
    `Hi ${data.customerName}! 🌿`,
    `Great news — ${data.cleanerName} has been assigned to your clean!`,
    `We'll reach out to confirm your preferred day and time.`,
    ``,
    `Questions? Reply here or call (606) 836-2534`,
    `— Tri State Enterprise`,
  ].join("\n");

  await sendSms({ to: [phone], content: msg });
}

/**
 * Notify a cleaner when a new job is available to grab
 */
export async function smsNewJobToCleaner(data: {
  cleanerPhone: string;
  cleanerName: string;
  city: string;
  serviceLabel: string;
  payoutAmount: number;
}): Promise<void> {
  const phone = toE164(data.cleanerPhone);

  const msg = [
    `Hi ${data.cleanerName}! 🌿 New job available:`,
    `${data.serviceLabel} in ${data.city}`,
    `Payout: $${data.payoutAmount.toFixed(2)}`,
    ``,
    `Claim it now: ${process.env.NEXT_PUBLIC_BASE_URL || "web-production-cfe11.up.railway.app"}/cleaner/jobs`,
    `First come, first served!`,
  ].join("\n");

  await sendSms({ to: [phone], content: msg });
}

/**
 * Create or update a contact in OpenPhone
 */
export async function createOrUpdateOpenPhoneContact(data: {
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  address?: string;
  tags?: string[];
}) {
  const apiKey = process.env.OPENPHONE_API_KEY;
  if (!apiKey) {
    console.warn("[openphone] No API key, skipping contact sync");
    return null;
  }

  try {
    // First try to find existing contact by phone
    const searchRes = await fetch(
      `https://api.openphone.com/v1/contacts?phoneNumber=${encodeURIComponent(data.phoneNumber)}`,
      {
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    const searchData = await searchRes.json();
    const existingContact = searchData?.data?.[0];

    const contactBody: Record<string, any> = {
      defaultPhoneNumber: data.phoneNumber,
    };
    if (data.firstName) contactBody.firstName = data.firstName;
    if (data.lastName) contactBody.lastName = data.lastName;
    if (data.email) contactBody.emails = [{ value: data.email }];
    if (data.company) contactBody.company = data.company;
    
    // Store address in custom fields
    const customFields: Record<string, string>[] = [];
    if (data.address) {
      customFields.push({ key: "address", value: data.address });
    }
    if (customFields.length > 0) {
      contactBody.customFields = customFields;
    }

    if (existingContact?.id) {
      // Update existing contact
      const updateRes = await fetch(
        `https://api.openphone.com/v1/contacts/${existingContact.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(contactBody),
        }
      );
      const updated = await updateRes.json();
      console.log(`[openphone] Updated contact ${existingContact.id} for ${data.phoneNumber}`);
      return updated?.data?.id || existingContact.id;
    } else {
      // Create new contact
      const createRes = await fetch("https://api.openphone.com/v1/contacts", {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactBody),
      });
      const created = await createRes.json();
      console.log(`[openphone] Created contact for ${data.phoneNumber}: ${created?.data?.id}`);
      return created?.data?.id || null;
    }
  } catch (error) {
    console.error("[openphone] Contact sync error:", error);
    return null;
  }
}
