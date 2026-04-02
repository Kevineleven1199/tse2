import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, ArrowRight, Leaf } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog | Tri State Enterprise — Eco Cleaning Tips & News",
  description: "Expert tips on organic cleaning, eco-friendly home care, and healthy living from Flatwoods's premier green cleaning service.",
};

const POSTS = [
  {
    slug: "why-organic-cleaning-safer-kids-pets",
    title: "Why Organic Cleaning is Safer for Your Kids and Pets",
    excerpt: "Traditional cleaning products contain 62+ chemicals linked to hormonal disruption. Learn why switching to organic makes your home genuinely safe.",
    date: "2026-03-20",
    readTime: "4 min read",
    category: "Health & Safety",
  },
  {
    slug: "chemicals-your-cleaning-company-wont-tell-you",
    title: "5 Things Your Cleaning Company Won't Tell You About Chemicals",
    excerpt: "From 'green-washed' labels to hidden VOCs, here's what to ask before letting anyone spray chemicals in your home.",
    date: "2026-03-15",
    readTime: "5 min read",
    category: "Industry Secrets",
  },
  {
    slug: "sarasota-eco-friendly-home-guide",
    title: "Flatwoods's Complete Guide to Eco-Friendly Home Maintenance",
    excerpt: "A seasonal checklist for keeping your Flatwoods home clean, healthy, and hurricane-ready — the organic way.",
    date: "2026-03-10",
    readTime: "6 min read",
    category: "Flatwoods Living",
  },
  {
    slug: "how-often-deep-clean-room-by-room",
    title: "How Often Should You Deep Clean? A Room-by-Room Schedule",
    excerpt: "Kitchen weekly, bathrooms biweekly, carpets quarterly? The science-backed cleaning frequency that keeps your home genuinely clean.",
    date: "2026-03-05",
    readTime: "4 min read",
    category: "Cleaning Tips",
  },
  {
    slug: "organic-vs-traditional-cleaning-real-cost",
    title: "Organic vs. Traditional Cleaning: The Real Cost Comparison",
    excerpt: "Organic cleaning costs 10-15% more upfront but saves thousands in health costs. Here's the math that changes minds.",
    date: "2026-02-28",
    readTime: "5 min read",
    category: "Value",
  },
];

export default async function BlogPage() {
  // Fetch published DB posts, merge with hardcoded fallbacks
  let dbPosts: typeof POSTS = [];
  try {
    const posts = await prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      take: 20,
      select: { slug: true, title: true, excerpt: true, publishedAt: true, readTime: true, category: true },
    });
    dbPosts = posts.map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      date: p.publishedAt?.toISOString().split("T")[0] ?? new Date().toISOString().split("T")[0],
      readTime: `${p.readTime} min read`,
      category: p.category,
    }));
  } catch { /* DB might not have BlogPost table yet — use hardcoded */ }

  // Merge: DB posts first, then hardcoded as fallback (dedup by slug)
  const seenSlugs = new Set(dbPosts.map((p) => p.slug));
  const allPosts = [...dbPosts, ...POSTS.filter((p) => !seenSlugs.has(p.slug))];
  return (
    <div className="section-wrapper py-12 md:py-20">
      {/* Header */}
      <div className="mx-auto max-w-2xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-700">
          <Leaf className="h-3.5 w-3.5" />
          Blog
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold text-accent md:text-4xl">
          Eco Cleaning Tips & Insights
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Expert advice on organic home care, healthy living, and why green cleaning matters for your family.
        </p>
      </div>

      {/* Posts Grid */}
      <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
        {allPosts.map((post, i) => (
          <article
            key={post.slug}
            className={`group rounded-3xl border border-brand-100 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-brand-200 ${
              i === 0 ? "md:col-span-2 lg:col-span-2" : ""
            }`}
          >
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-semibold text-brand-700">
                {post.category}
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {new Date(post.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span>{post.readTime}</span>
            </div>
            <h2 className={`mt-3 font-display font-bold text-accent group-hover:text-brand-700 transition ${
              i === 0 ? "text-xl md:text-2xl" : "text-lg"
            }`}>
              {post.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {post.excerpt}
            </p>
            <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-brand-600 group-hover:text-brand-700 transition">
              Read article
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </div>
          </article>
        ))}
      </div>

      {/* CTA */}
      <div className="mx-auto mt-16 max-w-xl rounded-3xl bg-gradient-to-br from-brand-600 to-accent p-8 text-center text-white shadow-lg">
        <h2 className="font-display text-2xl font-bold">Ready for a Healthier Home?</h2>
        <p className="mt-2 text-brand-100">
          Get your free quote in 30 seconds. 100% organic, pet-safe, satisfaction guaranteed.
        </p>
        <Link
          href="/get-a-quote"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold uppercase tracking-wider text-accent transition hover:bg-brand-50"
        >
          Get a Free Quote
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
