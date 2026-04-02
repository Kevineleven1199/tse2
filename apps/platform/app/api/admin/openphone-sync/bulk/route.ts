/**
 * One-time bulk sync endpoint for pushing all customer contacts + addresses to OpenPhone.
 *
 * Secured with CRON_SECRET or admin session.
 *
 * GET /api/admin/openphone-sync/bulk?secret=CRON_SECRET
 *   → Runs full sync, returns results
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const API_BASE = "https://api.openphone.com/v1";

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

export async function GET(req: NextRequest) {
  // Auth: accept CRON_SECRET or OPENPHONE_API_KEY
  const secret = req.nextUrl.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;
  const opKey = process.env.OPENPHONE_API_KEY;

  const isAuthed =
    (secret && cronSecret && secret === cronSecret) ||
    (secret && opKey && secret === opKey);

  if (!isAuthed) {
    return NextResponse.json({
      error: "Unauthorized",
      hint: "Pass ?secret=CRON_SECRET or ?secret=OPENPHONE_API_KEY",
    }, { status: 401 });
  }

  const apiKey = process.env.OPENPHONE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENPHONE_API_KEY not configured" }, { status: 500 });
  }

  // Get all service requests with address data (these represent real customers with real addresses)
  const requests = await prisma.serviceRequest.findMany({
    where: {
      customerPhone: { not: "" },
      addressLine1: { not: "" },
    },
    orderBy: { createdAt: "desc" },
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
      job: { select: { scheduledStart: true } },
    },
  });

  // Deduplicate by phone number (keep most recent request)
  const byPhone = new Map<string, typeof requests[0]>();
  for (const r of requests) {
    if (!r.customerPhone) continue;
    const phone = toE164(r.customerPhone);
    if (!byPhone.has(phone)) {
      byPhone.set(phone, r);
    }
  }

  const results: Array<{ phone: string; name: string; address: string; status: string; contactId?: string }> = [];

  for (const [phone, req] of byPhone) {
    const nameParts = (req.customerName || "").split(" ");
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || "";

    const addressStr = [req.addressLine1, req.addressLine2, req.city, req.state, req.postalCode]
      .filter(Boolean)
      .join(", ");

    try {
      // Search for existing contact
      const searchRes = await fetch(`${API_BASE}/contacts?phoneNumbers[]=${encodeURIComponent(phone)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!searchRes.ok) {
        const errText = await searchRes.text();
        results.push({ phone, name: req.customerName || "", address: addressStr, status: `search_error_${searchRes.status}: ${errText}` });
        await delay(300);
        continue;
      }

      const searchData = await searchRes.json();
      const existing = searchData?.data?.[0];

      // Build payload
      const payload: Record<string, unknown> = {
        firstName,
        lastName,
        phoneNumbers: [{ value: phone, type: "mobile" }],
      };

      if (req.customerEmail) {
        payload.emails = [{ value: req.customerEmail, type: "work" }];
      }

      if (req.addressLine1) {
        payload.addresses = [{
          street: req.addressLine2 ? `${req.addressLine1}, ${req.addressLine2}` : req.addressLine1,
          city: req.city || "",
          state: req.state || "",
          zipCode: req.postalCode || "",
          country: "US",
          type: "home",
        }];
      }

      payload.company = "GGOC Client";

      if (existing?.id) {
        // Update
        const updateRes = await fetch(`${API_BASE}/contacts/${existing.id}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (updateRes.ok) {
          results.push({ phone, name: req.customerName || "", address: addressStr, status: "updated", contactId: existing.id });
        } else {
          const errText = await updateRes.text();
          results.push({ phone, name: req.customerName || "", address: addressStr, status: `update_error_${updateRes.status}: ${errText}` });
        }
      } else {
        // Create
        const createRes = await fetch(`${API_BASE}/contacts`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (createRes.ok) {
          const created = await createRes.json();
          results.push({ phone, name: req.customerName || "", address: addressStr, status: "created", contactId: created?.data?.id });
        } else {
          const errText = await createRes.text();
          results.push({ phone, name: req.customerName || "", address: addressStr, status: `create_error_${createRes.status}: ${errText}` });
        }
      }

      // Rate limiting
      await delay(300);
    } catch (error) {
      results.push({ phone, name: req.customerName || "", address: addressStr, status: `exception: ${error}` });
    }
  }

  const synced = results.filter(r => r.status === "updated" || r.status === "created").length;
  const errors = results.filter(r => r.status.includes("error") || r.status.includes("exception")).length;

  return NextResponse.json({
    summary: { total: byPhone.size, synced, errors },
    results,
  });
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
