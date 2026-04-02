/**
 * Newsletter HTML Email Templates
 * Responsive email-safe HTML templates
 * Uses inline styles for maximum email client compatibility
 */

import type { NewsletterContent } from "./content";

const BRAND_GREEN = "#0fb77a";
const BRAND_DARK = "#1e5130";
const BRAND_LIGHT = "#f0faf4";
const TEXT_COLOR = "#374151";
const MUTED_COLOR = "#6b7280";

/**
 * Format date for display
 */
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

/**
 * Convert newlines in body text to HTML paragraphs
 */
const bodyToHTML = (body: string): string => {
  return body
    .split("\n\n")
    .filter((p) => p.trim())
    .map((p) => {
      // Check if it's a list item (starts with • or -)
      if (p.trim().startsWith("•") || p.trim().startsWith("-")) {
        const items = p
          .split("\n")
          .filter((line) => line.trim())
          .map(
            (line) =>
              `<li style="margin-bottom: 6px; color: ${TEXT_COLOR};">${line.replace(/^[•\-]\s*/, "")}</li>`
          )
          .join("");
        return `<ul style="margin: 16px 0; padding-left: 20px;">${items}</ul>`;
      }
      // Check if it's a numbered list
      if (/^\d+\./.test(p.trim())) {
        const items = p
          .split("\n")
          .filter((line) => line.trim())
          .map(
            (line) =>
              `<li style="margin-bottom: 6px; color: ${TEXT_COLOR};">${line.replace(/^\d+\.\s*/, "")}</li>`
          )
          .join("");
        return `<ol style="margin: 16px 0; padding-left: 20px;">${items}</ol>`;
      }
      return `<p style="margin: 0 0 16px; color: ${TEXT_COLOR}; font-size: 16px; line-height: 1.6;">${p.trim()}</p>`;
    })
    .join("");
};

/**
 * Render the full newsletter HTML
 */
export const renderNewsletterHTML = (
  content: NewsletterContent,
  date: Date = new Date()
): string => {
  const tipHTML = content.tip
    ? `
    <tr>
      <td style="padding: 0 32px 24px;">
        <table width="100%" style="background: ${BRAND_LIGHT}; border-radius: 12px; border-left: 4px solid ${BRAND_GREEN};">
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: ${BRAND_DARK}; text-transform: uppercase; letter-spacing: 1px;">
                ${content.tip.title}
              </p>
              <p style="margin: 0; font-size: 15px; line-height: 1.5; color: ${TEXT_COLOR};">
                ${content.tip.text}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
    : "";

  const promoHTML = content.promoCode
    ? `
    <tr>
      <td style="padding: 0 32px 24px;">
        <table width="100%" style="background: #fef3c7; border-radius: 12px; text-align: center;">
          <tr>
            <td style="padding: 16px 24px;">
              <p style="margin: 0 0 4px; font-size: 13px; color: #92400e; text-transform: uppercase; letter-spacing: 1px;">
                Use Code
              </p>
              <p style="margin: 0; font-size: 24px; font-weight: 700; color: #78350f; letter-spacing: 2px;">
                ${content.promoCode}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${content.subject}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <!-- Preview Text -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${content.preview}
    &#847; &#847; &#847; &#847; &#847;
  </div>

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <!-- Email Container -->
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN}); padding: 32px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                Tri State Enterprise
              </p>
              <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 2px;">
                Daily Newsletter
              </p>
            </td>
          </tr>

          <!-- Date -->
          <tr>
            <td style="padding: 24px 32px 0; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: ${MUTED_COLOR};">
                ${formatDate(date)}
              </p>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td style="padding: 16px 32px 8px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: ${BRAND_DARK}; line-height: 1.3;">
                ${content.heading}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 8px 32px 24px;">
              ${bodyToHTML(content.body)}
            </td>
          </tr>

          <!-- Tip Box -->
          ${tipHTML}

          <!-- Promo Code -->
          ${promoHTML}

          <!-- CTA Button -->
          <tr>
            <td style="padding: 8px 32px 32px; text-align: center;">
              <a href="https://tseorganicclean264-production.up.railway.app${content.cta.url}"
                 style="display: inline-block; background: ${BRAND_GREEN}; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 50px; letter-spacing: 0.5px;">
                ${content.cta.text} →
              </a>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;">
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: ${BRAND_DARK};">
                Tri State Enterprise
              </p>
              <p style="margin: 0 0 4px; font-size: 13px; color: ${MUTED_COLOR};">
                Flatwoods, Ashland & Tri-State Area
              </p>
              <p style="margin: 0 0 16px; font-size: 13px; color: ${MUTED_COLOR};">
                (606) 555-0100 • info@tsenow.com
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                You're receiving this because you subscribed to our daily newsletter.
                <br>
                <a href="https://tseorganicclean264-production.up.railway.app/api/newsletter/unsubscribe?email={{EMAIL}}"
                   style="color: #9ca3af; text-decoration: underline;">
                  Unsubscribe
                </a>
                •
                <a href="https://tseorganicclean264-production.up.railway.app/community"
                   style="color: #9ca3af; text-decoration: underline;">
                  Community
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
