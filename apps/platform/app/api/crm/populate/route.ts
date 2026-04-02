import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * POST /api/crm/populate
 * Mines all CallTranscripts + metadata to create/update CrmLead records.
 * Deduplicates by phone number, merges data from multiple calls.
 * HQ-only endpoint.
 */
export const POST = async () => {
  try {
    const session = await requireSession({ roles: ["HQ"] });

    // 1. Fetch all transcripts
    const transcripts = await prisma.callTranscript.findMany({
      orderBy: { createdAt: "desc" },
    });

    const goGreenNumbers = new Set(["+16065550100", "+18132805468"]); // TriState main + secondary lines

    // 2. Aggregate by phone number
    type ContactData = {
      phone: string;
      names: string[];
      emails: string[];
      addresses: string[];
      services: string[];
      summaries: string[];
      callCount: number;
      lastCallAt: Date | null;
      sentiment: string;
      sqft: number | null;
      bedrooms: number | null;
      bathrooms: number | null;
      followUpNeeded: boolean;
      followUpNotes: string[];
      estimatedTotal: number | null;
      metadata: Record<string, unknown>[];
    };

    const contactMap = new Map<string, ContactData>();

    for (const t of transcripts) {
      // Determine the customer phone number
      let customerPhone = t.customerPhone || t.phoneNumber || "";

      // For inbound calls, the phoneNumber might be TriState's number
      // Look at metadata.participants to find the external number
      if (goGreenNumbers.has(customerPhone) && t.metadata) {
        const meta = t.metadata as Record<string, unknown>;
        const participants = meta.participants as string[] | undefined;
        if (participants) {
          const externalNum = participants.find((p) => !goGreenNumbers.has(p));
          if (externalNum) customerPhone = externalNum;
        }
      }

      // Skip if we still only have TriState's own number or empty
      if (!customerPhone || goGreenNumbers.has(customerPhone)) continue;

      // Skip voicemails and junk calls with no useful data
      const summary = t.summary || "";
      const isVoicemail =
        summary.toLowerCase().includes("voicemail") &&
        !t.customerName &&
        !t.address &&
        !t.propertyAddress;
      const isJunk =
        summary.toLowerCase().includes("no actual conversation") ||
        summary.toLowerCase().includes("no information was exchanged") ||
        summary.toLowerCase().includes("automated greeting");

      // Get or create contact entry
      if (!contactMap.has(customerPhone)) {
        contactMap.set(customerPhone, {
          phone: customerPhone,
          names: [],
          emails: [],
          addresses: [],
          services: [],
          summaries: [],
          callCount: 0,
          lastCallAt: null,
          sentiment: "neutral",
          sqft: null,
          bedrooms: null,
          bathrooms: null,
          followUpNeeded: false,
          followUpNotes: [],
          estimatedTotal: null,
          metadata: [],
        });
      }

      const contact = contactMap.get(customerPhone)!;
      contact.callCount += 1;

      if (!contact.lastCallAt || t.createdAt > contact.lastCallAt) {
        contact.lastCallAt = t.createdAt;
      }

      // Collect all non-null data points
      if (t.customerName && t.customerName !== "None") {
        contact.names.push(t.customerName);
      }
      if (t.customerEmail && t.customerEmail !== "None") {
        contact.emails.push(t.customerEmail);
      }

      const addr = t.address || t.propertyAddress || "";
      if (addr && addr !== "None") {
        contact.addresses.push(addr);
      }

      const svc = t.serviceType || t.estimatedService || "";
      if (svc && svc !== "None" && !contact.services.includes(svc)) {
        contact.services.push(svc);
      }

      if (summary && !isVoicemail && !isJunk && summary.length > 30) {
        contact.summaries.push(summary.slice(0, 300));
      }

      if (t.sentiment === "positive" || (t.sentiment === "negative" && contact.sentiment !== "positive")) {
        contact.sentiment = t.sentiment;
      }

      if (t.sqft) contact.sqft = t.sqft;
      if (t.bedrooms) contact.bedrooms = t.bedrooms;
      if (t.bathrooms) contact.bathrooms = t.bathrooms;
      if (t.followUpNeeded) contact.followUpNeeded = true;
      if (t.followUpNotes) contact.followUpNotes.push(t.followUpNotes);
      if (t.estimatedTotal) contact.estimatedTotal = t.estimatedTotal;

      // Extract names from OpenPhone metadata if available
      if (t.metadata) {
        const meta = t.metadata as Record<string, unknown>;
        const opSummary = meta.openPhoneSummary as string[] | undefined;
        if (opSummary) {
          contact.metadata.push({ openPhoneSummary: opSummary });
        }
        // Extract contact IDs from OpenPhone
        const contactIds = meta.contactIds as string[] | undefined;
        if (contactIds && contactIds.length > 0) {
          contact.metadata.push({ openPhoneContactIds: contactIds });
        }
      }
    }

    // 3. Create CRM leads from aggregated contacts
    const tenantId = session.tenantId;
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const results: { phone: string; name: string; action: string }[] = [];

    for (const [phone, contact] of contactMap) {
      // Pick the best name (longest, most complete)
      const bestName =
        contact.names
          .filter((n) => n && n !== "None")
          .sort((a, b) => b.length - a.length)[0] || "";

      // Skip if this is clearly not a customer (sales calls to TriState, etc.)
      const allSummaries = contact.summaries.join(" ").toLowerCase();
      const isSalesCall =
        allSummaries.includes("sales representative") &&
        !allSummaries.includes("cleaning") &&
        !allSummaries.includes("pressure wash");

      if (isSalesCall && !bestName && contact.callCount <= 1) {
        skipped++;
        results.push({ phone, name: bestName || "Unknown", action: "skipped (sales call)" });
        continue;
      }

      const bestEmail = contact.emails.find((e) => e && e !== "None") || null;
      const bestAddress = contact.addresses.sort((a, b) => b.length - a.length)[0] || null;

      // Determine status based on data quality
      let status = "new";
      if (contact.sentiment === "positive" && contact.callCount >= 2) {
        status = "qualified";
      } else if (contact.callCount >= 2) {
        status = "contacted";
      }

      // Determine source
      const source = "openphone_call";

      // Build notes from summaries
      const notes = contact.summaries
        .slice(0, 5)
        .map((s, i) => `[Call ${i + 1}] ${s}`)
        .join("\n\n");

      // Build tags
      const tags: string[] = [];
      if (contact.services.length > 0) {
        tags.push(...contact.services.map((s) => s.replace(/_/g, "-")));
      }
      if (contact.followUpNeeded) tags.push("follow-up");
      if (contact.sentiment === "positive") tags.push("warm-lead");
      if (contact.sentiment === "negative") tags.push("needs-attention");
      if (contact.callCount >= 3) tags.push("frequent-caller");

      // Score based on data completeness
      let score = 0;
      if (bestName) score += 20;
      if (bestEmail) score += 15;
      if (bestAddress) score += 15;
      if (contact.services.length > 0) score += 20;
      if (contact.callCount >= 2) score += 10;
      if (contact.sentiment === "positive") score += 10;
      if (contact.sqft) score += 5;
      if (contact.followUpNeeded) score += 5;

      // Parse address into city/state if possible
      let city: string | null = null;
      let state: string | null = null;
      if (bestAddress) {
        // Try to extract FL cities
        const flCities = [
          "Flatwoods",
          "Ashland",
          "South Shore",
          "Huntington",
          "St Petersburg",
          "Venice",
          "Nokomis",
          "Osprey",
          "Russell",
          "Catlettsburg",
          "Palmetto",
          "Ellenton",
          "Parrish",
        ];
        for (const c of flCities) {
          if (bestAddress.toLowerCase().includes(c.toLowerCase())) {
            city = c;
            state = "FL";
            break;
          }
        }
      }

      // Check if lead already exists by phone
      const existing = await prisma.crmLead.findFirst({
        where: { contactPhone: phone },
      });

      if (existing) {
        // Update with any new data
        const updateData: Record<string, unknown> = {};
        if (bestName && !existing.contactName) updateData.contactName = bestName;
        if (bestName && !existing.businessName) updateData.businessName = bestName;
        if (bestEmail && !existing.contactEmail) updateData.contactEmail = bestEmail;
        if (bestAddress && !existing.address) updateData.address = bestAddress;
        if (city && !existing.city) updateData.city = city;
        if (state && !existing.state) updateData.state = state;
        if (contact.sqft && !existing.sqft) updateData.sqft = contact.sqft;
        if (notes && !existing.notes) updateData.notes = notes;
        if (tags.length > 0)
          updateData.tags = [...new Set([...(existing.tags || []), ...tags])];
        updateData.callCount = contact.callCount;
        updateData.score = Math.max(existing.score, score);
        if (contact.lastCallAt) updateData.lastContactedAt = contact.lastCallAt;

        if (Object.keys(updateData).length > 0) {
          await prisma.crmLead.update({
            where: { id: existing.id },
            data: updateData,
          });
          updated++;
          results.push({ phone, name: bestName || existing.contactName || "Unknown", action: "updated" });
        }
      } else {
        // Create new lead
        await prisma.crmLead.create({
          data: {
            tenantId,
            businessName: bestName || `Contact ${phone}`,
            contactName: bestName || null,
            contactEmail: bestEmail,
            contactPhone: phone,
            address: bestAddress,
            city,
            state,
            sqft: contact.sqft,
            source,
            status,
            score,
            callCount: contact.callCount,
            lastContactedAt: contact.lastCallAt,
            notes: notes || null,
            tags,
            priority: score >= 50 ? 1 : score >= 30 ? 2 : 3,
            aiInsights: contact.summaries.length > 0
              ? `${contact.callCount} calls recorded. Services discussed: ${contact.services.join(", ") || "general inquiry"}. Sentiment: ${contact.sentiment}.`
              : null,
          },
        });
        created++;
        results.push({ phone, name: bestName || "Unknown", action: "created" });
      }
    }

    return NextResponse.json({
      success: true,
      totalTranscripts: transcripts.length,
      uniqueContacts: contactMap.size,
      created,
      updated,
      skipped,
      results,
    });
  } catch (error) {
    console.error("[crm/populate] error", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
};
