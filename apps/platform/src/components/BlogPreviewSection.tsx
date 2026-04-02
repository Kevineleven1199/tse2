import Link from "next/link";
import { ArrowRight, BookOpen, Leaf, Users } from "lucide-react";

const BLOG_HIGHLIGHTS = [
  {
    title: "Why Organic Cleaning is Safer for Your Kids and Pets",
    excerpt: "Traditional cleaning products contain 62+ chemicals linked to hormonal disruption. Learn why switching to organic makes your home genuinely safe.",
    category: "Health & Safety",
    readTime: "4 min",
    href: "/blog/why-organic-cleaning-safer-kids-pets",
  },
  {
    title: "5 Things Your Cleaning Company Won't Tell You About Chemicals",
    excerpt: "From green-washed labels to hidden VOCs, here's what to ask before letting anyone spray chemicals in your home.",
    category: "Industry Secrets",
    readTime: "5 min",
    href: "/blog/chemicals-your-cleaning-company-wont-tell-you",
  },
  {
    title: "How Often Should You Deep Clean? A Room-by-Room Schedule",
    excerpt: "Kitchen weekly, bathrooms biweekly, carpets quarterly? The science-backed cleaning frequency that keeps your home genuinely clean.",
    category: "Cleaning Tips",
    readTime: "4 min",
    href: "/blog/how-often-deep-clean-room-by-room",
  },
];

export const BlogPreviewSection = () => (
  <section className="py-16 md:py-20 bg-brand-50/30" id="blog">
    <div className="section-wrapper">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-10">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-700">
            <BookOpen className="h-3 w-3" /> Blog & Tips
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold text-accent">Eco Cleaning Insights</h2>
          <p className="mt-2 text-muted-foreground">Expert advice on organic home care and healthy living.</p>
        </div>
        <Link href="/blog" className="flex items-center gap-1 text-sm font-bold uppercase tracking-wider text-brand-600 hover:text-brand-700">
          View All Articles <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {BLOG_HIGHLIGHTS.map((post) => (
          <Link key={post.href} href={post.href} className="group rounded-3xl border border-brand-100 bg-white p-6 shadow-sm transition hover:shadow-lg hover:-translate-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600">{post.category}</span>
            <h3 className="mt-2 font-display text-lg font-bold text-accent group-hover:text-brand-700 transition">{post.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{post.excerpt}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{post.readTime} read</span>
              <span className="text-xs font-bold text-brand-600 group-hover:text-brand-700">Read more →</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Community CTA */}
      <div className="mt-12 rounded-3xl border border-brand-100 bg-white p-8 text-center shadow-sm">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Users className="h-5 w-5 text-brand-600" />
          <h3 className="font-display text-xl font-bold text-accent">Join Our Community</h3>
        </div>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Share green tips, get cleaning advice, and connect with eco-conscious neighbors in Flatwoods, Ashland, and Tri-State Area.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/community" className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow transition hover:bg-brand-700">
            <Leaf className="h-4 w-4" /> Visit Community Board
          </Link>
          <Link href="/blog" className="inline-flex items-center gap-2 rounded-full border-2 border-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-accent transition hover:bg-brand-50">
            <BookOpen className="h-4 w-4" /> Read Our Blog
          </Link>
        </div>
      </div>
    </div>
  </section>
);
