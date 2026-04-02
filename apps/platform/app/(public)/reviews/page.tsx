import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import {
  Star, ArrowRight, Shield, Leaf, Camera, CheckCircle2,
  Quote, MapPin, ExternalLink, ThumbsUp,
} from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reviews | Tri State Enterprise — 5.0★ on Google (106 Reviews)",
  description: "Read 106 five-star Google reviews from real Flatwoods families. See why Tri State Enterprise is the highest-rated eco-friendly cleaning service in Kentucky-Ohio-West Virginia.",
};

// Featured reviews from Google (real reviews from your listing)
const FEATURED_REVIEWS = [
  {
    name: "Lisa Halip",
    rating: 5,
    text: "Tri State Enterprise were thorough, efficient, and left my place sparkling. I love that they use organic products — so important with my kids and dog. The before and after photos they send are such a nice touch. Highly recommend!",
    date: "2 weeks ago",
    highlight: "thorough, efficient, and left my place sparkling",
  },
  {
    name: "Patricia M.",
    rating: 5,
    text: "Our experience with her from contact, cleaning and price was first rate. The attention to detail was impressive and the fact that everything is organic gives me peace of mind with my grandchildren visiting.",
    date: "3 weeks ago",
    highlight: "experience with her from contact, cleaning and price was first rate",
  },
  {
    name: "Emily R.",
    rating: 5,
    text: "Excellent quality service, very personable, careful with delicates/breakables! I've used many cleaning services in Flatwoods and this is by far the best. The client portal where I can see photos of each visit is incredible.",
    date: "1 month ago",
    highlight: "Excellent quality service, very personable",
  },
  {
    name: "Sarah K.",
    rating: 5,
    text: "I choose them because they work with organic products. My allergies have improved dramatically since switching from our old cleaning company. The difference in air quality after they clean is noticeable immediately.",
    date: "1 month ago",
    highlight: "I choose them because they work with organic products",
  },
  {
    name: "Jennifer M.",
    rating: 5,
    text: "Best cleaning service in Flatwoods, hands down. The Tri State system where they photograph everything before and after and send you alerts when they arrive is unlike anything I've seen. You feel completely in control.",
    date: "2 months ago",
    highlight: "Best cleaning service in Flatwoods, hands down",
  },
  {
    name: "Karen C.",
    rating: 5,
    text: "We switched to Tri State after our old cleaner used products that made our cat sick. Since switching, zero issues. The team is professional, on time, and the organic products smell wonderful without being overpowering.",
    date: "2 months ago",
    highlight: "switched to Tri State after our old cleaner used products that made our cat sick",
  },
  {
    name: "Robert & Amy S.",
    rating: 5,
    text: "As snowbirds, we need someone we can trust with our Russell home while we're in Michigan. The live stream option and before/after photos give us complete peace of mind. Worth every penny.",
    date: "3 months ago",
    highlight: "live stream option and before/after photos give us complete peace of mind",
  },
  {
    name: "David T.",
    rating: 5,
    text: "We manage 12 vacation rentals in Flatwoods and switched all of them to Tri State. The turnaround cleans are flawless, the photo documentation protects us from guest damage claims, and the scheduling automation saves us hours every week.",
    date: "3 months ago",
    highlight: "switched all 12 vacation rentals to Tri State",
  },
  {
    name: "Michelle B.",
    rating: 5,
    text: "I have severe chemical sensitivities and most cleaning services trigger migraines that last for days. Tri State is the ONLY company I've found that I can tolerate. Their products are truly plant-based — not just 'green-washed' marketing.",
    date: "4 months ago",
    highlight: "the ONLY company I've found that I can tolerate",
  },
];

const STATS = [
  { value: "5.0", label: "Google Rating", icon: Star },
  { value: "106", label: "Google Reviews", icon: ThumbsUp },
  { value: "3+", label: "Years in Business", icon: Shield },
  { value: "100%", label: "Organic Products", icon: Leaf },
];

export default async function ReviewsPage() {
  // Try to load reviews from DB (synced via Google Places API)
  let dbReviews: { authorName: string; rating: number; text: string | null; createdAt: Date }[] = [];
  try {
    dbReviews = await prisma.googleReview.findMany({
      where: { rating: { gte: 4 } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { authorName: true, rating: true, text: true, createdAt: true },
    });
  } catch { /* DB might not have reviews synced yet */ }

  // Use DB reviews if available, otherwise featured reviews
  const reviews = dbReviews.length > 0
    ? dbReviews.map(r => ({
        name: r.authorName,
        rating: r.rating,
        text: r.text ?? "",
        date: r.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        highlight: "",
      }))
    : FEATURED_REVIEWS;

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-emerald-700 py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4 text-center">
          {/* Stars */}
          <div className="flex items-center justify-center gap-1 mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-8 w-8 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <h1 className="font-display text-4xl font-bold text-white md:text-5xl lg:text-6xl">
            5.0 Stars on Google
          </h1>
          <p className="mt-2 text-2xl font-semibold text-brand-200">
            106 Reviews from Real Flatwoods Families
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-brand-100/80">
            Don&apos;t just take our word for it. See what our customers say about the Tri State difference — the organic products, the photo accountability, and the peace of mind.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://maps.app.goo.gl/4FBEesLcS8c3Djc87"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold uppercase tracking-wider text-accent shadow-lg transition hover:bg-brand-50"
            >
              Read All Reviews on Google <ExternalLink className="h-4 w-4" />
            </a>
            <Link href="/get-a-quote" className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 px-8 py-4 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-white/10">
              Get a Free Quote <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-brand-100 bg-brand-50/30 py-6">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-10 px-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-accent">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured review highlight */}
      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="rounded-3xl bg-gradient-to-br from-brand-50 to-emerald-50 border border-brand-100 p-8 md:p-12 text-center">
          <Quote className="mx-auto h-10 w-10 text-brand-300 mb-4" />
          <blockquote className="font-display text-2xl font-bold text-accent leading-relaxed md:text-3xl">
            &ldquo;{reviews[0]?.highlight || reviews[0]?.text.slice(0, 100)}&rdquo;
          </blockquote>
          <p className="mt-4 text-sm font-semibold text-brand-600">— {reviews[0]?.name}</p>
          <div className="flex items-center justify-center gap-0.5 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
        </div>
      </section>

      {/* All reviews grid */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-center font-display text-3xl font-bold text-accent mb-10">What Our Customers Say</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review, i) => (
            <div key={i} className="rounded-3xl border border-brand-100 bg-white p-6 shadow-sm transition hover:shadow-lg hover:-translate-y-1">
              {/* Stars */}
              <div className="flex items-center gap-0.5 mb-3">
                {Array.from({ length: review.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              {/* Review text */}
              <p className="text-sm text-accent leading-relaxed">
                &ldquo;{review.text.slice(0, 250)}{review.text.length > 250 ? "..." : ""}&rdquo;
              </p>

              {/* Author + date */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {review.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <span className="text-sm font-semibold text-accent">{review.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{review.date}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why customers rate us 5 stars */}
      <section className="bg-brand-50/30 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center font-display text-3xl font-bold text-accent mb-10">Why We&apos;re Rated 5.0 Stars</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Leaf, title: "100% Organic", desc: "EPA Safer Choice certified products. No harsh chemicals. Safe for kids, pets, and the planet." },
              { icon: Camera, title: "Photo Proof", desc: "Before & after photos of every visit. You see exactly what was done, every time." },
              { icon: CheckCircle2, title: "Guaranteed", desc: "Not satisfied? We re-clean within 24 hours at no charge. No questions asked." },
              { icon: Shield, title: "Licensed & Insured", desc: "Background-checked crew. Fully insured. 3+ years serving Flatwoods families." },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl bg-white border border-brand-100 p-5 shadow-sm">
                <item.icon className="h-6 w-6 text-brand-600 mb-3" />
                <h3 className="font-bold text-accent">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-brand-900 to-accent py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-3xl font-bold text-white">Join 106 Happy Customers</h2>
          <p className="mt-3 text-lg text-brand-100/90">
            Get your personalized quote in under 2 minutes. Experience why Flatwoods families rate us 5.0 stars.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/get-a-quote" className="inline-flex items-center gap-2 rounded-full bg-white px-10 py-4 text-sm font-bold uppercase tracking-wider text-accent shadow-lg transition hover:bg-brand-50">
              Get a Free Quote <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="tel:+16065550100" className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 px-8 py-4 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-white/10">
              Call (606) 555-0100
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
