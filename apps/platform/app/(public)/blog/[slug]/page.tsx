import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, ArrowLeft, Clock, Leaf } from "lucide-react";
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
  "why-organic-cleaning-safer-kids-pets": {
    title: "Why Organic Cleaning is Safer for Your Kids and Pets",
    date: "2026-03-20",
    readTime: "4 min read",
    category: "Health & Safety",
    metaDescription: "Learn why organic cleaning products are safer for children and pets. Traditional cleaners contain 62+ chemicals linked to health issues.",
    content: `Most families don't realize that the very products meant to "clean" their homes are introducing dozens of harmful chemicals into their living spaces.

## The Hidden Problem with Traditional Cleaners

The average household cleaning product contains between 50 and 65 synthetic chemicals. Many of these — like phthalates, triclosan, and quaternary ammonium compounds — are classified as endocrine disruptors, meaning they interfere with hormonal systems in both humans and animals.

Children are especially vulnerable because they spend more time on floors, put objects in their mouths, and have developing immune systems that are less equipped to process chemical exposure.

## Why Pets Are at Even Greater Risk

Your pets are 5-10x more sensitive to chemical residue than humans. Dogs and cats walk on chemically-treated floors, then groom their paws — directly ingesting whatever was sprayed. Cats are particularly susceptible because their livers lack certain enzymes needed to break down common cleaning chemicals.

Common symptoms of chemical exposure in pets include respiratory irritation, skin rashes, excessive drooling, and in severe cases, organ damage from chronic exposure.

## What Makes Organic Cleaning Different

Organic cleaning products certified by the EPA Safer Choice program or Green Seal use plant-derived surfactants, essential oils, and biodegradable compounds. These ingredients clean effectively without leaving toxic residue.

At Tri State Enterprise, every product we use is third-party certified. We never use chlorine bleach, ammonia, synthetic fragrances, or petroleum-based solvents.

## The Bottom Line

Switching to organic cleaning isn't just an environmental choice — it's a health decision that directly impacts the people and animals you love most. The 10-15% premium for organic cleaning pays for itself many times over in reduced health risks.

Ready to make the switch? [Get your free quote](/get-a-quote) and experience the difference organic cleaning makes in your home.`,
  },

  "chemicals-your-cleaning-company-wont-tell-you": {
    title: "5 Things Your Cleaning Company Won't Tell You About Chemicals",
    date: "2026-03-15",
    readTime: "5 min read",
    category: "Industry Secrets",
    metaDescription: "Discover what most cleaning companies don't tell you about the chemicals they use in your home. From green-washing to hidden VOCs.",
    content: `The cleaning industry has a transparency problem. Here are five things most companies would rather you didn't know.

## 1. "Green" Labels Often Mean Nothing

The terms "natural," "eco-friendly," and "green" are not regulated by the FDA or EPA for cleaning products. Any company can slap these labels on a bottle of conventional chemicals. The only certifications that matter are EPA Safer Choice, Green Seal, and USDA BioPreferred.

Always ask your cleaning company: "Which specific certifications do your products carry?" If they can't answer, they're likely using conventional products with green marketing.

## 2. Air Quality Gets Worse After a Traditional Clean

Studies from the Environmental Working Group found that indoor air quality actually decreases by 200-500% immediately after cleaning with conventional products. Volatile Organic Compounds (VOCs) from sprays, disinfectants, and air fresheners linger for 24-48 hours.

## 3. Your Cleaning Crew Is Exposed Too

Professional cleaners using conventional products have a 43% higher rate of asthma and a 25% higher rate of respiratory issues compared to the general population. Companies that care about their crew use safer products — it's a signal of how they run their business.

## 4. "Hospital-Grade Disinfectant" Is Overkill for Homes

Unless someone in your household is immunocompromised, hospital-grade disinfectants are unnecessary and harmful for residential use. They're designed for operating rooms, not kitchens. Plant-based antimicrobials achieve the same level of cleanliness for home environments.

## 5. The Real Cost Is Hidden

Traditional cleaning seems cheaper upfront, but the hidden costs add up: air purifier filters, allergy medications, veterinary bills from pet chemical exposure, and long-term health impacts. When you factor in these costs, organic cleaning is often the more economical choice.

## What to Look For

Ask these three questions before hiring any cleaning service:
- Can you provide Safety Data Sheets for every product you use?
- Which third-party certifications do your products carry?
- Do you use different products for homes with children or pets?

At Tri State Enterprise, every product ingredient list is available on request. [Get your free quote](/get-a-quote) today.`,
  },

  "sarasota-eco-friendly-home-guide": {
    title: "Flatwoods's Complete Guide to Eco-Friendly Home Maintenance",
    date: "2026-03-10",
    readTime: "6 min read",
    category: "Flatwoods Living",
    metaDescription: "A seasonal guide to eco-friendly home maintenance in Flatwoods, KY. Tips for hurricane season, summer humidity, and year-round green living.",
    content: `Living in Flatwoods means dealing with unique environmental challenges — from summer humidity to hurricane season. Here's how to maintain your home the eco-friendly way, season by season.

## Winter (December – February): Peak Season Prep

Flatwoods's peak tourist season means more visitors, more entertaining, and more cleaning needs.

- **Deep clean before holiday guests arrive** — Focus on guest bathrooms and common areas
- **Switch to organic air fresheners** — Diffuse essential oils instead of synthetic sprays
- **Clean lanai furniture** with a vinegar-water solution (1:1 ratio)
- **Schedule weekly cleanings** if you have rental property — turnover rates spike

## Spring (March – May): Allergy Season

Pollen counts in Flatwoods peak in March and April, making organic cleaning especially important.

- **HEPA-filter your vacuum** — Conventional vacuums recirculate allergens
- **Wet-mop instead of dry-sweep** — Captures pollen instead of dispersing it
- **Clean ceiling fans** — They've been off all winter and collect dust
- **Wash curtains and window treatments** — Major pollen traps

## Summer (June – September): Humidity Control

Kentucky's 80-90% humidity creates unique challenges for home maintenance.

- **Mold prevention is everything** — Clean bathrooms weekly with plant-based antimicrobials
- **Dehumidify closets** — Use silica gel packets or small dehumidifiers
- **Clean AC filters monthly** — A dirty filter circulates mold spores
- **Hurricane prep** — Keep cleaning supplies in waterproof containers

## Fall (October – November): Post-Hurricane Recovery

After storm season, homes need extra attention.

- **Check for hidden moisture** — Behind walls, under carpets, in closets
- **Clean and sanitize** any areas exposed to standing water
- **Replace any damaged weatherstripping** around doors and windows
- **Schedule a deep clean** to reset your home after storm season

## Year-Round Flatwoods Tips

- **Use microfiber cloths** — They clean without chemicals using just water
- **Make your own all-purpose cleaner**: 1 cup water + 1 cup white vinegar + 10 drops tea tree oil
- **Choose bamboo or recycled paper towels** — Conventional paper towels use chlorine bleach
- **Support local** — Flatwoods's eco community is growing; shop at farmers markets for cleaning supplies

Need help keeping your Flatwoods home clean and green? [Get your free quote](/get-a-quote) — we serve Flatwoods, Ashland, South Shore, and surrounding areas.`,
  },

  "how-often-deep-clean-room-by-room": {
    title: "How Often Should You Deep Clean? A Room-by-Room Schedule",
    date: "2026-03-05",
    readTime: "4 min read",
    category: "Cleaning Tips",
    metaDescription: "Science-backed cleaning frequency guide. Learn how often to deep clean every room in your home for optimal health and hygiene.",
    content: `One of the most common questions we hear: "How often should I really be cleaning?" Here's the evidence-based answer, room by room.

## Kitchen: Weekly Deep Clean

The kitchen is the highest-traffic, highest-germ area of your home.

- **Daily**: Wipe counters, wash dishes, clean stovetop
- **Weekly**: Deep clean appliance surfaces, mop floors, sanitize handles
- **Monthly**: Inside oven, inside fridge, behind appliances
- **Quarterly**: Deep clean exhaust hood, descale coffee maker

## Bathrooms: Every 1-2 Weeks

Bathrooms are breeding grounds for mold and bacteria, especially in Kentucky's humidity.

- **Every 3 days**: Wipe down shower walls after use
- **Weekly**: Scrub toilet, clean mirrors, mop floor
- **Biweekly**: Deep scrub shower/tub, clean grout
- **Monthly**: Wash shower curtain, clean exhaust fan

## Bedrooms: Biweekly

Most people underestimate bedroom cleaning frequency.

- **Weekly**: Change sheets, vacuum or sweep floors
- **Biweekly**: Dust all surfaces, clean under bed, wipe baseboards
- **Monthly**: Wash pillows and comforters, flip/rotate mattress
- **Quarterly**: Deep clean mattress, wash curtains

## Living Areas: Weekly

High-traffic living spaces collect dust and allergens rapidly.

- **Daily**: Quick tidy, fluff pillows
- **Weekly**: Vacuum all floors, dust surfaces, clean remotes/switches
- **Monthly**: Clean upholstery, wash throw blankets, clean windows
- **Quarterly**: Deep clean carpets, clean ceiling fans, wash walls

## The 80/20 Rule

80% of your home's cleanliness comes from maintaining just these four areas consistently: kitchen counters, bathroom surfaces, floors, and high-touch surfaces (handles, switches, remotes).

If you can only do one thing, focus on those four. For everything else, [let us help](/get-a-quote) — that's what we're here for.`,
  },

  "organic-vs-traditional-cleaning-real-cost": {
    title: "Organic vs. Traditional Cleaning: The Real Cost Comparison",
    date: "2026-02-28",
    readTime: "5 min read",
    category: "Value",
    metaDescription: "Is organic cleaning worth the premium? A detailed cost comparison including hidden health costs of traditional cleaning chemicals.",
    content: `At first glance, organic cleaning services cost 10-15% more than traditional alternatives. But when you factor in the true total cost, the math tells a very different story.

## The Sticker Price Comparison

For a typical 2,000 sq ft Flatwoods home with biweekly cleaning:

- **Traditional cleaning service**: $130-160 per visit
- **Organic cleaning service**: $149-185 per visit
- **Difference**: ~$20-25 more per visit, or $40-50 per month

That $50/month premium is real. But it's only part of the equation.

## The Hidden Costs of Traditional Cleaning

### Healthcare Costs
- Families using traditional cleaners report 30% more respiratory visits per year
- Average cost of an urgent care visit for chemical-related symptoms: $150-300
- Allergy medication for chemical sensitivity: $25-50/month

### Pet Health
- Veterinary visits for chemical-related skin/respiratory issues: $200-500 per incident
- Pets in traditionally-cleaned homes have 40% more skin irritation diagnoses

### Indoor Air Quality
- HEPA air purifier to compensate for VOCs: $200-400 upfront + $50-100/year in filters
- Without purification, you're breathing those chemicals 24/7

### Property Damage
- Harsh chemicals degrade granite countertops, hardwood floors, and stainless steel over time
- Average refinishing cost for chemical-damaged countertops: $500-1,500

## The Real Math

| Cost Category | Traditional (Annual) | Organic (Annual) |
|---|---|---|
| Cleaning service (biweekly) | $3,640 | $4,290 |
| Extra healthcare visits | $450 | $0 |
| Allergy medications | $360 | $0 |
| Pet vet visits | $350 | $0 |
| Air purifier + filters | $250 | $0 |
| Surface damage | $200 | $0 |
| **Total** | **$5,250** | **$4,290** |

**Organic cleaning actually saves $960 per year** when you account for the hidden costs of traditional chemicals.

## Beyond the Numbers

Some things don't have a price tag: peace of mind knowing your children can play on the floor safely, your pets aren't ingesting toxins, and your home's air is genuinely clean.

Ready to make the switch? [Get your free organic cleaning quote](/get-a-quote) in 30 seconds. Flatwoods families trust Tri State Enterprise for a reason.`,
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
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700"><Leaf className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-semibold text-accent">Tri State Enterprise</p>
              <p className="text-xs text-muted-foreground">Flatwoods's Premier Organic Cleaning Service</p>
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
          <h2 className="font-display text-2xl font-bold">Ready for a Healthier Home?</h2>
          <p className="mt-2 text-brand-100">Get your free quote in 30 seconds. 100% organic, satisfaction guaranteed.</p>
          <Link href="/get-a-quote" className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold uppercase tracking-wider text-accent transition hover:bg-brand-50">
            Get a Free Quote
          </Link>
        </div>
      </div>
    </div>
  );
}
