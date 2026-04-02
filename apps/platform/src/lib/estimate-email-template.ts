import { prisma } from "@/lib/prisma";

const SERVICE_LABELS: Record<string, string> = {
  HOME_CLEAN: "Healthy Home Clean",
  PRESSURE_WASH: "Pressure Washing",
  AUTO_DETAIL: "Eco Auto Detail",
  CUSTOM: "Custom Service",
  DEEP_CLEAN: "Deep Refresh & Detox",
  MOVE_CLEAN: "Move-In / Move-Out Detail",
};

const SERVICE_CHECKLISTS: Record<string, string[]> = {
  HOME_CLEAN: [
    "Kitchen counters, stovetop & sink sanitized",
    "All bathrooms deep-cleaned & disinfected",
    "Floors vacuumed, swept & mopped throughout",
    "Dusting of all reachable surfaces & ceiling fans",
    "Interior window sills & glass cleaned",
    "Baseboards & door frames wiped down",
    "Trash emptied & bags replaced",
  ],
  DEEP_CLEAN: [
    "Everything in the Healthy Home Clean, PLUS:",
    "Inside oven & microwave degreased",
    "Inside refrigerator cleaned & organized",
    "Cabinet fronts & hardware wiped",
    "Light switches & outlets sanitized",
    "Grout scrubbing in kitchen & baths",
    "Blinds & window tracks deep-cleaned",
  ],
  PRESSURE_WASH: [
    "Driveway pressure-washed to remove stains",
    "Sidewalks & walkways cleaned",
    "Patio, lanai & pool deck restored",
    "Exterior walls & siding washed",
    "Garage floor degreased",
  ],
  AUTO_DETAIL: [
    "Full exterior hand wash & dry",
    "Interior vacuum & steam clean",
    "Dashboard, console & vents detailed",
    "All glass cleaned inside & out",
    "Tire dressing & wheel cleaning",
  ],
  CUSTOM: [
    "Full area assessment on arrival",
    "Customized cleaning to your specifications",
    "Detail work on priority areas",
    "Final quality inspection",
    "Walkthrough with you before we leave",
  ],
};

/**
 * Render a world-class branded estimate email.
 * Pulls real Google Reviews from the DB.
 */
export async function renderEstimateEmail(opts: {
  customerName: string;
  serviceType: string | null;
  estimatedCost: number | null;
  address: string | null;
  breakdown?: Record<string, unknown> | null;
  confirmUrl: string;
  portalUrl?: string;
}): Promise<string> {
  const { customerName, serviceType, estimatedCost, address, breakdown, confirmUrl } = opts;
  const firstName = customerName.split(" ")[0] || "there";
  const serviceLabel = SERVICE_LABELS[serviceType ?? ""] ?? "Cleaning Service";
  const checklist = SERVICE_CHECKLISTS[serviceType ?? ""] ?? SERVICE_CHECKLISTS.CUSTOM;
  const priceDisplay = estimatedCost ? `$${estimatedCost.toFixed(0)}` : "Custom Quote";

  // Pull real Google Reviews for social proof
  let reviews: { author: string; rating: number; text: string }[] = [];
  try {
    const dbReviews = await prisma.googleReview.findMany({
      where: { rating: { gte: 4 } },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { authorName: true, rating: true, text: true },
    });
    reviews = dbReviews.map((r) => ({ author: r.authorName, rating: r.rating, text: r.text?.substring(0, 120) ?? "" }));
  } catch {
    // Fallback — no reviews available
  }

  const checklistHtml = checklist
    .map((item) => `<tr><td style="padding:6px 0;vertical-align:top;color:#16a34a;font-size:16px;">✓</td><td style="padding:6px 0 6px 10px;color:#374151;font-size:14px;">${item}</td></tr>`)
    .join("");

  const reviewsHtml = reviews.length > 0
    ? reviews
        .map(
          (r) =>
            `<div style="background:#f0fdf4;border-radius:12px;padding:14px 16px;margin-bottom:10px;">
              <div style="color:#f59e0b;font-size:14px;letter-spacing:2px;">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
              <p style="margin:6px 0 0;color:#1f2937;font-size:13px;line-height:1.5;">"${r.text}${r.text.length >= 120 ? "..." : ""}"</p>
              <p style="margin:4px 0 0;color:#6b7280;font-size:12px;">— ${r.author}</p>
            </div>`
        )
        .join("")
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

<!-- HEADER -->
<tr><td style="background:linear-gradient(135deg,#0d5e3b 0%,#16a34a 100%);padding:32px 40px;">
  <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Tri State Enterprise</h1>
  <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;letter-spacing:1px;">ECO-FRIENDLY · SARASOTA · (606) 555-0100</p>
</td></tr>

<!-- GREETING -->
<tr><td style="padding:32px 40px 0;">
  <h2 style="margin:0;color:#1f2937;font-size:22px;font-weight:600;">Hi ${firstName},</h2>
  <p style="margin:12px 0 0;color:#4b5563;font-size:15px;line-height:1.6;">
    Thank you for reaching out! Based on our conversation, we've put together a personalized estimate for your home.
    Every clean uses <strong>100% organic, EPA Safer Choice certified products</strong> — safe for your family, pets, and the planet.
  </p>
</td></tr>

<!-- PRICE BOX -->
<tr><td style="padding:24px 40px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0d5e3b,#16a34a);border-radius:16px;overflow:hidden;">
  <tr><td style="padding:28px 32px;text-align:center;">
    <p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px;text-transform:uppercase;letter-spacing:3px;font-weight:600;">Your Estimate</p>
    <p style="margin:8px 0 4px;color:#ffffff;font-size:42px;font-weight:800;">${priceDisplay}</p>
    <p style="margin:0;color:rgba(255,255,255,0.8);font-size:14px;">${serviceLabel}${address ? ` · ${address}` : ""}</p>
  </td></tr>
  </table>
</td></tr>

<!-- WHAT'S INCLUDED -->
<tr><td style="padding:0 40px 24px;">
  <h3 style="margin:0 0 12px;color:#0d5e3b;font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">What's Included</h3>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border-radius:12px;padding:16px;">
    ${checklistHtml}
  </table>
</td></tr>

<!-- CTA BUTTON -->
<tr><td style="padding:8px 40px 32px;text-align:center;">
  <a href="${confirmUrl}" style="display:inline-block;background:#0d5e3b;color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:50px;font-size:16px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
    Confirm My Cleaning
  </a>
  <p style="margin:12px 0 0;color:#9ca3af;font-size:12px;">or call us at (606) 555-0100</p>
</td></tr>

<!-- DIVIDER -->
<tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"></td></tr>

<!-- WHY GO GREEN -->
<tr><td style="padding:28px 40px;">
  <h3 style="margin:0 0 16px;color:#0d5e3b;font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Why Families Choose Tri State</h3>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:8px 0;vertical-align:top;width:32px;"><span style="font-size:20px;">🛡️</span></td>
      <td style="padding:8px 0 8px 10px;"><strong style="color:#1f2937;">Licensed, Insured & Background-Checked</strong><br><span style="color:#6b7280;font-size:13px;">Every crew member passes a full background check</span></td>
    </tr>
    <tr>
      <td style="padding:8px 0;vertical-align:top;width:32px;"><span style="font-size:20px;">🌿</span></td>
      <td style="padding:8px 0 8px 10px;"><strong style="color:#1f2937;">EPA Safer Choice Certified Products</strong><br><span style="color:#6b7280;font-size:13px;">Zero harsh chemicals — safe for kids, pets, and the environment</span></td>
    </tr>
    <tr>
      <td style="padding:8px 0;vertical-align:top;width:32px;"><span style="font-size:20px;">📸</span></td>
      <td style="padding:8px 0 8px 10px;"><strong style="color:#1f2937;">Before & After Photo Accountability</strong><br><span style="color:#6b7280;font-size:13px;">Every visit documented with photos you can view in your personal portal</span></td>
    </tr>
    <tr>
      <td style="padding:8px 0;vertical-align:top;width:32px;"><span style="font-size:20px;">✅</span></td>
      <td style="padding:8px 0 8px 10px;"><strong style="color:#1f2937;">Satisfaction Guaranteed</strong><br><span style="color:#6b7280;font-size:13px;">Not happy? We'll re-clean within 24 hours — no charge</span></td>
    </tr>
    <tr>
      <td style="padding:8px 0;vertical-align:top;width:32px;"><span style="font-size:20px;">📱</span></td>
      <td style="padding:8px 0 8px 10px;"><strong style="color:#1f2937;">Your Own Client Portal</strong><br><span style="color:#6b7280;font-size:13px;">Track visits, view invoices, and manage your account anytime</span></td>
    </tr>
  </table>
</td></tr>

${reviewsHtml ? `
<!-- GOOGLE REVIEWS -->
<tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"></td></tr>
<tr><td style="padding:28px 40px;">
  <h3 style="margin:0 0 4px;color:#0d5e3b;font-size:16px;font-weight:700;">What Our Customers Say</h3>
  <p style="margin:0 0 16px;color:#6b7280;font-size:12px;">From our Google Reviews — 5.0 ★ average</p>
  ${reviewsHtml}
  <a href="https://g.page/r/tseorganicclean/review" style="color:#0d5e3b;font-size:13px;font-weight:600;text-decoration:none;">Read all reviews on Google →</a>
</td></tr>
` : ""}

<!-- FOOTER -->
<tr><td style="background:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;">
  <p style="margin:0;color:#6b7280;font-size:12px;text-align:center;">
    Tri State Enterprise · Flatwoods, KY · (606) 555-0100<br>
    <a href="mailto:info@tsenow.com" style="color:#0d5e3b;">info@tsenow.com</a> ·
    <a href="https://tsenow.com" style="color:#0d5e3b;">tsenow.com</a>
  </p>
  <p style="margin:10px 0 0;color:#9ca3af;font-size:11px;text-align:center;">
    This estimate is valid for 48 hours. Prices may vary based on actual home conditions.
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
