import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, ArrowLeft, Clock, Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Try to find a blog post in the database first
async function getDbPost(slug: string) {
  try {
    return await prisma.blogPost.findFirst({
      where: { slug, published: true },
      select: { title: true, content: true, excerpt: true, category: true, readTime: true, publishedAt: true, metaDescription: true },
    });
  } catch { return null; }
}

const POSTS: Record<string, { title: string; date: string; readTime: string; category: string; metaDescription: string; content: string }> = {
  "signs-hvac-system-needs-replacement": {
    title: "5 Signs Your HVAC System Needs Replacement",
    date: "2026-03-20",
    readTime: "4 min read",
    category: "HVAC",
    metaDescription: "Learn the five key warning signs that your heating and cooling system needs replacement. Tri State Enterprise serves the KY-OH-WV Tri-State area.",
    content: `Your HVAC system is one of the most critical and expensive components of your home. Knowing when to repair versus replace can save you thousands of dollars and keep your family comfortable year-round.

## 1. Your System Is Over 15 Years Old

The average lifespan of a central air conditioning unit is 15-20 years, and a furnace typically lasts 15-25 years. If your system is approaching or past these milestones, replacement is often more cost-effective than continued repairs.

Modern systems are significantly more energy-efficient. A unit installed in 2006 likely has a SEER rating of 10-13, while today's units range from 15-25 SEER. That efficiency gap translates directly into your monthly energy bills.

## 2. Rising Energy Bills Without Explanation

If your electricity or gas bills have been climbing steadily without a corresponding increase in usage, your HVAC system may be losing efficiency. As components wear out, the system has to work harder to maintain the same temperature, consuming more energy in the process.

Compare your bills year-over-year for the same months. An increase of 15-20% or more with similar usage patterns is a strong indicator that your system is struggling.

## 3. Frequent and Expensive Repairs

The general rule of thumb: if a single repair costs more than 50% of the value of a new system, or if you are calling for repairs more than twice per year, replacement makes better financial sense.

Keep a log of all repair costs. When cumulative repairs over two years exceed 30% of replacement cost, you have reached the tipping point.

## 4. Uneven Temperatures and Poor Airflow

If some rooms are too hot while others are too cold, or if you notice weak airflow from your vents, your system may no longer be capable of properly distributing conditioned air throughout your home.

This can stem from a failing compressor, deteriorating ductwork, or a system that was never properly sized for your home. A professional assessment can identify the root cause.

## 5. Strange Noises or Odors

Banging, squealing, grinding, or rattling noises from your HVAC unit are signs of serious mechanical problems. Similarly, musty or burning smells can indicate mold in the ductwork or electrical issues in the unit.

These symptoms often mean components are failing and the system is nearing the end of its useful life.

## What to Do Next

If you are experiencing any of these warning signs, schedule a professional assessment. At Tri State Enterprise, we provide honest evaluations and will recommend repair when it makes sense and replacement only when it is truly necessary.

[Get your free HVAC assessment](/get-a-quote) today. We serve the entire KY-OH-WV Tri-State area from our Flatwoods, KY headquarters.`,
  },

  "spring-landscaping-projects-add-property-value": {
    title: "Spring Landscaping Projects That Add Property Value",
    date: "2026-03-15",
    readTime: "5 min read",
    category: "Landscaping",
    metaDescription: "Discover which spring landscaping projects deliver the best ROI for Tri-State area homeowners. From retaining walls to hardscape patios.",
    content: `Spring is the ideal time to invest in landscaping projects in the KY-OH-WV Tri-State area. The weather cooperates, plants establish well, and you get to enjoy the results all summer. Here are the projects that deliver the best return on investment.

## Retaining Walls: Function Meets Curb Appeal

Retaining walls are one of the highest-ROI landscaping investments, especially on the hilly terrain common throughout eastern Kentucky, southern Ohio, and western West Virginia. A well-built retaining wall prevents erosion, creates usable yard space on sloped lots, and dramatically improves curb appeal.

Materials range from natural stone and segmental block to poured concrete. For most residential applications, segmental block walls offer the best balance of cost, durability, and appearance. Expect to invest $3,000-$8,000 for a typical residential retaining wall, with an ROI of 60-75% at resale.

## Hardscape Patios and Walkways

A paver patio or stamped concrete walkway extends your living space outdoors and consistently ranks among the top landscaping investments. In the Tri-State area, flagstone and concrete pavers are popular choices that hold up well through our freeze-thaw cycles.

Consider adding a fire pit area to maximize year-round use. A basic patio with fire pit runs $4,000-$10,000 and typically returns 50-70% of the investment at sale.

## Professional Sod Installation

Nothing transforms a property faster than fresh sod. If your lawn has bare patches, heavy weed invasion, or grading issues, spring is the perfect time for a full sod installation. In the Tri-State region, tall fescue and Kentucky bluegrass blends perform best given our climate.

Professional sod installation including grading and soil preparation typically costs $1.50-$3.00 per square foot. The curb appeal improvement is immediate and the ROI is strong at 200-300% for properties with poor existing lawns.

## Tree and Shrub Planting

Strategic tree and shrub placement provides shade that reduces cooling costs, screens unsightly views, and adds visual depth to your landscape. Mature trees can add $1,000-$10,000 to a property's appraised value depending on species, size, and placement.

Focus on native species that thrive in our region: red maple, white oak, Eastern redbud, and serviceberry are excellent choices for the Tri-State area.

## Drainage and Grading Improvements

Proper drainage protects your foundation, prevents basement flooding, and eliminates standing water that attracts mosquitoes. French drains, swales, and regrading are essential investments, especially on properties with water intrusion issues.

This is one of the few landscaping projects that directly prevents costly damage. A $2,000-$5,000 drainage improvement can prevent tens of thousands in foundation repair costs.

## Getting Started

Spring fills up fast for landscaping contractors. The best time to schedule your spring projects is late winter so materials can be ordered and crews can be scheduled.

[Get your free landscaping estimate](/get-a-quote) from Tri State Enterprise. We have been serving the KY-OH-WV Tri-State area since 1992.`,
  },

  "home-construction-first-renovation": {
    title: "Home Construction: What to Know Before Your First Renovation",
    date: "2026-03-10",
    readTime: "6 min read",
    category: "Construction",
    metaDescription: "Essential guide for first-time renovation homeowners in the KY-OH-WV area. Covers permits, timelines, budgets, and contractor selection.",
    content: `Taking on your first home renovation is exciting but can quickly become overwhelming without proper preparation. Whether you are adding a room, remodeling a kitchen, or finishing a basement, here is everything you need to know before breaking ground.

## Start with Permits

In Kentucky, Ohio, and West Virginia, most structural renovations require building permits. This includes additions, structural modifications, electrical work, plumbing changes, and HVAC installations. Cosmetic work like painting, flooring, and cabinet replacement typically does not require permits.

Contact your local building department before starting any project. Permit fees in the Tri-State area typically range from $100-$500 depending on the scope of work. Skipping permits can result in fines, difficulty selling your home, and insurance complications.

## Set a Realistic Budget (Then Add 20%)

The number one cause of renovation stress is budget overruns. Construction projects almost always encounter surprises once walls are opened and existing conditions are revealed.

The industry standard is to set aside a 15-20% contingency fund on top of your estimated project cost. If your renovation is quoted at $50,000, budget $60,000 total. If you do not use the contingency, that is money back in your pocket.

## Understand the Timeline

Renovation timelines in the Tri-State area are affected by several factors: permit processing times, material lead times, weather (especially for exterior work), and subcontractor availability.

General guidelines:
- **Kitchen remodel**: 6-12 weeks
- **Bathroom remodel**: 3-6 weeks
- **Room addition**: 3-6 months
- **Basement finishing**: 4-8 weeks
- **Roof replacement**: 1-3 days for standard homes

Add 2-4 weeks to any timeline for permits and inspections. Weather delays are common for exterior projects between November and March.

## Choose the Right Contractor

Your contractor relationship will define your renovation experience. Here is what to look for:

- **Licensing and insurance**: Verify active state licenses and general liability insurance. Ask for certificates of insurance, not just claims of coverage.
- **Local references**: Ask for 3-5 references from projects similar to yours, preferably in the same county.
- **Written estimates**: Get at least three written estimates. Be wary of any bid that is significantly lower than the others as it often indicates corners that will be cut.
- **Payment terms**: Never pay more than 10-15% upfront. Payments should be tied to completed milestones, not calendar dates.
- **Communication style**: Your contractor should be responsive, clear, and willing to answer questions. Poor communication before the project starts only gets worse during construction.

## Prepare Your Home and Family

Living through a renovation requires planning:

- **Dust containment**: Discuss dust barriers and containment plans with your contractor, especially for kitchen and bathroom renovations.
- **Temporary arrangements**: For major kitchen or bathroom remodels, plan for alternative cooking and bathing arrangements.
- **Pet safety**: Construction sites pose real dangers to pets. Plan to keep animals in a separate, secure area away from the work zone.
- **Noise and schedule**: Understand daily work hours and set expectations with neighbors if needed.

## The Tri State Enterprise Difference

At Tri State Enterprise, we have guided hundreds of Tri-State area families through their first renovations since 1992. We provide detailed written estimates, maintain open communication throughout the project, and stand behind our work.

[Get your free renovation estimate](/get-a-quote) and let us help you plan your project the right way.`,
  },

  "why-regular-lawn-maintenance-matters": {
    title: "Why Regular Lawn Maintenance Matters for Property Value",
    date: "2026-03-05",
    readTime: "4 min read",
    category: "Lawn Care",
    metaDescription: "Learn how regular lawn maintenance protects your property value, prevents costly repairs, and improves curb appeal in the KY-OH-WV Tri-State area.",
    content: `A well-maintained lawn is more than just a nice thing to look at. It is a critical component of your property's value, structural health, and curb appeal. Here is why consistent lawn care should be a priority for every Tri-State area homeowner.

## Curb Appeal Drives Property Value

Studies consistently show that quality landscaping adds 5-15% to a home's appraised value. For a $200,000 home in the Tri-State area, that translates to $10,000-$30,000 in additional value from professional lawn maintenance alone.

The first thing potential buyers see is your lawn. A patchy, weed-filled yard signals deferred maintenance throughout the entire property, while a lush, well-edged lawn communicates pride of ownership.

## Lawn Health Protects Your Foundation

Healthy turf grass is one of the best defenses against soil erosion and foundation problems. In the rolling hills of eastern Kentucky and the Ohio River valley, proper turf coverage prevents rainwater from washing away topsoil and pooling against your foundation.

Bare spots and thin turf allow water to penetrate the soil unevenly, leading to settling, cracking, and potentially expensive foundation repairs. Regular mowing, fertilization, and overseeding maintain the dense turf coverage that protects your home.

## Weed Control Saves Money Long-Term

Weeds are not just unsightly; they compete with your grass for water, nutrients, and sunlight. Left unchecked, a weed problem compounds quickly. What starts as a few dandelions in spring becomes a full yard takeover by fall.

Professional weed management through pre-emergent and targeted post-emergent applications costs a fraction of what a full lawn renovation would cost after years of neglect. An annual lawn care program typically runs $400-$800 for a standard Tri-State area yard, while a full lawn renovation (sod or seed, grading, and soil amendment) can cost $3,000-$8,000.

## Seasonal Maintenance Calendar for the Tri-State Area

### Spring (March - May)
- First mow when grass reaches 3-4 inches
- Apply pre-emergent weed control by mid-April
- Aerate compacted areas
- Begin regular mowing schedule at 3-3.5 inch height

### Summer (June - August)
- Maintain weekly mowing schedule
- Water deeply but infrequently (1 inch per week)
- Raise mowing height during heat stress periods
- Spot-treat broadleaf weeds as needed

### Fall (September - November)
- Overseed thin areas in September
- Apply fall fertilizer in October
- Continue mowing until growth stops
- Remove leaves promptly to prevent smothering

### Winter (December - February)
- Service and sharpen mower blades
- Plan spring improvements
- Avoid walking on frozen turf

## Professional vs. DIY Maintenance

While basic mowing can be handled by homeowners, professional lawn care programs deliver measurably better results because they include proper fertilization timing, targeted weed control, and expert diagnosis of turf problems.

At Tri State Enterprise, our lawn care programs are tailored to the specific grass types and soil conditions of the KY-OH-WV region. We have been maintaining properties in the Tri-State area since 1992.

[Get your free lawn care estimate](/get-a-quote) and see the difference professional maintenance makes.`,
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const dbPost = await getDbPost(slug);
  const post = dbPost || POSTS[slug];
  if (!post) return { title: "Post Not Found" };
  return {
    title: `${post.title} | Tri State Enterprise Blog`,
    description: post.metaDescription || "",
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dbPost = await getDbPost(slug);
  const hardcodedPost = POSTS[slug];

  // Merge: prefer DB post, fallback to hardcoded
  const post = dbPost
    ? {
        title: dbPost.title,
        date: dbPost.publishedAt?.toISOString().split("T")[0] ?? new Date().toISOString().split("T")[0],
        readTime: `${dbPost.readTime} min read`,
        category: dbPost.category,
        metaDescription: dbPost.metaDescription || dbPost.excerpt,
        content: dbPost.content,
      }
    : hardcodedPost;

  if (!post) notFound();

  // Simple markdown-to-HTML (handles ##, -, **, links, tables)
  const htmlContent = post.content
    .split("\n\n")
    .map((block) => {
      if (block.startsWith("## ")) return `<h2 class="mt-8 mb-3 font-display text-xl font-bold text-accent">${block.slice(3)}</h2>`;
      if (block.startsWith("### ")) return `<h3 class="mt-6 mb-2 font-display text-lg font-semibold text-accent">${block.slice(4)}</h3>`;
      if (block.startsWith("| ")) {
        const rows = block.split("\n").filter((r) => !r.startsWith("|-"));
        const headerCells = rows[0]?.split("|").filter(Boolean).map((c) => c.trim()) ?? [];
        const bodyRows = rows.slice(1);
        return `<div class="overflow-x-auto my-4"><table class="w-full text-sm"><thead><tr>${headerCells.map((c) => `<th class="border border-brand-100 bg-brand-50 px-3 py-2 text-left font-semibold">${c}</th>`).join("")}</tr></thead><tbody>${bodyRows.map((r) => `<tr>${r.split("|").filter(Boolean).map((c) => `<td class="border border-brand-100 px-3 py-2">${c.trim().replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
      }
      if (block.startsWith("- ")) {
        const items = block.split("\n").map((line) => line.replace(/^- /, "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-brand-600 underline">$1</a>'));
        return `<ul class="my-3 space-y-2 pl-5 list-disc text-muted-foreground">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
      }
      // Regular paragraph
      const formatted = block
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-brand-600 underline hover:text-brand-700">$1</a>');
      return `<p class="text-base leading-relaxed text-muted-foreground">${formatted}</p>`;
    })
    .join("\n");

  return (
    <div className="section-wrapper py-12 md:py-20">
      <div className="mx-auto max-w-3xl">
        {/* Back */}
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 mb-8">
          <ArrowLeft className="h-4 w-4" />
          All Articles
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-semibold text-brand-700">{post.category}</span>
            <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{post.readTime}</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-accent md:text-4xl leading-tight">{post.title}</h1>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700"><Wrench className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-semibold text-accent">Tri State Enterprise</p>
              <p className="text-xs text-muted-foreground">Serving the KY-OH-WV Tri-State Area Since 1992</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <article
          className="prose-tse space-y-1"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        {/* CTA */}
        <div className="mt-12 rounded-3xl bg-gradient-to-br from-brand-600 to-accent p-8 text-center text-white">
          <h2 className="font-display text-2xl font-bold">Ready to Start Your Next Project?</h2>
          <p className="mt-2 text-brand-100">Get your free estimate in 30 seconds. Licensed, bonded, and insured since 1992.</p>
          <Link href="/get-a-quote" className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold uppercase tracking-wider text-accent transition hover:bg-brand-50">
            Get a Free Estimate
          </Link>
        </div>
      </div>
    </div>
  );
}
