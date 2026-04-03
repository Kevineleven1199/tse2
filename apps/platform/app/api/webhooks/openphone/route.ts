import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/src/lib/openphone";
import { sendEmailWithFailsafe } from "@/src/lib/email-failsafe";
import { syncCallSummaryToSheet, syncEstimateToSheet } from "@/src/lib/google-sheets";
import { estimateDurationHours, type QuoteInput } from "@/src/lib/pricing";
import { findOrCreateCrmLead, syncContactToOpenPhone } from "@/src/lib/contact-sync";

export const dynamic = "force-dynamic";

// ─── Client lookup types ───
type ExistingClient = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  serviceType: string;
  squareFootage: number | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  totalJobs: number;
  lastJobDate: Date | null;
  quoteTotal: number | null;
};

// OpenPhone webhook events
type OpenPhoneEvent = {
  id: string;
  object: string;
  apiVersion: string;
  createdAt: string;
  data: {
    object: Record<string, any>;
  };
  type: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OpenPhoneEvent;
    console.log(`[openphone-webhook] Received event: ${body.type}`, JSON.stringify(body).substring(0, 500));

    switch (body.type) {
      case "call.completed":
      case "call.recording.completed":
        return handleCallCompleted(body);
      case "call.transcript.completed":
        return handleTranscriptCompleted(body);
      case "call.summary.completed":
        return handleSummaryCompleted(body);
      case "message.received":
        return handleInboundMessage(body);
      default:
        console.log(`[openphone-webhook] Unhandled event type: ${body.type}`);
        return NextResponse.json({ received: true, handled: false });
    }
  } catch (err) {
    console.error("[openphone-webhook] Error:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/** Normalize phone numbers to match DB: strip spaces, dashes, parens, ensure +1 prefix */
function normalizePhone(raw: string): string[] {
  const digits = raw.replace(/[^0-9]/g, "");
  // Return multiple formats so we can match however it was stored
  const variants: string[] = [];
  if (digits.length === 10) {
    variants.push(`+1${digits}`, `1${digits}`, digits, `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`);
  } else if (digits.length === 11 && digits.startsWith("1")) {
    const core = digits.slice(1);
    variants.push(`+1${core}`, `1${core}`, core, `+${digits}`, `(${core.slice(0,3)}) ${core.slice(3,6)}-${core.slice(6)}`);
  } else {
    variants.push(raw, digits);
  }
  return [...new Set(variants)];
}

/** Look up existing client by phone number across all ServiceRequests */
async function lookupClientByPhone(phone: string): Promise<ExistingClient | null> {
  const variants = normalizePhone(phone);
  console.log(`[openphone-webhook] Looking up client by phone variants:`, variants);

  // Search across all phone format variants
  const requests = await prisma.serviceRequest.findMany({
    where: {
      OR: variants.map((v) => ({ customerPhone: { contains: v } })),
    },
    include: {
      quote: true,
      job: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  if (requests.length === 0) {
    console.log(`[openphone-webhook] No existing client found for ${phone}`);
    return null;
  }

  // Use the most recent request as the primary record
  const latest = requests[0];
  const totalJobs = requests.filter((r) => r.job).length;
  const lastJob = requests.find((r) => r.job?.scheduledStart);

  const client: ExistingClient = {
    customerName: latest.customerName,
    customerEmail: latest.customerEmail,
    customerPhone: latest.customerPhone,
    addressLine1: latest.addressLine1,
    city: latest.city,
    state: latest.state,
    postalCode: latest.postalCode,
    serviceType: latest.serviceType,
    squareFootage: latest.squareFootage,
    notes: latest.notes,
    status: latest.status,
    createdAt: latest.createdAt,
    totalJobs,
    lastJobDate: lastJob?.job?.scheduledStart || null,
    quoteTotal: latest.quote?.total || null,
  };

  console.log(`[openphone-webhook] Found existing client: ${client.customerName} at ${client.addressLine1}, ${client.city} — ${totalJobs} prior jobs, service: ${client.serviceType}`);
  return client;
}

async function handleCallCompleted(event: OpenPhoneEvent) {
  const call = event.data.object;
  const callId = call.id || event.id;
  // OpenPhone sends participants as array of phone number strings e.g. ["+16068362534"]
  const phoneNumber =
    call.from ||
    (Array.isArray(call.participants) && typeof call.participants[0] === "string"
      ? call.participants[0]
      : call.participants?.[0]?.phoneNumber) ||
    "unknown";
  const direction = call.direction === "outgoing" ? "outbound" : "inbound";
  const duration = call.duration || 0;
  console.log(`[openphone-webhook] Call completed: ${callId} | ${direction} | ${phoneNumber} | ${duration}s`);

  // Store basic call record if not exists
  const existing = await prisma.callTranscript.findUnique({
    where: { callId },
  });
  if (!existing) {
    await prisma.callTranscript.create({
      data: {
        callId,
        phoneNumber,
        direction,
        duration,
        transcript: "[Awaiting transcript...]",
        status: "new",
        metadata: call,
      },
    });
  }

  return NextResponse.json({ received: true, callId });
}

async function handleTranscriptCompleted(event: OpenPhoneEvent) {
  // Try both event.data.object (our type) and event.data directly (alternate format)
  const data = event.data?.object || event.data || {};
  const callId = data.callId || data.id || event.id;

  console.log(`[openphone-webhook] Transcript handler raw keys:`, Object.keys(data));

  // OpenPhone sends transcript as a "dialogue" array of entries:
  // [{ content: "...", identifier: "+1...", userId: "...", start: 0, end: 5 }, ...]
  let transcript = "";
  const dialogue = data.dialogue || (event.data as any)?.dialogue;
  if (dialogue && Array.isArray(dialogue)) {
    transcript = dialogue
      .map((d: any) => {
        const speaker = d.identifier || d.userId || "Unknown";
        return `${speaker}: ${d.content}`;
      })
      .join("\n");
  } else {
    // Fallback to other possible formats
    transcript = data.transcript || data.text || data.content || "";
  }

  console.log(`[openphone-webhook] Transcript for call ${callId}: ${transcript.length} chars, dialogue entries: ${dialogue?.length || 0}`);

  if (!transcript) {
    console.log("[openphone-webhook] No transcript content in event");
    return NextResponse.json({ received: true, noTranscript: true });
  }

  // Update or create record
  let record = await prisma.callTranscript.findUnique({ where: { callId } });
  if (record) {
    record = await prisma.callTranscript.update({
      where: { callId },
      data: { transcript },
    });
  } else {
    record = await prisma.callTranscript.create({
      data: {
        callId,
        phoneNumber: data.from || data.phoneNumber || "unknown",
        direction: data.direction || "inbound",
        duration: data.duration || 0,
        transcript,
        status: "new",
        metadata: data,
      },
    });
  }

  // ─── CLIENT CROSS-REFERENCE: Look up existing client by phone ───
  const existingClient = record.phoneNumber ? await lookupClientByPhone(record.phoneNumber) : null;

  // Run AI analysis with client context
  const analysis = await analyzeTranscript(transcript, existingClient);
  if (analysis) {
    // Merge AI extraction with known client data (DB wins over AI guess)
    const mergedAddress = existingClient?.addressLine1
      ? `${existingClient.addressLine1}, ${existingClient.city}, ${existingClient.state} ${existingClient.postalCode}`
      : analysis.address;
    const mergedName = existingClient?.customerName || analysis.customerName;
    const mergedServiceType = analysis.serviceType || existingClient?.serviceType || null;
    const mergedSqft = analysis.sqft || existingClient?.squareFootage || null;

    record = await prisma.callTranscript.update({
      where: { id: record.id },
      data: {
        summary: analysis.summary,
        sentiment: analysis.sentiment,
        customerName: mergedName,
        customerEmail: existingClient?.customerEmail || null,
        address: mergedAddress,
        sqft: mergedSqft,
        bedrooms: analysis.bedrooms,
        bathrooms: analysis.bathrooms,
        serviceType: mergedServiceType,
        estimatedCost: analysis.estimatedCost,
        followUpNeeded: analysis.followUpNeeded,
        followUpNotes: analysis.followUpNotes,
        metadata: {
          ...(record.metadata as any),
          actionTags: analysis.actionTags || [],
        },
      },
    });

    // Override analysis with merged data for downstream use
    analysis.customerName = mergedName;
    analysis.address = mergedAddress;
    analysis.serviceType = mergedServiceType;
    analysis.sqft = mergedSqft;

    // ─── Auto-create TodoItems for actionable items ───
    const actionableTags = analysis.actionTags?.filter((tag: string) =>
      ["complaint", "refund", "follow_up", "reschedule", "cancel", "urgent"].includes(tag)
    ) || [];

    for (const tag of actionableTags) {
      const defaultTenantId = process.env.DEFAULT_TENANT_ID ?? "";
      await prisma.todoItem.create({
        data: {
          tenantId: defaultTenantId,
          userId: "system",
          title: `[${tag.toUpperCase()}] ${analysis.customerName || record.phoneNumber || "Unknown caller"}`,
          description: `Call ${record.callId}: ${analysis.summary}\n\nFollow-up: ${analysis.followUpNotes || "Review needed"}`,
          priority: tag === "urgent" || tag === "complaint" ? 1 : 2,
          isShared: true,
          category: tag,
          relatedId: record.id,
          relatedType: "call_transcript",
        },
      });
    }

    // ─── Detect scheduling-related calls → build cleaner broadcast ───
    const isSchedulingCall = detectSchedulingIntent(transcript, analysis);
    let cleanerBroadcast: string | null = null;
    if (isSchedulingCall) {
      cleanerBroadcast = buildCleanerBroadcastMessage(analysis, existingClient, record);
    }

    // Send SMS alert to HQ
    const hqNumbers =
      process.env.OPENPHONE_HQ_NUMBERS?.split(",")
        .map((n) => n.trim())
        .filter(Boolean) ||
      (process.env.OPENPHONE_FROM ? [process.env.OPENPHONE_FROM] : []);

    if (hqNumbers.length > 0) {
      const alertMsg = [
        `📞 CALL SUMMARY`,
        `From: ${record.phoneNumber}`,
        mergedName ? `Customer: ${mergedName}` : null,
        existingClient ? `📋 RETURNING CLIENT (${existingClient.totalJobs} prior jobs)` : `🆕 NEW CALLER`,
        existingClient?.addressLine1 ? `📍 ${existingClient.addressLine1}, ${existingClient.city}` : null,
        ``,
        analysis.summary,
        ``,
        mergedServiceType
          ? `Service: ${mergedServiceType.replace(/_/g, " ")}`
          : null,
        analysis.estimatedCost
          ? `Estimate: $${analysis.estimatedCost.toFixed(2)}`
          : (existingClient?.quoteTotal ? `Last quote: $${existingClient.quoteTotal.toFixed(2)}` : null),
        analysis.followUpNeeded
          ? `⚠️ Follow-up needed: ${analysis.followUpNotes}`
          : null,
        cleanerBroadcast ? `\n--- CLEANER MESSAGE (ready to send) ---\n${cleanerBroadcast}` : null,
        ``,
        `View: tseorganicclean264-production.up.railway.app/admin/transcripts`,
      ]
        .filter(Boolean)
        .join("\n");

      await sendSms({ to: hqNumbers, content: alertMsg });
    }

    // Send email notification with summary + estimate + client history
    const notifyEmails = (process.env.CALL_NOTIFY_EMAILS || "admin@tsenow.com")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    for (const email of notifyEmails) {
      await sendEmailWithFailsafe({
        to: email,
        subject: `📞 Call Summary${mergedName ? ` — ${mergedName}` : ""} | ${mergedServiceType?.replace(/_/g, " ").toUpperCase() || "General Inquiry"}${existingClient ? " 🔁" : " 🆕"}`,
        html: buildCallEmailHtml(record, analysis, existingClient, cleanerBroadcast),
      });
    }

    // Append to Google Sheet
    await appendToGoogleSheet(record, analysis);

    // ─── Upsert to CRM as CrmLead record ───
    try {
      await upsertToCrmLead(record, analysis, existingClient);
    } catch (err) {
      console.error("[openphone-webhook] Error upserting to CRM:", err);
    }

    // ─── AUTO-DRAFT ESTIMATE: create DraftEstimate for admin to send ───
    if (isSchedulingCall && analysis.estimatedCost && analysis.estimatedCost > 0) {
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://web-production-cfe11.up.railway.app";
        const tenantId = process.env.DEFAULT_TENANT_ID ?? "";

        const draft = await prisma.draftEstimate.create({
          data: {
            tenantId,
            callTranscriptId: record.id,
            customerName: analysis.customerName || record.phoneNumber || "Unknown",
            customerEmail: existingClient?.customerEmail || analysis.customerEmail || null,
            customerPhone: record.phoneNumber || "",
            address: analysis.address || (existingClient?.addressLine1 ? `${existingClient.addressLine1}, ${existingClient.city}` : null),
            serviceType: analysis.serviceType || null,
            estimatedCost: analysis.estimatedCost,
            estimateBreakdown: analysis.estimateBreakdown || null,
            cleanerBroadcast: cleanerBroadcast,
            status: "draft",
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
          },
        });

        // Pre-render the branded email template
        try {
          const { renderEstimateEmail } = await import("@/src/lib/estimate-email-template");
          const confirmUrl = `${siteUrl}/confirm-estimate/${draft.id}?token=${draft.accessToken}`;
          const emailHtml = await renderEstimateEmail({
            customerName: draft.customerName,
            serviceType: draft.serviceType,
            estimatedCost: draft.estimatedCost,
            address: draft.address,
            confirmUrl,
          });
          await prisma.draftEstimate.update({
            where: { id: draft.id },
            data: { customerEmailHtml: emailHtml },
          });
        } catch (e) {
          console.warn("[openphone-webhook] Email template rendering failed:", e);
        }

        // Create todo for admin action
        await prisma.todoItem.create({
          data: {
            tenantId,
            userId: "system",
            title: `[ESTIMATE READY] Send to ${draft.customerName} — $${analysis.estimatedCost.toFixed(0)}`,
            description: `Auto-drafted from call ${record.callId}.\n\n${analysis.serviceType?.replace(/_/g, " ") || "Cleaning"} · ${draft.address || "Address TBD"}\n\nOne-click send via: ${siteUrl}/admin → Draft Estimates\nOr API: POST /api/admin/draft-estimates { action: "send_all", draftId: "${draft.id}" }`,
            priority: 1,
            isShared: true,
            category: "estimate",
            relatedId: draft.id,
            relatedType: "draft_estimate",
          },
        });

        console.log(`[openphone-webhook] ✅ Draft estimate created: ${draft.id} for ${draft.customerName}`);
      } catch (err) {
        console.error("[openphone-webhook] Draft estimate creation failed:", err);
      }
    }
  } else {
    // ─── FALLBACK: AI analysis failed — still send email + SMS so calls are never missed ───
    console.warn("[openphone-webhook] AI analysis failed — sending fallback notifications");

    const clientName = existingClient?.customerName || null;

    // Create a follow-up todo so call doesn't slip through
    try {
      await prisma.todoItem.create({
        data: {
          tenantId: process.env.DEFAULT_TENANT_ID ?? "",
          userId: "system",
          title: `[REVIEW] Call from ${clientName || record.phoneNumber || "Unknown"}`,
          description: `AI analysis failed for call ${record.callId}. Raw transcript:\n\n${transcript.substring(0, 500)}`,
          priority: 1,
          isShared: true,
          category: "follow_up",
          relatedId: record.id,
          relatedType: "call_transcript",
        },
      });
    } catch (err) {
      console.error("[openphone-webhook] Fallback todo creation failed:", err);
    }

    // Send fallback SMS to HQ
    const hqNumbers =
      process.env.OPENPHONE_HQ_NUMBERS?.split(",")
        .map((n) => n.trim())
        .filter(Boolean) ||
      (process.env.OPENPHONE_FROM ? [process.env.OPENPHONE_FROM] : []);

    if (hqNumbers.length > 0) {
      const alertMsg = [
        `📞 CALL RECEIVED (needs manual review)`,
        `From: ${record.phoneNumber}`,
        clientName ? `Customer: ${clientName}` : null,
        existingClient ? `📋 RETURNING CLIENT` : `🆕 NEW CALLER`,
        ``,
        `⚠️ AI summary unavailable — review transcript in dashboard`,
        ``,
        `Preview: ${transcript.substring(0, 200)}`,
        ``,
        `View: tseorganicclean264-production.up.railway.app/admin/transcripts`,
      ]
        .filter(Boolean)
        .join("\n");

      try {
        await sendSms({ to: hqNumbers, content: alertMsg });
      } catch (err) {
        console.error("[openphone-webhook] Fallback SMS failed:", err);
      }
    }

    // Send fallback email with raw transcript
    const notifyEmails = (process.env.CALL_NOTIFY_EMAILS || "admin@tsenow.com")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    const fallbackHtml = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px;">
        <div style="background: #b91c1c; color: white; padding: 20px; border-radius: 12px 12px 0 0;">
          <h2 style="margin: 0;">Call Received — Manual Review Needed</h2>
          <p style="margin: 4px 0 0; opacity: 0.8;">AI analysis was unavailable for this call</p>
        </div>
        <div style="background: #fef2f2; padding: 20px; border: 1px solid #fecaca; border-top: none; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 8px 0; font-weight: 600;">Phone</td><td style="padding: 8px 0;">${record.phoneNumber}</td></tr>
            ${clientName ? `<tr><td style="padding: 8px 0; font-weight: 600;">Customer</td><td style="padding: 8px 0;">${clientName}</td></tr>` : ""}
            ${existingClient ? `<tr><td style="padding: 8px 0; font-weight: 600;">Status</td><td style="padding: 8px 0;">Returning client (${existingClient.totalJobs} prior jobs)</td></tr>` : ""}
            ${existingClient?.addressLine1 ? `<tr><td style="padding: 8px 0; font-weight: 600;">Address</td><td style="padding: 8px 0;">${existingClient.addressLine1}, ${existingClient.city}</td></tr>` : ""}
            <tr><td style="padding: 8px 0; font-weight: 600;">Duration</td><td style="padding: 8px 0;">${record.duration}s</td></tr>
          </table>
          <div style="margin-top: 16px; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
            <p style="font-weight: 600; margin: 0 0 8px;">Raw Transcript:</p>
            <pre style="white-space: pre-wrap; font-size: 13px; color: #374151; margin: 0;">${transcript.substring(0, 2000)}</pre>
          </div>
          <p style="margin-top: 16px; font-size: 13px; color: #6b7280;">
            <a href="https://tseorganicclean264-production.up.railway.app/admin/transcripts" style="color: #0d5e3b; font-weight: 600;">View in Dashboard →</a>
          </p>
        </div>
      </div>
    `;

    for (const email of notifyEmails) {
      try {
        await sendEmailWithFailsafe({
          to: email,
          subject: `📞 Call Received${clientName ? ` — ${clientName}` : ""} | REVIEW NEEDED${existingClient ? " 🔁" : " 🆕"}`,
          html: fallbackHtml,
        });
      } catch (err) {
        console.error("[openphone-webhook] Fallback email failed:", err);
      }
    }
  }

  return NextResponse.json({
    received: true,
    analyzed: !!analysis,
    existingClient: !!existingClient,
    id: record.id,
  });
}

async function handleSummaryCompleted(event: OpenPhoneEvent) {
  const data = event.data.object;
  const callId = data.callId || data.id || event.id;
  const openPhoneSummary = data.summary || data.text || data.content || "";
  const phoneNumber = data.from || data.phoneNumber || "unknown";

  console.log(`[openphone-webhook] Summary for call ${callId}: ${openPhoneSummary.length} chars`);

  if (!openPhoneSummary || !callId) {
    return NextResponse.json({ received: true, noSummary: true });
  }

  // Check if transcript handler already processed this call (it sends its own emails)
  const existing = await prisma.callTranscript.findUnique({ where: { callId } });
  const alreadyAnalyzed = existing?.summary && !existing.summary.startsWith("[OpenPhone AI]");

  let record = existing;
  if (existing && !existing.summary) {
    record = await prisma.callTranscript.update({
      where: { callId },
      data: {
        summary: `[OpenPhone AI] ${openPhoneSummary}`,
        metadata: { ...(existing.metadata as any), openPhoneSummary },
      },
    });
  } else if (!existing) {
    record = await prisma.callTranscript.create({
      data: {
        callId,
        phoneNumber,
        direction: data.direction || "inbound",
        duration: data.duration || 0,
        transcript: "[Summary only — no transcript available]",
        summary: `[OpenPhone AI] ${openPhoneSummary}`,
        status: "new",
        metadata: data,
      },
    });
  }

  // ─── If the transcript handler already sent emails, skip. Otherwise send now. ───
  if (alreadyAnalyzed) {
    console.log(`[openphone-webhook] Call ${callId} already analyzed by transcript handler — skipping summary notifications`);
    return NextResponse.json({ received: true, callId, skipped: "already_analyzed" });
  }

  // Look up client context
  const existingClient = record?.phoneNumber ? await lookupClientByPhone(record.phoneNumber) : null;
  const clientName = existingClient?.customerName || null;

  // Send SMS alert to HQ
  const hqNumbers =
    process.env.OPENPHONE_HQ_NUMBERS?.split(",")
      .map((n) => n.trim())
      .filter(Boolean) ||
    (process.env.OPENPHONE_FROM ? [process.env.OPENPHONE_FROM] : []);

  if (hqNumbers.length > 0) {
    const alertMsg = [
      `📞 CALL SUMMARY`,
      `From: ${record?.phoneNumber || phoneNumber}`,
      clientName ? `Customer: ${clientName}` : null,
      existingClient ? `📋 RETURNING CLIENT (${existingClient.totalJobs} prior jobs)` : `🆕 NEW CALLER`,
      existingClient?.addressLine1 ? `📍 ${existingClient.addressLine1}, ${existingClient.city}` : null,
      ``,
      openPhoneSummary,
      ``,
      `View: tseorganicclean264-production.up.railway.app/admin/transcripts`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await sendSms({ to: hqNumbers, content: alertMsg });
    } catch (err) {
      console.error("[openphone-webhook] Summary SMS failed:", err);
    }
  }

  // Send email notification
  const notifyEmails = (process.env.CALL_NOTIFY_EMAILS || "admin@tsenow.com")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  const summaryHtml = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px;">
      <div style="background: #0d5e3b; color: white; padding: 20px; border-radius: 12px 12px 0 0;">
        <h2 style="margin: 0;">📞 Call Summary</h2>
        <p style="margin: 4px 0 0; opacity: 0.8;">Via OpenPhone AI</p>
      </div>
      <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; font-weight: 600; color: #374151;">Phone</td><td style="padding: 8px 0; color: #4b5563;">${record?.phoneNumber || phoneNumber}</td></tr>
          ${clientName ? `<tr><td style="padding: 8px 0; font-weight: 600; color: #374151;">Customer</td><td style="padding: 8px 0; color: #4b5563;">${clientName}</td></tr>` : ""}
          ${existingClient ? `<tr><td style="padding: 8px 0; font-weight: 600; color: #374151;">Status</td><td style="padding: 8px 0; color: #4b5563;">Returning client (${existingClient.totalJobs} prior jobs)</td></tr>` : `<tr><td style="padding: 8px 0; font-weight: 600; color: #374151;">Status</td><td style="padding: 8px 0; color: #4b5563;">🆕 New caller</td></tr>`}
          ${existingClient?.addressLine1 ? `<tr><td style="padding: 8px 0; font-weight: 600; color: #374151;">Address</td><td style="padding: 8px 0; color: #4b5563;">${existingClient.addressLine1}, ${existingClient.city}</td></tr>` : ""}
        </table>
        <div style="margin-top: 16px; padding: 16px; background: white; border-radius: 8px; border: 1px solid #d1fae5;">
          <p style="font-weight: 600; margin: 0 0 8px; color: #0d5e3b;">Summary</p>
          <p style="margin: 0; color: #374151; line-height: 1.6;">${openPhoneSummary}</p>
        </div>
        <p style="margin-top: 16px; font-size: 13px; color: #6b7280;">
          <a href="https://tseorganicclean264-production.up.railway.app/admin/transcripts" style="color: #0d5e3b; font-weight: 600;">View in Dashboard →</a>
        </p>
      </div>
    </div>
  `;

  for (const email of notifyEmails) {
    try {
      await sendEmailWithFailsafe({
        to: email,
        subject: `📞 Call Summary${clientName ? ` — ${clientName}` : ""} | ${existingClient ? "🔁 Returning" : "🆕 New Caller"}`,
        html: summaryHtml,
      });
    } catch (err) {
      console.error("[openphone-webhook] Summary email failed:", err);
    }
  }

  // Create a follow-up todo
  try {
    await prisma.todoItem.create({
      data: {
        tenantId: process.env.DEFAULT_TENANT_ID ?? "",
        userId: "system",
        title: `[CALL] ${clientName || record?.phoneNumber || phoneNumber}`,
        description: `OpenPhone Summary: ${openPhoneSummary}`,
        priority: 2,
        isShared: true,
        category: "follow_up",
        relatedId: record?.id,
        relatedType: "call_transcript",
      },
    });
  } catch (err) {
    console.error("[openphone-webhook] Summary todo creation failed:", err);
  }

  return NextResponse.json({ received: true, callId, emailSent: true });
}

/** Rule-based pre-filter: skip AI for trivial/noise SMS to save API calls */
function isTrivalSms(content: string): boolean {
  const trimmed = content.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "");
  const trivialPatterns = [
    /^(ok|okay|k|kk|yep|yup|yes|yeah|ya|no|nope|nah|sure|alright|cool|great|good|fine|perfect|awesome|thanks|thank you|thx|ty|got it|sounds good|will do|see you|see ya|bye|ttyl|lol|haha|ha|omg|wow|nice|np|no problem|no worries|youre welcome|welcome|right|absolutely|definitely|of course|for sure)$/,
    /^(👍|👌|✅|🙏|❤️|😊|😂|🤣|👋|💯|🔥|😁|😀|🙂|☺️|🫡|🤝)$/,
    /^[0-9]{1,2}$/,  // just a number like "5" or "10"
  ];
  return trimmed.length < 3 || trimmed.split(/\s+/).length <= 2 && trivialPatterns.some(p => p.test(trimmed));
}

async function handleInboundMessage(event: OpenPhoneEvent) {
  const msg = event.data.object;
  const phoneNumber = msg.from || "unknown";
  const content = msg.content || "";

  console.log(
    `[openphone-webhook] Inbound SMS from ${phoneNumber}: ${content.substring(0, 100)}`
  );

  if (!content) {
    return NextResponse.json({ received: true, noContent: true });
  }

  // ─── COST OPTIMIZATION: Skip AI for trivial messages ───
  if (isTrivalSms(content)) {
    console.log(`[openphone-webhook] Trivial SMS skipped AI: "${content.substring(0, 50)}"`);
    return NextResponse.json({ received: true, skipped: true, reason: "trivial_message" });
  }

  // ─── CLIENT CROSS-REFERENCE: Look up existing client by phone ───
  const existingClient = await lookupClientByPhone(phoneNumber);

  // Analyze SMS with AI (includes client context for better analysis)
  const smsAnalysis = await analyzeSmsEnhanced(content, phoneNumber, existingClient);

  const defaultTenantId = process.env.DEFAULT_TENANT_ID ?? "";
  const customerName = smsAnalysis?.customerName || existingClient?.customerName || null;
  const identifier = customerName || phoneNumber;

  // ─── Auto-create TodoItems for actionable SMS ───
  const actionableTags = smsAnalysis?.actionTags?.filter((tag: string) =>
    ["complaint", "refund", "follow_up", "reschedule", "cancel", "urgent"].includes(tag)
  ) || [];

  for (const tag of actionableTags) {
    await prisma.todoItem.create({
      data: {
        tenantId: defaultTenantId,
        userId: "system",
        title: `[SMS] [${tag.toUpperCase()}] ${identifier}`,
        description: `SMS from ${phoneNumber}: ${content}\n\nIntent: ${smsAnalysis?.intent || "Review needed"}\nSentiment: ${smsAnalysis?.sentiment || "unknown"}`,
        priority: tag === "urgent" || tag === "complaint" ? 1 : 2,
        isShared: true,
        category: tag,
        relatedType: "sms_message",
      },
    });
  }

  // Always create a follow_up todo for substantive messages even without explicit tags
  if (actionableTags.length === 0 && content.length > 20) {
    await prisma.todoItem.create({
      data: {
        tenantId: defaultTenantId,
        userId: "system",
        title: `[SMS] ${identifier}`,
        description: `SMS from ${phoneNumber}: ${content}\n\nIntent: ${smsAnalysis?.intent || "Review message"}\nSentiment: ${smsAnalysis?.sentiment || "unknown"}`,
        priority: 2,
        isShared: true,
        category: "follow_up",
        relatedType: "sms_message",
      },
    });
  }

  // ─── Send SMS alert to HQ (same as calls) ───
  const hqNumbers =
    process.env.OPENPHONE_HQ_NUMBERS?.split(",")
      .map((n) => n.trim())
      .filter(Boolean) ||
    (process.env.OPENPHONE_FROM ? [process.env.OPENPHONE_FROM] : []);

  if (hqNumbers.length > 0) {
    const alertMsg = [
      `💬 TEXT MESSAGE`,
      `From: ${phoneNumber}`,
      customerName ? `Customer: ${customerName}` : null,
      existingClient ? `📋 RETURNING CLIENT (${existingClient.totalJobs} prior jobs)` : `🆕 NEW/UNKNOWN`,
      existingClient?.addressLine1 ? `📍 ${existingClient.addressLine1}, ${existingClient.city}` : null,
      ``,
      `"${content.length > 200 ? content.substring(0, 200) + "..." : content}"`,
      ``,
      smsAnalysis?.intent ? `Intent: ${smsAnalysis.intent}` : null,
      smsAnalysis?.sentiment === "negative" ? `⚠️ Negative sentiment detected` : null,
      actionableTags.length > 0 ? `🏷️ Tags: ${actionableTags.join(", ")}` : null,
      ``,
      `View: tseorganicclean264-production.up.railway.app/admin/todos`,
    ]
      .filter(Boolean)
      .join("\n");

    await sendSms({ to: hqNumbers, content: alertMsg });
  }

  // ─── Send email notification for substantive texts ───
  const notifyEmails = (process.env.CALL_NOTIFY_EMAILS || "admin@tsenow.com")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (content.length > 15) {
    for (const email of notifyEmails) {
      await sendEmailWithFailsafe({
        to: email,
        subject: `💬 SMS${customerName ? ` — ${customerName}` : ""} | ${smsAnalysis?.intent || "New Message"}${existingClient ? " 🔁" : " 🆕"}`,
        html: buildSmsEmailHtml(phoneNumber, content, smsAnalysis, existingClient),
      });
    }
  }

  // ─── Upsert to CRM ───
  if (defaultTenantId) {
    try {
      const crmPhone = phoneNumber;
      const existing = await prisma.crmLead.findFirst({
        where: { tenantId: defaultTenantId, contactPhone: crmPhone },
      });
      if (existing) {
        const prevNotes = existing.notes || "";
        await prisma.crmLead.update({
          where: { id: existing.id },
          data: {
            notes: `${prevNotes}\n\n[SMS ${new Date().toLocaleDateString()}] ${content.substring(0, 200)}`,
            metadata: {
              ...(existing.metadata as any || {}),
              lastSmsAt: new Date().toISOString(),
              lastSmsContent: content.substring(0, 200),
            },
            updatedAt: new Date(),
          },
        });
      } else if (content.length > 20) {
        await prisma.crmLead.create({
          data: {
            tenantId: defaultTenantId,
            businessName: customerName || "Unknown",
            contactName: customerName,
            contactPhone: crmPhone,
            source: "openphone_sms",
            status: "new",
            notes: `[SMS ${new Date().toLocaleDateString()}] ${content.substring(0, 200)}`,
            metadata: {
              source: "openphone_sms",
              firstSmsAt: new Date().toISOString(),
              intent: smsAnalysis?.intent,
              sentiment: smsAnalysis?.sentiment,
            },
          },
        });
      }
    } catch (err) {
      console.error("[openphone-webhook] SMS CRM upsert failed:", err);
    }
  }

  console.log(`[openphone-webhook] SMS processed: ${identifier}, tags: ${actionableTags.join(",") || "none"}, client: ${existingClient ? "existing" : "new"}`);

  return NextResponse.json({
    received: true,
    analyzed: !!smsAnalysis,
    actionTags: smsAnalysis?.actionTags || [],
    existingClient: !!existingClient,
  });
}

/** Detect if this call is about scheduling/rescheduling */
function detectSchedulingIntent(transcript: string, analysis: any): boolean {
  const schedulingKeywords = [
    // Scheduling / rescheduling
    "reschedule", "schedule", "book", "reserve", "appointment",
    "move my", "change my", "cancel", "different day", "different time",
    "next week", "this week", "monday", "tuesday", "wednesday",
    "thursday", "friday", "saturday", "morning", "afternoon",
    "what time", "when can", "available", "slot", "window",
    "come on", "come by", "push back", "push it", "move it",
    // New customer requesting service
    "need a clean", "need cleaning", "get a quote", "get a price",
    "how much", "price for", "cost of", "estimate for",
    "hire", "looking for a clean", "want to book",
    "house cleaning", "home cleaning", "deep clean", "move out",
    "move in", "pressure wash", "car detail", "auto detail",
    "first time", "new customer", "interested in",
    "can you come", "do you service", "service my area",
    "quote", "pricing",
  ];
  const lower = transcript.toLowerCase();
  const hasSchedulingKeyword = schedulingKeywords.some((kw) => lower.includes(kw));
  const hasSchedulingInSummary = analysis.summary?.toLowerCase().includes("schedul") ||
    analysis.summary?.toLowerCase().includes("reschedul") ||
    analysis.followUpNotes?.toLowerCase().includes("schedul") ||
    analysis.summary?.toLowerCase().includes("clean") ||
    analysis.summary?.toLowerCase().includes("quote") ||
    analysis.summary?.toLowerCase().includes("book");
  // Also trigger if AI detected a service type (customer is asking about service)
  const hasServiceType = !!analysis.serviceType;
  return hasSchedulingKeyword || hasSchedulingInSummary || hasServiceType;
}

/** Estimate cleaning hours using pricing engine or rough calc */
function estimateCleaningHours(analysis: any, client: ExistingClient | null): string | null {
  const sqft = client?.squareFootage || analysis.sqft;
  const beds = analysis.bedrooms || 3; // Flatwoods average
  const baths = analysis.bathrooms || 2;
  const rawSvc = analysis.serviceType || client?.serviceType || "healthy_home";
  // Map to valid QuoteServiceType for pricing engine
  const validServiceTypes = ["healthy_home", "deep_refresh", "move_in_out", "commercial"] as const;
  const svcType = validServiceTypes.includes(rawSvc as any) ? rawSvc : "healthy_home";

  if (sqft) {
    // Use the real pricing engine's duration calculator
    try {
      const hours = estimateDurationHours({
        serviceType: svcType as any,
        frequency: "one_time",
        locationTier: "sarasota",
        bedrooms: beds,
        bathrooms: baths,
        squareFootage: sqft,
        addOns: [],
        isFirstTimeClient: false,
      });
      return hours.toFixed(1);
    } catch {
      // Fallback: rough estimate
    }
  }

  // Rough estimate without sqft: 2.5 base + bed/bath adjustments
  const rough = 2.5 + beds * 0.35 + baths * 0.45;
  if (svcType === "deep_refresh") return (rough + 1.2).toFixed(1);
  if (svcType === "move_in_out") return (rough + 1.6).toFixed(1);
  return rough.toFixed(1);
}

/** Build a ready-to-send message for mass broadcasting to cleaners */
function buildCleanerBroadcastMessage(analysis: any, client: ExistingClient | null, record: any): string {
  const name = analysis.customerName || "A customer";
  const address = analysis.address || "address TBD";
  const service = analysis.serviceType
    ? analysis.serviceType.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
    : "Cleaning";

  // Extract day/time from summary or follow-up notes
  const timeInfo = analysis.followUpNotes || analysis.summary || "";

  const lines = [
    `🌿 JOB AVAILABLE`,
    ``,
    `${service} for ${name}`,
    `📍 ${address}`,
  ];

  if (client?.squareFootage) {
    lines.push(`🏠 ~${client.squareFootage} sqft`);
  }

  // Try to extract scheduling specifics
  const dayTimeMatch = timeInfo.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)[\s,]*(at|around|@)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?/i);
  if (dayTimeMatch) {
    lines.push(`📅 ${dayTimeMatch[0]}`);
  } else {
    // Fallback: look for any time reference
    const anyTimeMatch = timeInfo.match(/\b(mon|tue|wed|thu|fri|sat|sun|tomorrow|next\s+\w+|\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i);
    if (anyTimeMatch) lines.push(`📅 ${anyTimeMatch[0]}`);
  }

  // Show estimated hours (NOT price — cleaners should not see pricing)
  const estHours = estimateCleaningHours(analysis, client);
  if (estHours) {
    lines.push(`⏱️ ~${estHours} hours`);
  }

  lines.push(
    ``,
    `Reply YES if you want this job!`
  );

  return lines.join("\n");
}

/** System prompt for transcript analysis */
const ANALYSIS_SYSTEM_PROMPT = `You are an assistant for Tri State Enterprise, an organic cleaning company in Flatwoods, KY. Analyze this phone call transcript and extract information in JSON format.

Return JSON with these fields:
- summary: string (2-3 sentence summary of the call)
- sentiment: "positive" | "neutral" | "negative"
- customerName: string | null
- address: string | null (full address if mentioned)
- sqft: number | null (square footage if mentioned)
- bedrooms: number | null
- bathrooms: number | null
- serviceType: "healthy_home" | "deep_refresh" | "move_in_out" | "commercial" | "pressure_wash" | "auto_detail" | null
- estimatedCost: number | null (estimate based on: Healthy Home $150-250, Deep Refresh $250-400, Move In/Out $300-500, Commercial $200-600, Pressure Wash $150-350, Auto Detail $100-250)
- followUpNeeded: boolean
- followUpNotes: string | null (what follow-up is needed)
- requestedDay: string | null (if customer requested a specific day e.g. "Wednesday")
- requestedTime: string | null (if customer requested a specific time e.g. "9am")
- actionTags: string[] (array of tags indicating actionable items: "complaint" if customer is unhappy/dissatisfied, "refund" if requesting money back/credit, "follow_up" if needs callback/scheduling/pending decision, "reschedule" if wants to change appointment time, "cancel" if wants to cancel service, "urgent" if time-sensitive/emergency request)`;

/** System prompt for SMS analysis */
const SMS_ANALYSIS_SYSTEM_PROMPT = `You are an assistant for Tri State Enterprise. Analyze this SMS message and extract intent in JSON format.

Return JSON with these fields:
- intent: string (brief description of what the customer wants)
- sentiment: "positive" | "neutral" | "negative"
- actionTags: string[] (array of actionable tags: "complaint", "refund", "follow_up", "reschedule", "cancel", "urgent")
- phoneNumber: string | null (phone number if mentioned)
- customerName: string | null (name if mentioned)`;

/** AI provider config: tries each in order until one succeeds */
type AIProvider = {
  name: string;
  url: string;
  keyEnv: string;
  model: string;
  buildBody: (messages: any[]) => any;
  extractContent: (data: any) => string | null;
};

const AI_PROVIDERS: AIProvider[] = [
  {
    name: "OpenAI",
    url: "https://api.openai.com/v1/chat/completions",
    keyEnv: "OPENAI_API_KEY",
    model: "gpt-4o-mini",
    buildBody: (messages) => ({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages,
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content || null,
  },
  {
    name: "Claude",
    url: "https://api.anthropic.com/v1/messages",
    keyEnv: "ANTHROPIC_API_KEY",
    model: "claude-sonnet-4-20250514",
    buildBody: (messages) => ({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: messages[0].content,
      messages: [{ role: "user", content: messages[1].content }],
    }),
    extractContent: (data) => {
      const block = data.content?.find((b: any) => b.type === "text");
      return block?.text || null;
    },
  },
  {
    name: "OpenRouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    keyEnv: "OPENROUTER_API_KEY",
    model: "anthropic/claude-3.5-sonnet",
    buildBody: (messages) => ({
      model: "anthropic/claude-3.5-sonnet",
      temperature: 0.3,
      messages,
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content || null,
  },
];

/** Analyze transcript with cascading AI fallback: OpenAI → Claude → OpenRouter */
async function analyzeTranscript(transcript: string, existingClient?: ExistingClient | null) {
  // Build context-enriched user prompt
  let userContent = `Transcript:\n\n${transcript}`;

  if (existingClient) {
    userContent += `\n\n--- EXISTING CLIENT RECORD (from our database) ---
Name: ${existingClient.customerName}
Email: ${existingClient.customerEmail}
Phone: ${existingClient.customerPhone}
Address: ${existingClient.addressLine1}, ${existingClient.city}, ${existingClient.state} ${existingClient.postalCode}
Service Type: ${existingClient.serviceType}
${existingClient.squareFootage ? `Square Footage: ${existingClient.squareFootage}` : ""}
${existingClient.notes ? `Notes: ${existingClient.notes}` : ""}
Total Prior Jobs: ${existingClient.totalJobs}
${existingClient.lastJobDate ? `Last Job: ${existingClient.lastJobDate.toLocaleDateString()}` : ""}
${existingClient.quoteTotal ? `Last Quote: $${existingClient.quoteTotal.toFixed(2)}` : ""}
Status: ${existingClient.status}
---
Use the above client record to fill in any details not mentioned in the transcript (e.g., address, service type, name). Always prefer the database address over anything vaguely mentioned in the call.`;
  }

  const messages = [
    { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];

  for (const provider of AI_PROVIDERS) {
    const apiKey = process.env[provider.keyEnv];
    if (!apiKey) {
      console.log(`[openphone-webhook] ${provider.name}: no key (${provider.keyEnv}), skipping`);
      continue;
    }

    try {
      console.log(`[openphone-webhook] Trying ${provider.name} (${provider.model})...`);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Claude uses x-api-key header, others use Authorization: Bearer
      if (provider.name === "Claude") {
        headers["x-api-key"] = apiKey;
        headers["anthropic-version"] = "2023-06-01";
      } else {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      const response = await fetch(provider.url, {
        method: "POST",
        headers,
        body: JSON.stringify(provider.buildBody(messages)),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.warn(`[openphone-webhook] ${provider.name} error ${response.status}: ${errText.substring(0, 200)}`);
        continue; // Try next provider
      }

      const data = await response.json();
      const content = provider.extractContent(data);
      if (!content) {
        console.warn(`[openphone-webhook] ${provider.name}: no content in response`);
        continue;
      }

      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();

      const result = JSON.parse(jsonStr);
      console.log(`[openphone-webhook] ${provider.name} analysis successful: ${result.serviceType || "unknown"} service, est $${result.estimatedCost || "?"}`);
      return result;
    } catch (err) {
      console.error(`[openphone-webhook] ${provider.name} failed:`, err);
      continue; // Try next provider
    }
  }

  console.error("[openphone-webhook] All AI providers failed");
  return null;
}

/** Analyze SMS message with cascading AI fallback */
async function analyzeSms(content: string) {
  const messages = [
    { role: "system", content: SMS_ANALYSIS_SYSTEM_PROMPT },
    { role: "user", content },
  ];

  for (const provider of AI_PROVIDERS) {
    const apiKey = process.env[provider.keyEnv];
    if (!apiKey) {
      console.log(`[openphone-webhook] ${provider.name}: no key (${provider.keyEnv}), skipping SMS analysis`);
      continue;
    }

    try {
      console.log(`[openphone-webhook] Trying ${provider.name} for SMS analysis...`);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (provider.name === "Claude") {
        headers["x-api-key"] = apiKey;
        headers["anthropic-version"] = "2023-06-01";
      } else {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      const response = await fetch(provider.url, {
        method: "POST",
        headers,
        body: JSON.stringify(provider.buildBody(messages)),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.warn(`[openphone-webhook] ${provider.name} SMS analysis error ${response.status}: ${errText.substring(0, 200)}`);
        continue;
      }

      const data = await response.json();
      const content = provider.extractContent(data);
      if (!content) {
        console.warn(`[openphone-webhook] ${provider.name}: no content in SMS response`);
        continue;
      }

      // Extract JSON from response
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();

      const result = JSON.parse(jsonStr);
      console.log(`[openphone-webhook] ${provider.name} SMS analysis successful: ${result.intent || "unknown"}, tags: ${result.actionTags?.join(",") || "none"}`);
      return result;
    } catch (err) {
      console.error(`[openphone-webhook] ${provider.name} SMS analysis failed:`, err);
      continue;
    }
  }

  console.error("[openphone-webhook] All AI providers failed for SMS analysis");
  return null;
}

/** Enhanced SMS analysis with client context — frontloads AI work */
async function analyzeSmsEnhanced(content: string, phone: string, client: ExistingClient | null) {
  let userContent = `SMS Message: "${content}"\nFrom: ${phone}`;
  if (client) {
    userContent += `\n\nExisting client: ${client.customerName}, ${client.addressLine1}, ${client.city}. Service: ${client.serviceType || "unknown"}. ${client.totalJobs} prior jobs.`;
  }

  const messages = [
    { role: "system", content: SMS_ANALYSIS_SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];

  for (const provider of AI_PROVIDERS) {
    const apiKey = process.env[provider.keyEnv];
    if (!apiKey) continue;

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (provider.name === "Claude") {
        headers["x-api-key"] = apiKey;
        headers["anthropic-version"] = "2023-06-01";
      } else {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      const response = await fetch(provider.url, {
        method: "POST",
        headers,
        body: JSON.stringify(provider.buildBody(messages)),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const rawContent = provider.extractContent(data);
      if (!rawContent) continue;

      let jsonStr = rawContent;
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();

      const result = JSON.parse(jsonStr);
      console.log(`[openphone-webhook] ${provider.name} enhanced SMS analysis: intent=${result.intent}, tags=${result.actionTags?.join(",") || "none"}`);
      return result;
    } catch (err) {
      console.error(`[openphone-webhook] ${provider.name} enhanced SMS failed:`, err);
      continue;
    }
  }
  return null;
}

/** Build HTML email for SMS notifications */
function buildSmsEmailHtml(phone: string, content: string, analysis: any, client: ExistingClient | null): string {
  const sentimentColor =
    analysis?.sentiment === "positive" ? "#22c55e" :
    analysis?.sentiment === "negative" ? "#ef4444" : "#f59e0b";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
  <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #166534; margin: 0; font-size: 24px;">🌿 Tri State Enterprise</h1>
      <p style="color: #6b7280; margin: 4px 0 0;">💬 Inbound Text Message</p>
    </div>

    <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 16px; color: #374151; white-space: pre-wrap;">${content}</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr><td style="padding: 8px 12px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">From</td><td style="padding: 8px 12px; font-weight: 600; border-bottom: 1px solid #f3f4f6;">${phone}</td></tr>
      ${client ? `<tr><td style="padding: 8px 12px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Customer</td><td style="padding: 8px 12px; font-weight: 600; border-bottom: 1px solid #f3f4f6;">${client.customerName} (${client.totalJobs} prior jobs)</td></tr>` : ""}
      ${client?.addressLine1 ? `<tr><td style="padding: 8px 12px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Address</td><td style="padding: 8px 12px; font-weight: 600; border-bottom: 1px solid #f3f4f6;">${client.addressLine1}, ${client.city}</td></tr>` : ""}
      ${analysis?.intent ? `<tr><td style="padding: 8px 12px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Intent</td><td style="padding: 8px 12px; font-weight: 600; border-bottom: 1px solid #f3f4f6;">${analysis.intent}</td></tr>` : ""}
      ${analysis?.sentiment ? `<tr><td style="padding: 8px 12px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Sentiment</td><td style="padding: 8px 12px;"><span style="background: ${sentimentColor}; color: white; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: 600;">${analysis.sentiment}</span></td></tr>` : ""}
      ${analysis?.actionTags?.length ? `<tr><td style="padding: 8px 12px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Action Tags</td><td style="padding: 8px 12px; font-weight: 600; border-bottom: 1px solid #f3f4f6;">${analysis.actionTags.join(", ")}</td></tr>` : ""}
    </table>

    ${!client ? `
    <div style="background: #fefce8; border: 1px solid #fde68a; border-radius: 10px; padding: 16px; margin-bottom: 20px; text-align: center;">
      <p style="margin: 0; font-weight: 600; color: #92400e;">🆕 Unknown number — no matching client</p>
    </div>
    ` : ""}

    <div style="text-align: center; margin-top: 24px;">
      <a href="https://tseorganicclean264-production.up.railway.app/admin/todos" style="background: #166534; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View To-Dos</a>
    </div>

    <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px;">
      ${new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
    </p>
  </div>
</body>
</html>`;
}

/** Post data to Google Apps Script web app (primary Sheets sync method) */
async function postToAppsScript(payload: Record<string, any>): Promise<boolean> {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  const secret = process.env.GOOGLE_APPS_SCRIPT_SECRET || "ggoc-sheets-2026-secure";
  if (!url) {
    console.warn("[openphone-webhook] GOOGLE_APPS_SCRIPT_URL not set, skipping Apps Script sync");
    return false;
  }

  try {
    // Use redirect: "manual" because Apps Script returns 302 and
    // auto-follow converts POST→GET which breaks on googleusercontent.com
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, secret }),
      redirect: "manual",
    });

    // Apps Script always returns 302 redirect after processing
    if (res.status === 302) {
      const redirectUrl = res.headers.get("location");
      if (redirectUrl) {
        // Follow the redirect with GET to retrieve the JSON response
        const followRes = await fetch(redirectUrl, { redirect: "follow" });
        const text = await followRes.text();
        try {
          const data = JSON.parse(text);
          console.log(`[openphone-webhook] Apps Script response:`, JSON.stringify(data));
          return data.success === true;
        } catch {
          // If response isn't JSON but request succeeded, still OK
          console.log(`[openphone-webhook] Apps Script redirect followed, status: ${followRes.status}`);
          return followRes.ok;
        }
      }
    }

    // Direct response (unlikely for Apps Script but handle gracefully)
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      console.log(`[openphone-webhook] Apps Script response:`, JSON.stringify(data));
      return data.success === true;
    } catch {
      console.log(`[openphone-webhook] Apps Script status ${res.status}: ${text.substring(0, 200)}`);
      return res.ok;
    }
  } catch (err) {
    console.error("[openphone-webhook] Apps Script POST failed:", err);
    return false;
  }
}

/** Sync call data to Google Sheets — Call Summaries + Estimates tabs */
async function appendToGoogleSheet(record: any, analysis: any) {
  const now = new Date();
  const timestamp = now.toISOString();

  // === Method 1: Google Apps Script web app (primary — no service account needed) ===
  const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (appsScriptUrl) {
    try {
      // Sync call summary
      const summaryOk = await postToAppsScript({
        type: "call_summary",
        timestamp,
        callId: record.callId,
        customerName: analysis.customerName || "",
        phone: record.phoneNumber,
        address: analysis.address || "",
        serviceType: analysis.serviceType || "",
        summary: analysis.summary || "",
        sentiment: analysis.sentiment || "",
        followUp: analysis.followUpNeeded ? (analysis.followUpNotes || "Yes") : "",
        duration: String(record.duration || 0),
        direction: record.direction || "inbound",
      });

      // Sync estimate if applicable
      if (analysis.estimatedCost || analysis.serviceType) {
        await postToAppsScript({
          type: "estimate",
          timestamp,
          customerName: analysis.customerName || "",
          phone: record.phoneNumber,
          address: analysis.address || "",
          serviceType: analysis.serviceType || "",
          bedrooms: String(analysis.bedrooms || ""),
          bathrooms: String(analysis.bathrooms || ""),
          sqft: String(analysis.sqft || ""),
          estimatedPrice: analysis.estimatedCost ? `$${analysis.estimatedCost.toFixed(2)}` : "",
          source: "AI Auto-Estimate",
        });
      }

      if (summaryOk) {
        console.log(`[openphone-webhook] Synced call ${record.callId} to Google Sheets via Apps Script`);
        return;
      }
    } catch (err) {
      console.error("[openphone-webhook] Apps Script sync failed:", err);
    }
  }

  // === Method 2: Service account fallback (requires GOOGLE_SERVICE_ACCOUNT_KEY) ===
  const dateStr = now.toLocaleDateString("en-US", { timeZone: "America/New_York" });
  try {
    await syncCallSummaryToSheet({
      date: dateStr,
      callId: record.callId,
      phoneNumber: record.phoneNumber,
      direction: record.direction || "inbound",
      duration: record.duration || 0,
      customerName: analysis.customerName,
      summary: analysis.summary,
      sentiment: analysis.sentiment,
      serviceType: analysis.serviceType,
      followUpNeeded: analysis.followUpNeeded,
      followUpNotes: analysis.followUpNotes,
    });

    if (analysis.estimatedCost || analysis.serviceType) {
      await syncEstimateToSheet({
        date: dateStr,
        callId: record.callId,
        customerName: analysis.customerName,
        phoneNumber: record.phoneNumber,
        address: analysis.address,
        sqft: analysis.sqft,
        bedrooms: analysis.bedrooms,
        bathrooms: analysis.bathrooms,
        serviceType: analysis.serviceType,
        estimatedCost: analysis.estimatedCost,
        sentiment: analysis.sentiment,
        summary: analysis.summary,
      });
    }

    console.log(`[openphone-webhook] Synced call ${record.callId} to Google Sheets via service account`);
  } catch (err) {
    console.error("[openphone-webhook] Google Sheets sync failed:", err);
    // Non-blocking — don't let sheet errors break the webhook
  }
}

/** Build a professional HTML email for call summary notifications */
function buildCallEmailHtml(record: any, analysis: any, existingClient?: ExistingClient | null, cleanerBroadcast?: string | null): string {
  const serviceNames: Record<string, string> = {
    healthy_home: "Healthy Home Clean",
    deep_refresh: "Deep Refresh Clean",
    move_in_out: "Move In/Out Clean",
    commercial: "Commercial Clean",
    pressure_wash: "Pressure Washing",
    auto_detail: "Auto Detailing",
  };

  const serviceName = analysis.serviceType
    ? serviceNames[analysis.serviceType] || analysis.serviceType
    : "General Inquiry";

  const sentimentColor =
    analysis.sentiment === "positive" ? "#22c55e" :
    analysis.sentiment === "negative" ? "#ef4444" : "#f59e0b";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
  <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #166534; margin: 0; font-size: 24px;">🌿 Tri State Enterprise</h1>
      <p style="color: #6b7280; margin: 4px 0 0;">Call Summary & Estimate</p>
    </div>

    <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 16px; color: #374151;">${analysis.summary}</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      ${analysis.customerName ? `<tr><td style="padding: 8px 12px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Customer</td><td style="padding: 8px 12px; font-weight: 600; border-bottom: 1px solid #f3f4f6;">${analysis.customerName}</td></tr>` : ""}
      <tr><td style="padding: 8px 12px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Phone</td><td style="padding: 8px 12px; font-weight: 600; border-bottom: 1px solid #f3f4f6;">${record.phoneNumber}</td></tr>
      ${analysis.address ? `<tr><td style="padding: 8px 12px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Address</td><td style="padding: 8px 12px; font-weight: 600; border-bottom: 1px solid #f3f4f6;">${analysis.address}</td></tr>` : ""}
      <tr><td style="padding: 8px 12px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Service</td><td style="padding: 8px 12px; font-weight: 600; border-bottom: 1px solid #f3f4f6;">${serviceName}</td></tr>
      ${analysis.sqft ? `<tr><td style="padding: 8px 12px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Home Size</td><td style="padding: 8px 12px; font-weight: 600; border-bottom: 1px solid #f3f4f6;">${analysis.sqft} sqft — ${analysis.bedrooms || "?"}bd / ${analysis.bathrooms || "?"}ba</td></tr>` : ""}
      <tr><td style="padding: 8px 12px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Sentiment</td><td style="padding: 8px 12px;"><span style="background: ${sentimentColor}; color: white; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: 600;">${analysis.sentiment}</span></td></tr>
    </table>

    ${analysis.estimatedCost ? `
    <div style="background: #166534; color: white; text-align: center; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 14px; opacity: 0.85;">ESTIMATED COST</p>
      <p style="margin: 4px 0 0; font-size: 36px; font-weight: 700;">$${analysis.estimatedCost.toFixed(2)}</p>
    </div>
    ` : ""}

    ${analysis.followUpNeeded ? `
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0; font-weight: 600; color: #92400e;">⚠️ Follow-up Needed</p>
      <p style="margin: 4px 0 0; color: #78350f;">${analysis.followUpNotes || "Please review and follow up."}</p>
    </div>
    ` : ""}

    ${existingClient ? `
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
      <p style="margin: 0 0 12px; font-weight: 700; color: #1e40af; font-size: 15px;">📋 CLIENT HISTORY</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 6px 12px; color: #6b7280; font-size: 13px;">Status</td><td style="padding: 6px 12px; font-weight: 600; font-size: 13px;">${existingClient.status === "NEW" ? "🆕 New" : existingClient.status === "QUOTED" ? "📋 Quoted" : existingClient.status === "ACCEPTED" ? "✅ Active" : existingClient.status}</td></tr>
        <tr><td style="padding: 6px 12px; color: #6b7280; font-size: 13px;">Address on file</td><td style="padding: 6px 12px; font-weight: 600; font-size: 13px;">${existingClient.addressLine1}, ${existingClient.city} ${existingClient.postalCode}</td></tr>
        <tr><td style="padding: 6px 12px; color: #6b7280; font-size: 13px;">Email</td><td style="padding: 6px 12px; font-weight: 600; font-size: 13px;">${existingClient.customerEmail}</td></tr>
        <tr><td style="padding: 6px 12px; color: #6b7280; font-size: 13px;">Service type</td><td style="padding: 6px 12px; font-weight: 600; font-size: 13px;">${existingClient.serviceType?.replace(/_/g, " ") || "—"}</td></tr>
        ${existingClient.squareFootage ? `<tr><td style="padding: 6px 12px; color: #6b7280; font-size: 13px;">Home size</td><td style="padding: 6px 12px; font-weight: 600; font-size: 13px;">${existingClient.squareFootage} sqft</td></tr>` : ""}
        <tr><td style="padding: 6px 12px; color: #6b7280; font-size: 13px;">Prior jobs</td><td style="padding: 6px 12px; font-weight: 600; font-size: 13px;">${existingClient.totalJobs}</td></tr>
        ${existingClient.lastJobDate ? `<tr><td style="padding: 6px 12px; color: #6b7280; font-size: 13px;">Last job</td><td style="padding: 6px 12px; font-weight: 600; font-size: 13px;">${existingClient.lastJobDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</td></tr>` : ""}
        ${existingClient.quoteTotal ? `<tr><td style="padding: 6px 12px; color: #6b7280; font-size: 13px;">Last quote</td><td style="padding: 6px 12px; font-weight: 600; font-size: 13px;">$${existingClient.quoteTotal.toFixed(2)}</td></tr>` : ""}
        ${existingClient.notes ? `<tr><td style="padding: 6px 12px; color: #6b7280; font-size: 13px;">Notes</td><td style="padding: 6px 12px; font-size: 13px;">${existingClient.notes}</td></tr>` : ""}
      </table>
    </div>
    ` : `
    <div style="background: #fefce8; border: 1px solid #fde68a; border-radius: 10px; padding: 16px; margin-bottom: 20px; text-align: center;">
      <p style="margin: 0; font-weight: 600; color: #92400e;">🆕 NEW CALLER — No matching client record found</p>
    </div>
    `}

    ${cleanerBroadcast ? `
    <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
      <p style="margin: 0 0 8px; font-weight: 700; color: #166534; font-size: 15px;">📨 READY-TO-SEND CLEANER MESSAGE</p>
      <p style="margin: 0 0 12px; color: #6b7280; font-size: 13px;">Copy & paste to broadcast to all cleaners:</p>
      <div style="background: white; border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; font-family: monospace; white-space: pre-wrap; font-size: 13px; line-height: 1.5; color: #1f2937;">${cleanerBroadcast}</div>
    </div>
    ` : ""}

    <div style="text-align: center; margin-top: 24px;">
      <a href="https://tseorganicclean264-production.up.railway.app/admin/transcripts" style="background: #166534; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View All Transcripts</a>
    </div>

    <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px;">
      Call duration: ${record.duration || 0}s | ${new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
    </p>
  </div>
</body>
</html>`;
}

/** Upsert call data to CrmLead table for CRM integration */
async function upsertToCrmLead(
  record: any,
  analysis: any,
  existingClient: ExistingClient | null
) {
  const tenantId = process.env.DEFAULT_TENANT_ID;
  if (!tenantId) {
    console.warn("[openphone-webhook] DEFAULT_TENANT_ID not set, skipping CRM upsert");
    return;
  }

  const phoneNumber = record.phoneNumber;
  const contactName = analysis.customerName || existingClient?.customerName || null;
  const email = existingClient?.customerEmail || analysis.customerEmail || null;

  // Build address
  let address = null;
  if (existingClient?.addressLine1) {
    address = `${existingClient.addressLine1}, ${existingClient.city}, ${existingClient.state} ${existingClient.postalCode}`;
  } else if (analysis.address) {
    address = analysis.address;
  }

  // Build notes with call context
  const notes = [
    address ? `Address: ${address}` : null,
    analysis.summary ? `Summary: ${analysis.summary}` : null,
    analysis.followUpNeeded ? `Follow-up: ${analysis.followUpNotes || "Yes"}` : null,
    `Call ID: ${record.callId}`,
  ]
    .filter(Boolean)
    .join("\n");

  // Build metadata
  const metadata = {
    source: "openphone_call",
    callId: record.callId,
    direction: record.direction,
    duration: record.duration,
    serviceType: analysis.serviceType,
    estimatedCost: analysis.estimatedCost,
    sqft: analysis.sqft,
    bedrooms: analysis.bedrooms,
    bathrooms: analysis.bathrooms,
    sentiment: analysis.sentiment,
    followUpNeeded: analysis.followUpNeeded,
    syncedAt: new Date().toISOString(),
  };

  if (!phoneNumber) {
    console.warn("[openphone-webhook] No phone number in call record, skipping CRM upsert");
    return;
  }

  console.log(
    `[openphone-webhook] Upserting to CRM: ${contactName} (${phoneNumber})`
  );

  try {
    // Try to find existing CrmLead by phone
    const existing = await prisma.crmLead.findFirst({
      where: {
        tenantId,
        contactPhone: phoneNumber,
      },
    });

    let leadId: string;

    if (existing) {
      // Update existing record
      await prisma.crmLead.update({
        where: { id: existing.id },
        data: {
          contactName: contactName || existing.contactName,
          contactEmail: email || existing.contactEmail,
          address: address || existing.address,
          notes: notes,
          metadata: metadata,
          updatedAt: new Date(),
        },
      });
      console.log(
        `[openphone-webhook] Updated CrmLead: ${existing.id} (${contactName})`
      );
      leadId = existing.id;
    } else {
      // Create new CrmLead record
      const created = await prisma.crmLead.create({
        data: {
          tenantId,
          businessName: contactName || "Unknown", // businessName is required
          contactName: contactName,
          contactEmail: email,
          contactPhone: phoneNumber,
          address: address,
          source: "openphone",
          status: "new",
          notes: notes,
          metadata: metadata,
        },
      });
      console.log(
        `[openphone-webhook] Created CrmLead: ${contactName} (${phoneNumber})`
      );
      leadId = created.id;
    }

    // Hook: Sync to OpenPhone after creating/updating lead
    try {
      await syncContactToOpenPhone(leadId);
    } catch (err) {
      console.error("[webhook] OpenPhone sync failed:", err);
      // Don't fail the webhook if sync fails
    }
  } catch (err) {
    console.error("[openphone-webhook] Failed to upsert CrmLead:", err);
    throw err;
  }
}
