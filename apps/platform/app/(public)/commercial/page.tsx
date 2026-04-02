import Link from "next/link";
import Image from "next/image";
import {
  Building2, Shield, Leaf, CheckCircle2, Star, ArrowRight, Phone,
  Clock, Users, FileText, Camera, Repeat, Heart, UtensilsCrossed,
  Home, Activity, ShieldCheck, Sparkles,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Commercial Cleaning | Tri State Enterprise — Flatwoods, Ashland, Tri-State Area",
  description: "Eco-friendly commercial cleaning for condos, assisted living, restaurants, offices, medical facilities, and HOAs in Kentucky-Ohio-West Virginia. Licensed, insured, organic products only.",
};

const INDUSTRIES = [
  {
    title: "Condo Associations & HOAs",
    slug: "condos",
    icon: Building2,
    color: "bg-blue-500",
    description: "Common areas, lobbies, fitness centers, and pool houses maintained with plant-based products that keep residents safe and HOA boards happy.",
    benefits: ["Lobby & hallway maintenance", "Fitness center sanitization", "Pool house & restroom cleaning", "Elevator & stairwell detailing", "Seasonal deep cleans for snowbird season", "Monthly reporting for board meetings"],
    ideal: "Perfect for associations with 50+ units looking for a reliable, eco-conscious partner.",
  },
  {
    title: "Assisted Living & Senior Care",
    slug: "assisted-living",
    icon: Heart,
    color: "bg-pink-500",
    description: "Chemical-free cleaning is critical for sensitive residents. Our EPA Safer Choice products protect the most vulnerable — no harsh fumes, no respiratory irritants.",
    benefits: ["Chemical-free products safe for seniors", "HEPA filtration for allergen removal", "Common area + resident room cleaning", "Dining hall & kitchen sanitization", "Compliance-friendly documentation", "Flexible scheduling around care routines"],
    ideal: "Trusted by facilities that prioritize resident health above all else.",
  },
  {
    title: "Restaurants & QSR",
    slug: "restaurants",
    icon: UtensilsCrossed,
    color: "bg-amber-500",
    description: "Kitchen deep cleans, front-of-house maintenance, and health-code compliant sanitization using food-safe organic products.",
    benefits: ["Kitchen deep clean & degreasing", "Dining area floor & table sanitization", "Restroom maintenance", "Hood vent & exhaust cleaning", "Health inspection preparation", "Night / off-hour scheduling"],
    ideal: "Ideal for restaurants, fast casual, and QSR chains wanting chemical-free food-safe cleaning.",
  },
  {
    title: "Medical & Dental Offices",
    slug: "medical",
    icon: Activity,
    color: "bg-red-500",
    description: "HIPAA-aware cleaning protocols with eco-friendly disinfectants that meet clinical standards without toxic residue.",
    benefits: ["Waiting room & exam room sanitization", "Electrostatic disinfecting (green products)", "HEPA vacuuming for clinical environments", "Biohazard-aware protocols", "Overnight cleaning available", "Monthly deep clean schedules"],
    ideal: "For practices that want clinical-grade cleanliness without harsh chemicals.",
  },
  {
    title: "Office Buildings & Coworking",
    slug: "offices",
    icon: Building2,
    color: "bg-indigo-500",
    description: "Keep your workspace healthy and productive. Plant-based products mean no chemical headaches, no VOC buildup, and happier employees.",
    benefits: ["Open floor & private office cleaning", "Kitchen & breakroom maintenance", "Restroom deep sanitization", "Window & glass cleaning", "Carpet & upholstery care", "Flexible day/night scheduling"],
    ideal: "Great for offices wanting to promote employee wellness through healthier indoor air.",
  },
  {
    title: "Vacation Rentals & Property Management",
    slug: "vacation-rentals",
    icon: Home,
    color: "bg-teal-500",
    description: "Turnover cleans between guests, deep cleans for seasonal properties, and snowbird prep — all with organic products that protect your investment.",
    benefits: ["Same-day turnover cleaning", "Deep clean for seasonal openings", "Linen service coordination", "Before/after photo documentation", "Property manager portal access", "Recurring weekly/biweekly schedules"],
    ideal: "Essential for Russell, Catlettsburg, and Anna Maria Island rental owners.",
  },
  {
    title: "Gyms & Fitness Centers",
    slug: "gyms",
    icon: Activity,
    color: "bg-orange-500",
    description: "High-touch equipment, locker rooms, and common areas sanitized with eco-friendly products that eliminate germs without toxic residue.",
    benefits: ["Equipment wipe-down protocols", "Locker room & shower sanitization", "Floor cleaning (rubber, tile, concrete)", "Mirror & glass cleaning", "Air quality improvement", "Open/close cleaning shifts"],
    ideal: "For fitness facilities that care about member health beyond the workout.",
  },
  {
    title: "Churches & Community Centers",
    slug: "churches",
    icon: Users,
    color: "bg-purple-500",
    description: "Fellowship halls, sanctuaries, classrooms, and kitchens maintained with products safe for all ages — from nursery to senior ministry.",
    benefits: ["Sanctuary & fellowship hall cleaning", "Nursery & children's area sanitization", "Kitchen & food prep cleaning", "Restroom maintenance", "Event setup/teardown cleaning", "Flexible scheduling around services"],
    ideal: "Safe for congregation members of all ages, including children and elderly.",
  },
];

const TRUST_STATS = [
  { value: "4.9★", label: "Google Rating" },
  { value: "100%", label: "Organic Products" },
  { value: "500+", label: "Jobs Completed" },
  { value: "$0", label: "Hidden Fees" },
];

export default function CommercialPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-emerald-700 py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-200">
            <Building2 className="h-3.5 w-3.5" /> Commercial Solutions
          </span>
          <h1 className="mt-6 font-display text-4xl font-bold text-white md:text-5xl lg:text-6xl">
            Commercial-Grade Clean.<br />Zero Toxic Chemicals.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-brand-100/90">
            From condo lobbies to restaurant kitchens, assisted living facilities to office buildings — we deliver
            professional cleaning with 100% plant-based, EPA Safer Choice certified products.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/get-a-quote?service=commercial" className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold uppercase tracking-wider text-accent shadow-lg transition hover:bg-brand-50 active:scale-[0.97]">
              Get a Commercial Quote <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="tel:+16065550100" className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 px-8 py-4 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-white/10">
              <Phone className="h-4 w-4" /> (606) 555-0100
            </a>
          </div>
        </div>
      </section>

      {/* Trust Stats */}
      <section className="border-b border-brand-100 bg-brand-50/30 py-6">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-10 px-4">
          {TRUST_STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-accent">{stat.value}</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Organic for Commercial */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl font-bold text-accent">Why Commercial Properties Choose Organic</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Traditional commercial cleaners use industrial chemicals that create liability, harm indoor air quality, and put vulnerable populations at risk.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Shield, title: "Reduced Liability", desc: "No chemical exposure claims from residents, patients, or employees" },
            { icon: Leaf, title: "EPA Safer Choice", desc: "Every product certified safe for humans, pets, and the environment" },
            { icon: Camera, title: "Photo Documentation", desc: "Before & after photos for every visit — full transparency and accountability" },
            { icon: FileText, title: "Monthly Reporting", desc: "Service logs, photo archives, and compliance documentation for your board" },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-brand-100 bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-semibold text-accent">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Industries */}
      <section className="bg-brand-50/20 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-accent">Industries We Serve</h2>
            <p className="mt-3 text-muted-foreground">Tailored cleaning solutions for every commercial environment.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {INDUSTRIES.map((industry) => (
              <div key={industry.slug} id={industry.slug} className="scroll-mt-24 rounded-3xl border border-brand-100 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${industry.color} text-white`}>
                    <industry.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-accent">{industry.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{industry.description}</p>
                <div className="grid gap-1.5 sm:grid-cols-2 mb-4">
                  {industry.benefits.map((b) => (
                    <div key={b} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                      <span className="text-accent">{b}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-brand-600 font-semibold italic">{industry.ideal}</p>
                <Link href="/get-a-quote?service=commercial" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-brand-700">
                  Get Quote <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Tri State System */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-700">
            <ShieldCheck className="h-3.5 w-3.5" /> The Tri State System
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold text-accent">Total Transparency. Total Accountability.</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Every commercial client gets access to our proprietary accountability system — the most transparent cleaning service in Kentucky-Ohio-West Virginia.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Camera, title: "Before & After Photos", desc: "Every visit documented with timestamped photos uploaded to your private Google Drive folder." },
            { icon: CheckCircle2, title: "Digital Checklists", desc: "Room-by-room task completion tracked in real-time. Know exactly what was done." },
            { icon: Clock, title: "Clock-In / Clock-Out", desc: "GPS-verified arrival and departure times. Real-time alerts to property managers." },
            { icon: FileText, title: "Your Own Portal", desc: "Access all past jobs, photos, invoices, and crew details from your client dashboard." },
            { icon: Star, title: "Live Stream Option", desc: "YouTube Live link available for vacant property owners and snowbirds to watch their clean remotely." },
            { icon: Repeat, title: "Recurring Schedules", desc: "Set it and forget it. Weekly, biweekly, or monthly — our system auto-schedules and auto-invoices." },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-brand-100 bg-brand-50/20 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-semibold text-accent">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-brand-900 to-accent py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-3xl font-bold text-white">Ready to upgrade your facility&apos;s cleaning?</h2>
          <p className="mt-3 text-lg text-brand-100/90">
            Get a custom commercial quote in 24 hours. No obligation, no pressure.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/get-a-quote?service=commercial" className="inline-flex items-center gap-2 rounded-full bg-white px-10 py-4 text-sm font-bold uppercase tracking-wider text-accent shadow-lg transition hover:bg-brand-50 active:scale-[0.97]">
              Get a Commercial Quote <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="tel:+16065550100" className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 px-8 py-4 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-white/10">
              <Phone className="h-4 w-4" /> Call Us Direct
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
