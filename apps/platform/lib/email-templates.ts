/**
 * Email templates for job notifications
 * Simple inline-CSS HTML emails sent via SendGrid
 */

const BRAND_GREEN = "#2D6A4F";
const BRAND_LIGHT = "#B7E4C7";
const BRAND_BG = "#F0FFF4";

const wrapper = (content: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;">
<tr><td style="background:${BRAND_GREEN};padding:24px 32px;">
<h1 style="margin:0;color:#ffffff;font-size:20px;">Tri State Enterprise</h1>
</td></tr>
<tr><td style="padding:32px;">
${content}
</td></tr>
<tr><td style="background:${BRAND_BG};padding:16px 32px;text-align:center;font-size:12px;color:#666;">
Tri State Enterprise &bull; Flatwoods, KY<br/>
Eco-friendly cleaning you can trust
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

export function buildNewJobEmail(params: {
  serviceType: string;
  city: string;
  payout: string;
  date: string;
}): { subject: string; html: string } {
  const service = params.serviceType.replace(/_/g, " ");
  return {
    subject: `New Job Available: ${service} in ${params.city}`,
    html: wrapper(`
      <h2 style="margin:0 0 16px;color:${BRAND_GREEN};font-size:22px;">New Job Available!</h2>
      <div style="background:${BRAND_BG};border-radius:8px;padding:20px;margin-bottom:20px;">
        <p style="margin:0 0 8px;font-size:16px;"><strong>Service:</strong> ${service}</p>
        <p style="margin:0 0 8px;font-size:16px;"><strong>Location:</strong> ${params.city}</p>
        <p style="margin:0 0 8px;font-size:16px;"><strong>Date:</strong> ${params.date}</p>
        <p style="margin:0;font-size:20px;color:${BRAND_GREEN};"><strong>Earn $${params.payout}</strong></p>
      </div>
      <p style="margin:0 0 16px;color:#333;font-size:14px;">Log in to your Tri State dashboard to claim this job, or reply CLAIM to this email.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://app.tsenow.com"}/cleaner" style="display:inline-block;background:${BRAND_GREEN};color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">View Job Details</a>
    `),
  };
}

export function buildJobClaimedEmail(params: {
  cleanerName: string;
  serviceType: string;
}): { subject: string; html: string } {
  const service = params.serviceType.replace(/_/g, " ").toLowerCase();
  return {
    subject: `Great News: ${params.cleanerName} Has Been Assigned`,
    html: wrapper(`
      <h2 style="margin:0 0 16px;color:${BRAND_GREEN};font-size:22px;">Your Cleaner Is Assigned!</h2>
      <p style="margin:0 0 16px;color:#333;font-size:15px;"><strong>${params.cleanerName}</strong> has been assigned to your ${service}. We'll confirm your appointment time shortly.</p>
      <p style="margin:0 0 16px;color:#333;font-size:14px;">Have questions? Simply reply to this email or text us and we'll get back to you right away.</p>
    `),
  };
}

export function buildScheduleConfirmedEmail(params: {
  date: string;
  time: string;
  address: string;
  serviceType: string;
  contactName: string;
  variant: "customer" | "cleaner";
  payout?: string;
}): { subject: string; html: string } {
  const service = params.serviceType.replace(/_/g, " ").toLowerCase();
  const isCustomer = params.variant === "customer";

  return {
    subject: `Confirmed: ${service} on ${params.date}`,
    html: wrapper(`
      <h2 style="margin:0 0 16px;color:${BRAND_GREEN};font-size:22px;">Appointment Confirmed!</h2>
      <div style="background:${BRAND_BG};border-radius:8px;padding:20px;margin-bottom:20px;">
        <p style="margin:0 0 8px;font-size:16px;"><strong>Service:</strong> ${service}</p>
        <p style="margin:0 0 8px;font-size:16px;"><strong>Date:</strong> ${params.date}</p>
        <p style="margin:0 0 8px;font-size:16px;"><strong>Time:</strong> ${params.time}</p>
        <p style="margin:0 0 8px;font-size:16px;"><strong>Address:</strong> ${params.address}</p>
        ${isCustomer ? "" : `<p style="margin:0 0 8px;font-size:16px;"><strong>Customer:</strong> ${params.contactName}</p>`}
        ${params.payout ? `<p style="margin:0;font-size:18px;color:${BRAND_GREEN};"><strong>Payout: $${params.payout}</strong></p>` : ""}
      </div>
      <p style="margin:0;color:#333;font-size:14px;">${isCustomer ? "We'll send you a reminder the day before. Questions? Reply to this email." : `Contact: ${params.contactName}. Check your dashboard for full details.`}</p>
    `),
  };
}

export function buildReminderEmail(params: {
  date: string;
  time: string;
  address: string;
  serviceType: string;
  variant: "customer" | "cleaner";
  contactName?: string;
  contactPhone?: string;
}): { subject: string; html: string } {
  const service = params.serviceType.replace(/_/g, " ").toLowerCase();
  const isCustomer = params.variant === "customer";

  return {
    subject: `Reminder: ${service} Tomorrow at ${params.time}`,
    html: wrapper(`
      <h2 style="margin:0 0 16px;color:${BRAND_GREEN};font-size:22px;">Appointment Tomorrow!</h2>
      <div style="background:${BRAND_BG};border-radius:8px;padding:20px;margin-bottom:20px;">
        <p style="margin:0 0 8px;font-size:16px;"><strong>Service:</strong> ${service}</p>
        <p style="margin:0 0 8px;font-size:16px;"><strong>Time:</strong> ${params.time}</p>
        <p style="margin:0 0 8px;font-size:16px;"><strong>Address:</strong> ${params.address}</p>
        ${!isCustomer && params.contactName ? `<p style="margin:0 0 8px;font-size:16px;"><strong>Customer:</strong> ${params.contactName}${params.contactPhone ? ` (${params.contactPhone})` : ""}</p>` : ""}
      </div>
      <p style="margin:0;color:#333;font-size:14px;">${isCustomer ? "Please ensure access to your home. Questions? Reply to this email." : "Check your dashboard for full job details and navigation."}</p>
    `),
  };
}
