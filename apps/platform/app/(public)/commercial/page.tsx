import Link from "next/link";
import Image from "next/image";
import {
  Building2, Shield, CheckCircle2, Star, ArrowRight, Phone,
  Clock, Users, FileText, Camera, Repeat, Warehouse, Factory,
  Home, HardHat, Sparkles, Hammer, ThermometerSun,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Commercial Services | Tri State Enterprise — KY, OH, WV Tri-State Area",
  description: "Commercial construction, HVAC, landscaping, site work, and paving for businesses, property managers, and municipalities across Kentucky, Ohio, and West Virginia.",
};

const INDUSTRIES = [
  {
    title: "Property Management Companies",
    slug: "property-management",
    icon: Building2,
    color: "bg-blue-500",
    description: "Comprehensive property maintenance including construction repairs, HVAC servicing, lawn care, and paving for apartment complexes, condos, and managed properties.",
    benefits: ["Building repair & maintenance", "HVAC system servicing for all units", "Grounds maintenance & landscaping", "Parking lot paving & repair", "Snow removal & seasonal prep", "Monthly maintenance reports"],
    ideal: "Perfect for management companies overseeing 50+ units looking for a single reliable vendor.",
  },
  {
    title: "Retail & Office Buildings",
    slug: "office-retail",
    icon: Warehouse,
    color: "bg-emerald-500",
    description: "Keep your commercial space professional and well-maintained. From HVAC comfort to curb appeal, we handle every aspect of your building's exterior and systems.",
    benefits: ["HVAC installation & maintenance", "Parking lot & sidewalk paving", "Landscape maintenance", "Building repair & renovation", "Emergency repairs", "Scheduled maintenance plans"],
    ideal: "Ideal for office parks, shopping centers, and retail properties.",
  },
  {
    title: "Industrial & Manufacturing",
    slug: "industrial",
    icon: Factory,
    color: "bg-orange-500",
    description: "Heavy-duty services for warehouses, factories, and distribution centers. Site work, paving, HVAC for large spaces, and facility construction.",
    benefits: ["Warehouse & facility construction", "Industrial HVAC systems", "Heavy-duty paving & concrete", "Site grading & drainage", "Loading dock repair", "Facility expansion & build-outs"],
    ideal: "Built for industrial facilities needing a contractor who understands heavy-duty requirements.",
  },
  {
    title: "Municipalities & Government",
    slug: "municipal",
    icon: Shield,
    color: "bg-purple-500",
    description: "Public sector projects including road work, facility maintenance, park landscaping, and government building construction and renovation.",
    benefits: ["Road & infrastructure paving", "Public building construction", "Park & recreation landscaping", "Municipal HVAC systems", "Storm drainage solutions", "ADA compliance upgrades"],
    ideal: "Serving local governments with licensed, bonded, and insured contractor services.",
  },
  {
    title: "New Construction Development",
    slug: "new-development",
    icon: HardHat,
    color: "bg-amber-500",
    description: "Full-service support for developers from site prep to final landscaping. We partner with builders to deliver complete residential and commercial developments.",
    benefits: ["Site clearing & grading", "Foundation & structural work", "HVAC system installation", "Driveway & road paving", "Landscape installation", "Final site finishing"],
    ideal: "For developers who need a reliable partner from dirt to done.",
  },
  {
    title: "Churches & Community Centers",
    slug: "churches",
    icon: Home,
    color: "bg-teal-500",
    description: "Trusted maintenance and construction services for community organizations. From HVAC comfort to parking lot maintenance, we take care of your facility.",
    benefits: ["Building renovation & repair", "HVAC comfort solutions", "Parking lot maintenance", "Grounds & landscaping", "Accessibility improvements", "Flexible scheduling around events"],
    ideal: "For community organizations seeking a trustworthy, local contractor.",
  },
];

const CommercialPage = () => (
  <main className="bg-surface">
    {/* Hero */}
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-emerald-900 py-16 md:py-24">
      <div className="section-wrapper relative text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-5 py-2 text-xs font-bold uppercase tracking-[0.25em] text-brand-200">
          <Building2 className="h-4 w-4" /> Commercial Services
        </span>
        <h1 className="mt-5 font-display text-4xl font-bold text-white md:text-5xl">
          Commercial &amp; Municipal Services
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-brand-100/80">
          Full-service commercial construction, HVAC, landscaping, site work, and paving for businesses, property managers, developers, and municipalities across the Tri-State area.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/get-a-quote" className="inline-flex items-center gap-2 rounded-full bg-white px-10 py-4 text-sm font-bold uppercase tracking-wider text-accent shadow-xl transition hover:bg-brand-50">
            Request a Commercial Estimate <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="tel:+16068362534" className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">
            <Phone className="h-4 w-4" /> (606) 836-2534
          </Link>
        </div>
      </div>
    </section>

    {/* Industries */}
    <section className="bg-white py-16">
      <div className="section-wrapper">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl font-bold text-accent">Industries We Serve</h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Decades of experience serving commercial, industrial, municipal, and community clients.
          </p>
        </div>

        <div className="space-y-8">
          {INDUSTRIES.map((industry, i) => (
            <div key={industry.slug} id={industry.slug} className="rounded-3xl border border-brand-100 overflow-hidden bg-white shadow-sm hover:shadow-md transition">
              <div className="flex flex-col md:flex-row">
                <div className={`${industry.color} flex items-center justify-center p-6 md:w-20`}>
                  <industry.icon className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1 p-6">
                  <h3 className="font-display text-xl font-bold text-accent">{industry.title}</h3>
                  <p className="mt-2 text-muted-foreground">{industry.description}</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {industry.benefits.map((b) => (
                      <span key={b} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-brand-500 mt-0.5 shrink-0" />
                        <span className="text-foreground/80">{b}</span>
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 text-sm font-medium text-brand-600">{industry.ideal}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* The Tri State System for commercial */}
    <section className="bg-brand-50 py-16">
      <div className="section-wrapper text-center">
        <h2 className="font-display text-3xl font-bold text-accent">The Tri State System</h2>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          Every commercial client gets access to our AI-powered project management system.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Camera, title: "Photo Documentation", desc: "Before/after photos for every job, accessible in your portal." },
            { icon: Clock, title: "GPS Clock In/Out", desc: "Know exactly when our crew arrives and departs your property." },
            { icon: FileText, title: "Digital Invoicing", desc: "Itemized invoices, payment tracking, and expense reporting." },
            { icon: Repeat, title: "Recurring Scheduling", desc: "Set it and forget it. We handle the scheduling and reminders." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl bg-white p-6 shadow-sm border border-brand-100">
              <f.icon className="h-8 w-8 text-brand-600 mx-auto" />
              <h3 className="mt-3 font-bold text-accent">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="bg-accent py-16">
      <div className="section-wrapper text-center">
        <h2 className="font-display text-3xl font-bold text-white md:text-4xl">Ready for a commercial partner you can trust?</h2>
        <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
          30+ years serving the Tri-State area. Licensed, bonded, and insured. One call does it all.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/get-a-quote" className="inline-flex items-center gap-2 rounded-full bg-white px-10 py-4 text-sm font-bold uppercase tracking-wider text-accent shadow-xl transition hover:bg-brand-50">
            Get a Commercial Estimate <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="tel:+16068362534" className="inline-flex items-center gap-2 rounded-full border-2 border-white/40 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">
            <Phone className="h-4 w-4" /> (606) 836-2534
          </Link>
        </div>
      </div>
    </section>
  </main>
);

export default CommercialPage;
