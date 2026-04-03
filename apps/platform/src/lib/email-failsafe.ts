/**
 * Email Failsafe — ensures every quote is emailed to tse@tristateenterprise.com
 * regardless of whether SendGrid / OpenPhone are configured.
 *
 * Priority:
 * 1. SendGrid (if SENDGRID_API_KEY set)
 * 2. Nodemailer SMTP (if SMTP_HOST set)
 * 3. Console log (always — for Railway log inspection)
 */
import nodemailer from "nodemailer";

const FAILSAFE_EMAIL = "tse@tristateenterprise.com";
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL ?? process.env.SENDGRID_FROM_EMAIL ?? "tse@tristateenterprise.com";
const FROM_NAME = "Tri State Enterprise";

const SENDGRID_BASE_URL = "https://api.sendgrid.com/v3/mail/send";

type EmailOpts = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

/* ─── SendGrid (preferred) ─── */
async function sendViaSendGrid(opts: EmailOpts): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return false;

  try {
    const res = await fetch(SENDGRID_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: opts.to }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        reply_to: opts.replyTo ? { email: opts.replyTo } : undefined,
        subject: opts.subject,
        content: [{ type: "text/html", value: opts.html }]
      })
    });
    return res.ok || res.status === 202;
  } catch (err) {
    console.error("[email-failsafe] SendGrid failed:", err);
    return false;
  }
}

/* ─── Nodemailer SMTP (fallback) ─── */
async function sendViaSmtp(opts: EmailOpts): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  if (!host) return false;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER ?? "",
        pass: process.env.SMTP_PASS ?? ""
      }
    });

    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo
    });
    return true;
  } catch (err) {
    console.error("[email-failsafe] SMTP failed:", err);
    return false;
  }
}

/* ─── Public API ─── */
export async function sendEmailWithFailsafe(opts: EmailOpts): Promise<void> {
  // Try SendGrid first
  const sentViaSG = await sendViaSendGrid(opts);
  if (sentViaSG) {
    console.log(`[email-failsafe] Sent to ${opts.to} via SendGrid`);
    return;
  }

  // Try Nodemailer SMTP
  const sentViaSMTP = await sendViaSmtp(opts);
  if (sentViaSMTP) {
    console.log(`[email-failsafe] Sent to ${opts.to} via SMTP`);
    return;
  }

  // Console fallback — always logs so Railway logs capture the email
  console.warn(`[email-failsafe] No email provider configured. Email content logged below:`);
  console.log(`TO: ${opts.to}`);
  console.log(`SUBJECT: ${opts.subject}`);
  console.log(`BODY: ${opts.html.replace(/<[^>]*>/g, " ").trim().slice(0, 500)}`);
}

/* ─── Quote-specific email sender ─── */
export async function emailQuoteToHQ(data: {
  quoteId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  serviceLabel: string;
  frequencyLabel: string;
  total: number;
  cleanerPay: number;
  addOns: string[];
  preferredDays: string[];
  preferredTimes: string[];
  notes?: string;
}): Promise<void> {
  const addOnList = data.addOns.length > 0 ? data.addOns.join(", ") : "None (Basic)";
  const dayList = data.preferredDays.join(", ") || "Not specified";
  const timeList = data.preferredTimes.join(", ") || "Not specified";

  const subject = `New Quote #${data.quoteId.slice(0, 8).toUpperCase()} — ${data.customerName} — $${data.total.toFixed(2)}`;
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px;">
      <div style="background: #0d5e3b; color: white; padding: 20px; border-radius: 12px 12px 0 0;">
        <h2 style="margin: 0;">New Quote Request</h2>
        <p style="margin: 4px 0 0; opacity: 0.8;">Quote #${data.quoteId.slice(0, 8).toUpperCase()}</p>
      </div>
      <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; font-weight: 600; color: #374151;">Customer</td><td style="padding: 8px 0; color: #4b5563;">${data.customerName}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: 600; color: #374151;">Email</td><td style="padding: 8px 0;"><a href="mailto:${data.customerEmail}" style="color: #0d5e3b;">${data.customerEmail}</a></td></tr>
          <tr><td style="padding: 8px 0; font-weight: 600; color: #374151;">Phone</td><td style="padding: 8px 0;"><a href="tel:${data.customerPhone}" style="color: #0d5e3b;">${data.customerPhone}</a></td></tr>
          <tr><td style="padding: 8px 0; font-weight: 600; color: #374151;">Address</td><td style="padding: 8px 0; color: #4b5563;">${data.address}, ${data.city}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: 600; color: #374151;">Service</td><td style="padding: 8px 0; color: #4b5563;">${data.serviceLabel}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: 600; color: #374151;">Frequency</td><td style="padding: 8px 0; color: #4b5563;">${data.frequencyLabel}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: 600; color: #374151;">Extras</td><td style="padding: 8px 0; color: #4b5563;">${addOnList}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: 600; color: #374151;">Preferred Days</td><td style="padding: 8px 0; color: #4b5563;">${dayList}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: 600; color: #374151;">Preferred Time</td><td style="padding: 8px 0; color: #4b5563;">${timeList}</td></tr>
          ${data.notes ? `<tr><td style="padding: 8px 0; font-weight: 600; color: #374151;">Notes</td><td style="padding: 8px 0; color: #4b5563;">${data.notes}</td></tr>` : ""}
        </table>
        <div style="margin-top: 16px; padding: 16px; background: white; border-radius: 8px; border: 1px solid #d1fae5;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-weight: 700; font-size: 18px; color: #0d5e3b;">Total: $${data.total.toFixed(2)}</span>
          </div>
          <div style="font-size: 13px; color: #6b7280;">
            Cleaner pay: $${data.cleanerPay.toFixed(2)} | Company margin: $${(data.total - data.cleanerPay).toFixed(2)}
          </div>
        </div>
        <p style="margin-top: 16px; font-size: 12px; color: #9ca3af;">
          This quote was auto-generated. Log into the admin dashboard to assign a cleaner.
        </p>
      </div>
    </div>
  `;

  // Send to HQ
  await sendEmailWithFailsafe({
    to: FAILSAFE_EMAIL,
    subject,
    html,
    replyTo: data.customerEmail
  });
}

/* ─── Customer quote confirmation email ─── */
export async function emailQuoteToCustomer(data: {
  customerName: string;
  customerEmail: string;
  total: number;
  serviceLabel: string;
  frequencyLabel: string;
  quoteId: string;
}): Promise<void> {
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0d5e3b; color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Tri State Enterprise</h1>
        <p style="margin: 4px 0 0; opacity: 0.8;">Your personalized quote is ready!</p>
      </div>
      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="color: #374151;">Hi ${data.customerName},</p>
        <p style="color: #4b5563;">Thanks for choosing Tri State Enterprise! Here's your quote:</p>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
          <p style="font-size: 13px; color: #16a34a; margin: 0;">YOUR QUOTE</p>
          <p style="font-size: 36px; font-weight: 700; color: #0d5e3b; margin: 4px 0;">$${data.total.toFixed(2)}</p>
          <p style="font-size: 14px; color: #4b5563; margin: 0;">${data.serviceLabel} — ${data.frequencyLabel}</p>
          <p style="font-size: 12px; color: #9ca3af; margin: 8px 0 0;">Quote #${data.quoteId.slice(0, 8).toUpperCase()}</p>
        </div>
        <div style="color: #4b5563; font-size: 14px;">
          <p><strong>What happens next:</strong></p>
          <ol style="padding-left: 20px;">
            <li style="margin-bottom: 8px;">A cleaner in your area will claim your job (usually within an hour)</li>
            <li style="margin-bottom: 8px;">You'll receive a text when your cleaner is confirmed</li>
            <li style="margin-bottom: 8px;">We'll finalize the schedule based on your preferred times</li>
          </ol>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 13px; color: #9ca3af; text-align: center;">
          Questions? Reply to this email, call, or text us at (606) 836-2534<br/>
          100% organic. 100% satisfaction guaranteed.
        </p>
      </div>
    </div>
  `;

  await sendEmailWithFailsafe({
    to: data.customerEmail,
    subject: `Your Tri State Quote: $${data.total.toFixed(2)} — ${data.serviceLabel}`,
    html
  });
}

/* ─── Discount code email for exit-intent popup ─── */
export async function emailDiscountCode(email: string): Promise<void> {
  const code = "GREEN15";
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0d5e3b; color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Your 15% Discount Code</h1>
      </div>
      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="color: #4b5563; font-size: 16px;">Thanks for your interest in Tri State Enterprise!</p>
        <div style="background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="font-size: 13px; color: #16a34a; margin: 0;">YOUR DISCOUNT CODE</p>
          <p style="font-size: 32px; font-weight: 700; color: #0d5e3b; margin: 8px 0; letter-spacing: 4px;">${code}</p>
          <p style="font-size: 14px; color: #4b5563; margin: 0;">15% off your first cleaning</p>
        </div>
        <p style="color: #4b5563; font-size: 14px;">
          Mention this code when you book or apply it during checkout.<br/>
          New customers only. Valid for 30 days.
        </p>
        <a href="https://tristateenterprise264-production.up.railway.app/get-a-quote"
           style="display: inline-block; background: #0d5e3b; color: white; padding: 12px 32px; border-radius: 999px; text-decoration: none; font-weight: 600; margin-top: 16px;">
          Get Your Quote Now
        </a>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9ca3af;">
          Tri State Enterprise — Flatwoods's #1 Professional Services Service<br/>
          (606) 836-2534 | tse@tristateenterprise.com
        </p>
      </div>
    </div>
  `;

  await sendEmailWithFailsafe({
    to: email,
    subject: "Your 15% Discount Code — Tri State Enterprise",
    html
  });
}
