import { NextResponse } from "next/server";
import { sendEmailWithFailsafe } from "@/src/lib/email-failsafe";
import { generateNewsletter } from "@/src/lib/newsletter/generator";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/test-email
 *
 * Sends a test email to a specified address.
 * Protected by admin session (middleware checks /api/admin prefix).
 *
 * Body: { "to": "kevin@landtosee.com" }
 */
export const POST = async (request: Request) => {
  try {
    const body = await request.json().catch(() => ({}));
    const to = body.to || "kevin@landtosee.com";

    // Generate today's newsletter content for the test
    const newsletter = generateNewsletter(new Date());

    const testHtml = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2d5016, #4a7c28); color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">Tri State Enterprise</h1>
          <p style="margin: 8px 0 0; opacity: 0.85; font-size: 14px;">Email System Test</p>
        </div>
        <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="color: #374151; font-size: 15px;">This is a test email from your Tri State platform to verify the email system is working.</p>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="font-size: 12px; color: #16a34a; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px;">Today's Cleaning Tip</p>
            <p style="font-size: 16px; font-weight: 600; color: #2d5016; margin: 0 0 8px;">${newsletter.subject}</p>
            <p style="font-size: 14px; color: #4b5563; margin: 0;">${newsletter.preview}</p>
          </div>

          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="font-size: 12px; color: #6b7280; margin: 0;">
              <strong>Email Providers Checked:</strong><br/>
              SendGrid: ${process.env.SENDGRID_API_KEY ? "Configured" : "Not configured"}<br/>
              SMTP: ${process.env.SMTP_HOST ? "Configured" : "Not configured"}<br/>
              Resend: ${process.env.RESEND_API_KEY ? "Configured" : "Not configured"}<br/>
              <br/>
              <strong>Sent at:</strong> ${new Date().toISOString()}<br/>
              <strong>To:</strong> ${to}
            </p>
          </div>
        </div>
        <div style="background: #f9fafb; padding: 16px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; text-align: center;">
          <p style="font-size: 11px; color: #9ca3af; margin: 0;">
            Tri State Enterprise — Flatwoods, KY — (606) 555-0100
          </p>
        </div>
      </div>
    `;

    await sendEmailWithFailsafe({
      to,
      subject: `[TEST] Tri State Email System — ${new Date().toLocaleDateString()}`,
      html: testHtml,
    });

    // Report what provider was used
    const providerUsed = process.env.SENDGRID_API_KEY
      ? "sendgrid"
      : process.env.SMTP_HOST
        ? "smtp"
        : "console";

    return NextResponse.json({
      success: true,
      to,
      provider: providerUsed,
      message:
        providerUsed === "console"
          ? "No email provider configured. Email was logged to server console. Set SENDGRID_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS to enable real email delivery."
          : `Email sent via ${providerUsed}`,
      env_status: {
        SENDGRID_API_KEY: !!process.env.SENDGRID_API_KEY,
        SMTP_HOST: !!process.env.SMTP_HOST,
        SMTP_USER: !!process.env.SMTP_USER,
        SMTP_PASS: !!process.env.SMTP_PASS,
        RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      },
    });
  } catch (error) {
    console.error("[test-email] Error:", error);
    return NextResponse.json(
      {
        error: "Test email failed",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
};
