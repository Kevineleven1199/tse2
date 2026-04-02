import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import { NextResponse, type NextRequest } from "next/server";
import { sendEmail } from "@/src/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/drip-campaigns
 * Trigger a drip campaign sequence: welcome, re-engage, or post-service
 */
export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!["HQ", "MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { sequence, targetEmails } = await request.json();

  if (!sequence || !["welcome", "re-engage", "post-service", "commercial"].includes(sequence)) {
    return NextResponse.json({ error: "Invalid sequence. Use: welcome, re-engage, post-service, commercial" }, { status: 400 });
  }

  const templates = DRIP_TEMPLATES[sequence as keyof typeof DRIP_TEMPLATES];
  let recipients: string[] = [];

  if (targetEmails && Array.isArray(targetEmails)) {
    recipients = targetEmails;
  } else {
    // Auto-select recipients based on sequence type
    if (sequence === "welcome") {
      // Customers created in last 7 days
      const recent = await prisma.user.findMany({
        where: { tenantId: session.tenantId, role: "CUSTOMER", createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
        select: { email: true },
      });
      recipients = recent.map((u) => u.email);
    } else if (sequence === "re-engage") {
      // Customers with no job in 30+ days
      const inactive = await prisma.serviceRequest.findMany({
        where: { tenantId: session.tenantId, status: "COMPLETED", updatedAt: { lte: new Date(Date.now() - 30 * 86400000) } },
        select: { customerEmail: true },
        distinct: ["customerEmail"],
      });
      recipients = inactive.map((r) => r.customerEmail).filter(Boolean);
    } else if (sequence === "post-service") {
      // Jobs completed in last 24 hours
      const recentJobs = await prisma.job.findMany({
        where: { tenantId: session.tenantId, status: "COMPLETED", updatedAt: { gte: new Date(Date.now() - 86400000) } },
        include: { request: { select: { customerEmail: true, customerName: true } } },
      });
      recipients = recentJobs.map((j) => j.request.customerEmail).filter(Boolean);
    }
  }

  // Send first email in sequence immediately, queue rest
  let sent = 0;
  for (const email of recipients) {
    try {
      await sendEmail({
        to: email,
        subject: templates[0].subject,
        html: templates[0].html,
      });
      sent++;
    } catch (e) {
      console.warn(`[drip] Failed to send to ${email}:`, e);
    }
  }

  return NextResponse.json({
    ok: true,
    sequence,
    recipientCount: recipients.length,
    sent,
    totalEmails: templates.length,
    note: `Email 1 of ${templates.length} sent. Remaining emails in sequence should be scheduled via cron.`,
  });
}

const DRIP_TEMPLATES = {
  welcome: [
    {
      subject: "Welcome to Tri State Enterprise! 🌿",
      delay: 0,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><div style="background:#2E7D32;padding:24px;border-radius:12px 12px 0 0"><h1 style="color:#fff;margin:0;font-size:24px">Welcome to Tri State! 🌿</h1></div><div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px"><p>Thank you for choosing organic cleaning! Here's what makes us different:</p><ul><li><strong>100% organic, EPA-certified products</strong> — safe for kids, pets, and the planet</li><li><strong>Background-checked, insured crew</strong> — trusted professionals in your home</li><li><strong>Satisfaction guaranteed</strong> — if it's not perfect, we'll re-clean for free</li></ul><p>Ready to book your first clean?</p><p><a href="https://tsenow.com/get-a-quote" style="display:inline-block;padding:14px 28px;background:#2E7D32;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">Get Your Free Quote →</a></p><p style="color:#6b7280;font-size:13px;margin-top:24px">Tri State Enterprise · Flatwoods, KY · (606) 555-0100</p></div></div>`,
    },
    {
      subject: "5 Reasons Organic Cleaning is Better for Your Family",
      delay: 3,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><h2 style="color:#2E7D32">Did You Know? 🧪</h2><p>Traditional cleaning products contain 62+ chemicals linked to hormonal disruption and respiratory issues. Here's why organic matters:</p><ol><li><strong>No VOCs</strong> — Volatile organic compounds cause headaches and asthma</li><li><strong>Pet safe</strong> — Cats and dogs are 10x more sensitive to chemical residue</li><li><strong>Better air quality</strong> — Your home air improves within 24 hours</li><li><strong>Eco-friendly</strong> — Biodegradable products that don't harm waterways</li><li><strong>Long-term health</strong> — Reduced cancer risk from household chemical exposure</li></ol><p>Questions? Reply to this email or call us at (606) 555-0100.</p></div>`,
    },
    {
      subject: "Your 10% Welcome Discount (Expires This Week)",
      delay: 7,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><h2 style="color:#2E7D32">Special Offer Just for You! 🎉</h2><p>As a thank you for joining our community, here's <strong>10% off your first clean</strong>:</p><div style="background:#f0fdf4;border:2px dashed #2E7D32;border-radius:12px;padding:20px;text-align:center;margin:20px 0"><p style="font-size:28px;font-weight:bold;color:#2E7D32;margin:0">WELCOME10</p><p style="color:#6b7280;margin:8px 0 0">Use this code when booking · Expires in 7 days</p></div><p><a href="https://tsenow.com/get-a-quote" style="display:inline-block;padding:14px 28px;background:#2E7D32;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">Book Now with 10% Off →</a></p></div>`,
    },
  ],

  "re-engage": [
    {
      subject: "We miss you! 💚 Here's 15% off your next clean",
      delay: 0,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><h2 style="color:#2E7D32">It's Been a While! 👋</h2><p>We noticed it's been over a month since your last clean. Life gets busy — we get it!</p><p>Here's <strong>15% off</strong> to make it easy to get back on schedule:</p><div style="background:#f0fdf4;border:2px dashed #2E7D32;border-radius:12px;padding:20px;text-align:center;margin:20px 0"><p style="font-size:28px;font-weight:bold;color:#2E7D32;margin:0">COMEBACK15</p><p style="color:#6b7280;margin:8px 0 0">Use this code when booking</p></div><p><a href="https://tsenow.com/get-a-quote" style="display:inline-block;padding:14px 28px;background:#2E7D32;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">Rebook Now →</a></p></div>`,
    },
    {
      subject: "Last chance: Your 15% discount expires tomorrow",
      delay: 5,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><h2 style="color:#dc2626">⏰ Expiring Tomorrow</h2><p>Your <strong>15% off coupon (COMEBACK15)</strong> expires tomorrow. Don't miss out on a sparkling clean home with organic, pet-safe products.</p><p><a href="https://tsenow.com/get-a-quote" style="display:inline-block;padding:14px 28px;background:#2E7D32;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">Use My Discount →</a></p></div>`,
    },
  ],

  "post-service": [
    {
      subject: "How was your clean? ⭐",
      delay: 0,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><h2 style="color:#2E7D32">Thank You! 🌿</h2><p>We hope your home feels amazing! Your feedback helps us improve and helps other families find safe, organic cleaning.</p><p style="font-size:18px;text-align:center;margin:20px 0"><a href="https://g.page/r/tseorganicclean/review" style="display:inline-block;padding:14px 28px;background:#FFA000;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">⭐ Leave a Google Review</a></p><p style="color:#6b7280">It only takes 30 seconds and means the world to our small team.</p></div>`,
    },
    {
      subject: "Refer a friend, earn $25 credit 💚",
      delay: 3,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><h2 style="color:#2E7D32">Love Your Clean? Share the Love! 🎁</h2><p>For every friend you refer who books a clean, you <strong>both get $25 off</strong>!</p><p>Just share your unique referral link (find it in your <a href="https://tsenow.com/client" style="color:#2E7D32">client portal</a>) or call us at (606) 555-0100.</p><p style="color:#6b7280;font-size:13px">There's no limit — refer 10 friends, earn $250 in credits!</p></div>`,
    },
  ],

  commercial: [
    {
      subject: "Organic cleaning for your office — free walkthrough",
      delay: 0,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><h2 style="color:#2E7D32">A Cleaner Office Without the Chemicals 🏢</h2><p>Tri State Enterprise provides commercial cleaning services using EPA Safer Choice certified products — healthier for your employees, clients, and the environment.</p><p><strong>We offer:</strong></p><ul><li>Daily/weekly/monthly office cleaning</li><li>Medical & dental office sanitization</li><li>Condo & HOA common area maintenance</li><li>Post-construction cleanup</li></ul><p>We'd love to do a free walkthrough and custom quote for your space.</p><p><a href="https://tsenow.com/get-a-quote" style="display:inline-block;padding:14px 28px;background:#2E7D32;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">Schedule Free Walkthrough →</a></p></div>`,
    },
  ],
} as const;
