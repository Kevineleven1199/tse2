/**
 * Pre-built Email Campaign Templates for Commercial Cleaning Outreach
 * 
 * Each template is customizable with merge tags:
 * {{businessName}}, {{ownerName}}, {{industry}}, {{city}}
 */

export interface CampaignTemplate {
  id: string;
  name: string;
  subject: string;
  category: "cold_outreach" | "follow_up" | "seasonal" | "referral" | "reactivation";
  targetIndustries: string[];
  htmlContent: string;
  description: string;
}

const baseStyle = `
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #059669 0%, #065f46 100%); color: white; padding: 32px; border-radius: 12px 12px 0 0; }
    .content { background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; }
    .footer { background: #f9fafb; padding: 24px 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: 0; font-size: 12px; color: #6b7280; }
    .cta { display: inline-block; background: #059669; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; }
    .highlight { background: #ecfdf5; border-left: 4px solid #059669; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
    h1 { margin: 0; font-size: 24px; }
    h2 { color: #059669; font-size: 18px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; }
  </style>
`;

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "cold_intro_commercial",
    name: "Commercial Cleaning Introduction",
    subject: "Healthier workspace for {{businessName}} — construction & maintenance",
    category: "cold_outreach",
    targetIndustries: ["office_building", "coworking_space", "law_firm", "real_estate"],
    description: "First-touch email for commercial offices. Focuses on employee health and productivity.",
    htmlContent: `<!DOCTYPE html><html><head>${baseStyle}</head><body>
<div class="container">
  <div class="header">
    <h1>Tri State Enterprise</h1>
    <p style="margin:8px 0 0;opacity:0.9;">100% Commercial Services</p>
  </div>
  <div class="content">
    <p>Hi {{ownerName}},</p>
    <p>I'm reaching out because we help businesses like {{businessName}} in {{city}} create healthier, more productive workspaces — without the harsh chemicals found in typical cleaning products.</p>
    
    <div class="highlight">
      <strong>Why businesses switch to Tri State:</strong>
      <ul>
        <li>100% professional-grade equipment and 30+ years of experience</li>
        <li>Reduces sick days by up to 46% (Harvard T.H. Chan School study)</li>
        <li>Same price or less than conventional commercial cleaning</li>
        <li>Fully insured, background-checked team</li>
      </ul>
    </div>

    <p>We currently serve {{city}} area offices and would love to provide a <strong>free walkthrough and custom quote</strong> for {{businessName}}.</p>
    
    <p>Would you have 15 minutes this week for a quick call or visit?</p>

    <a href="https://tsenow.com/get-a-quote" class="cta">Schedule Free Estimate →</a>

    <p>Best regards,<br><strong>Kevin Flanagan</strong><br>Tri State Enterprise<br>(941) 335-7955</p>
  </div>
  <div class="footer">
    <p>Tri State Enterprise | Flatwoods, KY | <a href="https://tsenow.com">tsenow.com</a></p>
    <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
  </div>
</div>
</body></html>`,
  },
  {
    id: "cold_medical",
    name: "Medical/Dental Office Outreach",
    subject: "Non-toxic cleaning for {{businessName}} — patient safety first",
    category: "cold_outreach",
    targetIndustries: ["medical_office", "dental_office", "veterinary"],
    description: "Specialized for healthcare. Emphasizes infection control, patient safety, and OSHA compliance.",
    htmlContent: `<!DOCTYPE html><html><head>${baseStyle}</head><body>
<div class="container">
  <div class="header">
    <h1>Tri State Enterprise</h1>
    <p style="margin:8px 0 0;opacity:0.9;">Healthcare-Grade Construction & Maintenance</p>
  </div>
  <div class="content">
    <p>Hi {{ownerName}},</p>
    <p>As a healthcare facility, {{businessName}} has stricter cleaning requirements than most businesses. Your patients and staff deserve a space that's both spotless <em>and</em> free from harmful chemical residues.</p>
    
    <div class="highlight">
      <strong>Why healthcare providers choose Tri State:</strong>
      <ul>
        <li><strong>Licensed, bonded, and insured professionals</li>
        <li><strong>OSHA-compliant</strong> cleaning protocols for medical environments</li>
        <li>Reduces <strong>chemical sensitivities</strong> for patients with respiratory conditions</li>
        <li>Specialized <strong>waiting room, exam room, and restroom</strong> protocols</li>
        <li>Fully insured with <strong>$2M liability coverage</strong></li>
      </ul>
    </div>

    <p>We'd love to show you how we can maintain the highest hygiene standards at {{businessName}} while eliminating harsh chemicals from your facility.</p>

    <a href="https://tsenow.com/get-a-quote" class="cta">Get a Free Healthcare Facility Quote →</a>

    <p>Best regards,<br><strong>Kevin Flanagan</strong><br>Tri State Enterprise<br>(941) 335-7955</p>
  </div>
  <div class="footer">
    <p>Tri State Enterprise | Flatwoods, KY | <a href="https://tsenow.com">tsenow.com</a></p>
    <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
  </div>
</div>
</body></html>`,
  },
  {
    id: "cold_condo_hoa",
    name: "Condo / HOA Common Area Cleaning",
    subject: "Common area cleaning for {{businessName}} — organic & affordable",
    category: "cold_outreach",
    targetIndustries: ["condo_association"],
    description: "Targeted at HOA boards and property managers. Focuses on resident satisfaction and contract value.",
    htmlContent: `<!DOCTYPE html><html><head>${baseStyle}</head><body>
<div class="container">
  <div class="header">
    <h1>Tri State Enterprise</h1>
    <p style="margin:8px 0 0;opacity:0.9;">Premium Common Area Cleaning</p>
  </div>
  <div class="content">
    <p>Hi {{ownerName}},</p>
    <p>I'm reaching out to {{businessName}} because we specialize in keeping condo and HOA common areas spotless using 100% reliable, professional services.</p>
    
    <div class="highlight">
      <strong>What we handle for condo communities:</strong>
      <ul>
        <li><strong>Lobbies, hallways, and elevators</strong> — daily or weekly service</li>
        <li><strong>Fitness centers and pool areas</strong> — sanitized without harsh chemicals</li>
        <li><strong>Clubhouses and party rooms</strong> — event-ready turnaround</li>
        <li><strong>Stairwells and parking garages</strong> — pressure washing available</li>
        <li><strong>Flexible scheduling</strong> — early morning or late evening to minimize disruption</li>
      </ul>
    </div>

    <p>Residents notice the difference when we clean — the fresh, quality work alone generates positive feedback at board meetings.</p>
    
    <p>Can I send over a custom proposal for {{businessName}}'s common areas? I just need a quick 10-minute walkthrough.</p>

    <a href="https://tsenow.com/get-a-quote" class="cta">Request a Free Walkthrough →</a>

    <p>Best regards,<br><strong>Kevin Flanagan</strong><br>Tri State Enterprise<br>(941) 335-7955</p>
  </div>
  <div class="footer">
    <p>Tri State Enterprise | Flatwoods, KY | <a href="https://tsenow.com">tsenow.com</a></p>
    <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
  </div>
</div>
</body></html>`,
  },
  {
    id: "cold_daycare",
    name: "Daycare / Childcare Center Outreach",
    subject: "Chemical-free cleaning for {{businessName}} — keeping kids safe",
    category: "cold_outreach",
    targetIndustries: ["daycare"],
    description: "For commercial facilities that need well-maintained facilities.",
    htmlContent: `<!DOCTYPE html><html><head>${baseStyle}</head><body>
<div class="container">
  <div class="header">
    <h1>Tri State Enterprise</h1>
    <p style="margin:8px 0 0;opacity:0.9;">Child-Safe Construction & Maintenance</p>
  </div>
  <div class="content">
    <p>Hi {{ownerName}},</p>
    <p>Parents trust {{businessName}} with their most precious gift — their children. That same trust should extend to the products used to clean your facility.</p>
    
    <div class="highlight">
      <strong>Why daycares love Tri State:</strong>
      <ul>
        <li><strong>Zero toxic chemicals</strong> — safe for crawling babies and toddlers</li>
        <li><strong>Allergy-friendly</strong> — fragrance-free, hypoallergenic products</li>
        <li><strong>DCF inspection ready</strong> — we know the cleanliness standards</li>
        <li><strong>Color-coded microfiber system</strong> — prevents cross-contamination</li>
        <li><strong>After-hours cleaning</strong> — ready for drop-off every morning</li>
      </ul>
    </div>

    <p>Imagine telling parents: <em>"We only use 100% organic, licensed, bonded, and insured contractors."</em> That's a powerful differentiator for {{businessName}}.</p>

    <a href="https://tsenow.com/get-a-quote" class="cta">Get a Free Daycare Cleaning Quote →</a>

    <p>Best regards,<br><strong>Kevin Flanagan</strong><br>Tri State Enterprise<br>(941) 335-7955</p>
  </div>
  <div class="footer">
    <p>Tri State Enterprise | Flatwoods, KY | <a href="https://tsenow.com">tsenow.com</a></p>
    <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
  </div>
</div>
</body></html>`,
  },
  {
    id: "follow_up_1",
    name: "Follow-Up #1 (3 days after cold)",
    subject: "Quick follow-up — construction & maintenance for {{businessName}}",
    category: "follow_up",
    targetIndustries: [],
    description: "First follow-up. Short, friendly, references initial outreach.",
    htmlContent: `<!DOCTYPE html><html><head>${baseStyle}</head><body>
<div class="container">
  <div class="content" style="border-radius:12px;border:1px solid #e5e7eb;">
    <p>Hi {{ownerName}},</p>
    <p>I sent a note a few days ago about construction & maintenance for {{businessName}} and wanted to make sure it didn't get buried in your inbox.</p>
    <p>We're offering <strong>free, no-obligation walkthroughs</strong> for businesses in {{city}} this month. Takes about 10 minutes and you'll get a custom quote the same day.</p>
    <p>Would any day this week work for a quick visit or call?</p>
    <p>Best,<br><strong>Kevin Flanagan</strong><br>Tri State Enterprise<br>(941) 335-7955</p>
  </div>
  <div class="footer" style="border-radius:0 0 12px 12px;">
    <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
  </div>
</div>
</body></html>`,
  },
  {
    id: "follow_up_2",
    name: "Follow-Up #2 (7 days — value add)",
    subject: "3 reasons {{city}} businesses are switching to construction & maintenance",
    category: "follow_up",
    targetIndustries: [],
    description: "Second follow-up with social proof and value proposition.",
    htmlContent: `<!DOCTYPE html><html><head>${baseStyle}</head><body>
<div class="container">
  <div class="content" style="border-radius:12px;border:1px solid #e5e7eb;">
    <p>Hi {{ownerName}},</p>
    <p>I wanted to share why more {{city}} businesses are making the switch to construction & maintenance:</p>
    
    <p><strong>1. It costs the same (or less)</strong><br>Organic cleaning products have gotten incredibly cost-competitive. Most of our commercial clients pay the same as they did with their previous cleaning service.</p>
    
    <p><strong>2. Employee/customer health improves</strong><br>Conventional cleaning products contain VOCs that trigger headaches, allergies, and respiratory issues. Our clients report fewer sick days and better air quality.</p>
    
    <p><strong>3. It's a marketing advantage</strong><br>"We use 100% construction & maintenance products" is something your customers and employees notice and appreciate.</p>

    <p>Happy to chat whenever it's convenient — just reply to this email or call (941) 335-7955.</p>

    <p>Best,<br><strong>Kevin Flanagan</strong><br>Tri State Enterprise</p>
  </div>
  <div class="footer" style="border-radius:0 0 12px 12px;">
    <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
  </div>
</div>
</body></html>`,
  },
];

/**
 * Get templates filtered by industry
 */
export function getTemplatesForIndustry(industry: string): CampaignTemplate[] {
  return CAMPAIGN_TEMPLATES.filter(
    t => t.targetIndustries.length === 0 || t.targetIndustries.includes(industry)
  );
}

/**
 * Replace merge tags in template content
 */
export function personalizTemplate(
  html: string,
  data: {
    businessName?: string;
    ownerName?: string;
    industry?: string;
    city?: string;
    unsubscribeUrl?: string;
  }
): string {
  return html
    .replace(/\{\{businessName\}\}/g, data.businessName || "your business")
    .replace(/\{\{ownerName\}\}/g, data.ownerName || "there")
    .replace(/\{\{industry\}\}/g, data.industry?.replace(/_/g, " ") || "business")
    .replace(/\{\{city\}\}/g, data.city || "Flatwoods")
    .replace(/\{\{unsubscribeUrl\}\}/g, data.unsubscribeUrl || "#");
}

/**
 * Gmail sending limits and throttling config
 */
export const GMAIL_LIMITS = {
  // Gmail workspace: 2000/day, Free Gmail: 500/day
  // We use conservative limits to avoid spam flags
  maxPerDay: 80,          // Stay well under limit
  maxPerHour: 20,         // Spread throughout the day
  minDelayBetweenMs: 8000, // 8 seconds between emails
  maxBatchSize: 10,       // Send in batches of 10
  cooldownAfterBatchMs: 60000, // 1 min cooldown between batches
  warmUpSchedule: [       // For new sending addresses
    { day: 1, limit: 10 },
    { day: 2, limit: 20 },
    { day: 3, limit: 30 },
    { day: 7, limit: 50 },
    { day: 14, limit: 80 },
  ],
};
