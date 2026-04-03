/**
 * Nextdoor Lead Capture Webhook
 *
 * Two intake methods:
 *
 * 1. ZAPIER WEBHOOK — Nextdoor Lead Gen Ad → Zapier → POST here
 *    Zapier sends lead form data (name, email, phone, address, zip, custom fields)
 *
 * 2. EMAIL PARSING — Forward Nextdoor notification emails here
 *    For organic opportunities / "In Search Of" posts
 *
 * Both methods:
 *   → Save lead to DB
 *   → Send admin notification email with lead details
 *   → Auto-reply to customer via SMS (if phone available) or email
 *   → Create AdminApproval for scheduling follow-up
 *
 * Environment variables:
 *   NEXTDOOR_WEBHOOK_SECRET  - Shared secret for webhook auth (optional)
 *   CALL_NOTIFY_EMAILS       - Admin email(s) to notify about new leads
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmailWithFailsafe } from "@/src/lib/email-failsafe";
import { sendSms } from "@/src/lib/openphone";

export const dynamic = "force-dynamic";

// ─── POST: Receive Nextdoor lead ───

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("[nextdoor-webhook] Received lead:", JSON.stringify(body).substring(0, 500));

    // Optional auth check
    const secret = request.headers.get("x-webhook-secret") || body.secret;
    const expectedSecret = process.env.NEXTDOOR_WEBHOOK_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ─── Normalize lead data ───
    // Supports both Zapier-formatted and custom webhook payloads
    const lead = {
      customerName: body.name || body.full_name || body.customerName || body.first_name
        ? `${body.first_name || ""} ${body.last_name || ""}`.trim()
        : null,
      customerEmail: body.email || body.customer_email || body.emailAddress || null,
      customerPhone: body.phone || body.phone_number || body.customerPhone || null,
      address: body.address || body.street_address || body.customerAddress || null,
      zipCode: body.zip || body.zip_code || body.postal_code || body.zipCode || null,
      message: body.message || body.custom_message || body.inquiry || body.notes || null,
      source: body.source || "nextdoor_ad",
      leadId: body.lead_id || body.nextdoor_lead_id || null,
      metadata: body, // Store full original payload
    };

    // ─── Save to database ───
    const saved = await prisma.nextdoorLead.create({
      data: {
        tenantId: process.env.DEFAULT_TENANT_ID || "",
        leadId: lead.leadId,
        customerName: lead.customerName,
        customerEmail: lead.customerEmail,
        customerPhone: lead.customerPhone,
        address: lead.address,
        zipCode: lead.zipCode,
        message: lead.message,
        source: lead.source,
        metadata: lead.metadata,
      },
    });
    console.log(`[nextdoor-webhook] Saved lead: ${saved.id}`);

    // ─── Auto-reply to customer ───
    let autoReplied = false;

    // SMS auto-reply (via OpenPhone)
    if (lead.customerPhone) {
      try {
        const smsBody = buildAutoReplyText(lead.customerName);
        await sendSms({ to: [lead.customerPhone], content: smsBody });
        autoReplied = true;
        console.log(`[nextdoor-webhook] SMS auto-reply sent to ${lead.customerPhone}`);
      } catch (err) {
        console.error("[nextdoor-webhook] SMS auto-reply failed:", err);
      }
    }

    // Email auto-reply
    if (lead.customerEmail && !autoReplied) {
      try {
        await sendEmailWithFailsafe({
          to: lead.customerEmail,
          subject: "Thanks for reaching out to Tri State Enterprise! 🌿",
          html: buildAutoReplyEmail(lead.customerName),
        });
        autoReplied = true;
        console.log(`[nextdoor-webhook] Email auto-reply sent to ${lead.customerEmail}`);
      } catch (err) {
        console.error("[nextdoor-webhook] Email auto-reply failed:", err);
      }
    }

    // Update auto-reply status
    if (autoReplied) {
      await prisma.nextdoorLead.update({
        where: { id: saved.id },
        data: { autoReplied: true, autoReplyAt: new Date() },
      });
    }

    // ─── Notify admin ───
    const notifyEmails = process.env.CALL_NOTIFY_EMAILS || process.env.FAILSAFE_EMAIL;
    if (notifyEmails) {
      const toList = notifyEmails.split(",").map((e) => e.trim());
      for (const to of toList) {
        try {
          await sendEmailWithFailsafe({
            to,
            subject: `🏠 New Nextdoor Lead: ${lead.customerName || "Unknown"} ${lead.zipCode ? `(${lead.zipCode})` : ""}`,
            html: buildAdminNotificationEmail(lead, saved.id, autoReplied),
          });
        } catch (err) {
          console.error(`[nextdoor-webhook] Admin notification failed for ${to}:`, err);
        }
      }
    }

    // ─── Create admin approval for scheduling ───
    await prisma.adminApproval.create({
      data: {
        type: "nextdoor_lead",
        customerName: lead.customerName,
        customerPhone: lead.customerPhone,
        customerEmail: lead.customerEmail,
        address: lead.address || (lead.zipCode ? `Zip: ${lead.zipCode}` : null),
        source: "nextdoor",
        aiSummary: lead.message || "Nextdoor lead — follow up needed",
        metadata: {
          nextdoorLeadId: saved.id,
          zipCode: lead.zipCode,
          autoReplied,
          originalPayload: lead.metadata,
        },
      },
    });

    return NextResponse.json({
      success: true,
      leadId: saved.id,
      autoReplied,
    });
  } catch (error: any) {
    console.error("[nextdoor-webhook] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── Templates ───

function buildAutoReplyText(name?: string | null): string {
  const greeting = name ? `Hi ${name.split(" ")[0]}` : "Hi there";
  return [
    `${greeting}! 🌿`,
    ``,
    `Thanks for reaching out to Tri State Enterprise! We'd love to help.`,
    ``,
    `We use 100% organic, professional products safe for kids, pets, and the planet.`,
    ``,
    `A team member will reach out shortly to schedule your free estimate. Or you can get an instant quote at:`,
    `https://tsenow.com/get-a-quote`,
    ``,
    `— The Tri State Team`,
  ].join("\n");
}

function buildAutoReplyEmail(name?: string | null): string {
  const greeting = name ? `Hi ${name.split(" ")[0]}` : "Hi there";
  return `
    <div style="font-family: -apple-system, Arial, sans-serif; max-width: 540px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #166534, #15803d); padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 22px;">🌿 Tri State Enterprise</h1>
      </div>
      <div style="padding: 24px; background: #f0fdf4; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px;">${greeting}!</p>
        <p>Thanks for reaching out through Nextdoor! We're thrilled you're interested in our <strong>100% professional services services</strong>.</p>
        <p>We use professional, professional-grade products that are safe for your family, pets, and the planet — without compromising on clean.</p>
        <p>A team member will be in touch shortly to schedule your free estimate.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://tsenow.com/get-a-quote"
             style="background: #166534; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Get Your Instant Quote →
          </a>
        </div>
        <p style="font-size: 13px; color: #6b7280;">
          Serving Flatwoods County &amp; surrounding areas<br>
          <a href="https://tsenow.com" style="color: #166534;">tsenow.com</a> | (606) 836-2534
        </p>
      </div>
    </div>
  `;
}

function buildAdminNotificationEmail(
  lead: any,
  leadId: string,
  autoReplied: boolean
): string {
  return `
    <div style="font-family: -apple-system, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e40af; padding: 16px 24px; border-radius: 12px 12px 0 0;">
        <h2 style="color: white; margin: 0;">🏠 New Nextdoor Lead</h2>
      </div>
      <div style="padding: 24px; background: #eff6ff; border-radius: 0 0 12px 12px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; font-weight: 600;">Name:</td><td>${lead.customerName || "—"}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: 600;">Phone:</td><td>${lead.customerPhone || "—"}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: 600;">Email:</td><td>${lead.customerEmail || "—"}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: 600;">Address:</td><td>${lead.address || "—"}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: 600;">Zip:</td><td>${lead.zipCode || "—"}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: 600;">Message:</td><td>${lead.message || "—"}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: 600;">Source:</td><td>${lead.source}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: 600;">Auto-replied:</td><td>${autoReplied ? "✅ Yes" : "❌ No — manual follow-up needed"}</td></tr>
        </table>
        <div style="margin-top: 16px; padding: 12px; background: white; border-radius: 8px; border-left: 4px solid #166534;">
          <p style="margin: 0; font-size: 13px; color: #6b7280;">Lead ID: ${leadId}</p>
          <p style="margin: 4px 0 0; font-size: 13px;">
            <a href="https://tristateenterprise264-production.up.railway.app/admin" style="color: #1e40af;">
              Open Admin Dashboard →
            </a>
          </p>
        </div>
      </div>
    </div>
  `;
}
