import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { MapPin, Check, ArrowRight, Star, Shield, Wrench } from "lucide-react";

const AREAS: Record<string, { name: string; county: string; description: string; highlights: string[]; neighborhoods: string[] }> = {
  flatwoods: {
    name: "Flatwoods",
    county: "Greenup County",
    description: "Tri State Enterprise's home base. Construction, HVAC, lawn care, landscaping, site work, and paving for residential and commercial properties throughout Flatwoods and Greenup County.",
    highlights: ["Our home base since 1992", "Same-week scheduling available", "5.0 Google rating from local customers"],
    neighborhoods: ["Downtown Flatwoods", "Raceland", "Wurtland", "Bellefonte", "Greenup", "South Shore"],
  },
  ashland: {
    name: "Ashland",
    county: "Boyd County",
    description: "Full-service construction, HVAC, lawn care, landscaping, site work, and paving for Ashland homes and businesses. Serving Boyd County with 30+ years of experience.",
    highlights: ["Covers all of Boyd County", "Commercial and residential", "Licensed & insured"],
    neighborhoods: ["Downtown Ashland", "Westwood", "Cannonsburg", "Summit", "Catlettsburg", "Kenova"],
  },
  russell: {
    name: "Russell",
    county: "Greenup County",
    description: "Reliable contractor services for Russell and surrounding communities. From home renovations to HVAC installations and lawn maintenance, one call does it all.",
    highlights: ["Trusted by Russell families", "Quick response times", "Quality workmanship guaranteed"],
    neighborhoods: ["Downtown Russell", "Bellefonte", "Flatwoods", "Raceland", "Wurtland"],
  },
  huntington: {
    name: "Huntington",
    county: "Cabell County, WV",
    description: "Serving Huntington, West Virginia with construction, HVAC, landscaping, and paving. Our Tri-State coverage means expert service right across the river.",
    highlights: ["Tri-State area coverage", "WV licensed & insured", "30+ years experience"],
    neighborhoods: ["Downtown Huntington", "Barboursville", "Milton", "Ceredo", "Kenova", "Pea Ridge"],
  },
  ironton: {
    name: "Ironton",
    county: "Lawrence County, OH",
    description: "Serving Ironton and Lawrence County, Ohio with construction, HVAC, lawn care, and paving services. Full Tri-State coverage from our Flatwoods base.",
    highlights: ["Ohio licensed & insured", "Same-week availability", "Residential & commercial"],
    neighborhoods: ["Downtown Ironton", "South Point", "Burlington", "Chesapeake", "Coal Grove", "Pedro"],
  },
  grayson: {
    name: "Grayson",
    county: "Carter County",
    description: "Construction, HVAC, and landscaping services for Grayson and Carter County. Local expertise with the full backing of Tri State Enterprise's 30+ year reputation.",
    highlights: ["Carter County coverage", "Competitive pricing", "Quality guaranteed"],
    neighborhoods: ["Downtown Grayson", "Olive Hill", "Carter City", "Hitchins", "Denton"],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  const area = AREAS[city];
  if (!area) return { title: "Area Not Found" };
  return {
    title: `Construction, HVAC & Landscaping in ${area.name}, KY | Tri State Enterprise`,
    description: `Professional construction, HVAC, lawn care, landscaping, site work, and paving in ${area.name}, ${area.county}. Licensed & insured since 1992. Get your free estimate today.`,
  };
}

export default async function AreaPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const area = AREAS[city];
  if (!area) notFound();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-accent via-brand-700 to-brand-600 text-white">
        <div className="section-wrapper py-16 md:py-24">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60">
            <MapPin className="h-3.5 w-3.5" />
            {area.county}
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold md:text-5xl">
            Tri State Enterprise in {area.name}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-brand-100">{area.description}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/get-a-quote" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-accent transition hover:bg-brand-50">
              Get a Free Estimate <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="tel:+16068362534" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-white/10">
              Call (606) 836-2534
            </a>
          </div>
        </div>
      </div>

      <div className="section-wrapper py-12 space-y-12">
        {/* Highlights */}
        <div className="grid gap-4 md:grid-cols-3">
          {area.highlights.map((h) => (
            <div key={h} className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-white p-5">
              <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
              <p className="text-sm font-semibold text-accent">{h}</p>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-brand-100 bg-white p-6 text-center">
            <Star className="mx-auto h-8 w-8 text-amber-400" />
            <p className="mt-3 text-2xl font-bold text-accent">30+</p>
            <p className="text-sm text-muted-foreground">Years in Business</p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-white p-6 text-center">
            <Shield className="mx-auto h-8 w-8 text-blue-500" />
            <p className="mt-3 text-2xl font-bold text-accent">Licensed</p>
            <p className="text-sm text-muted-foreground">Bonded & Insured</p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-white p-6 text-center">
            <Wrench className="mx-auto h-8 w-8 text-green-500" />
            <p className="mt-3 text-2xl font-bold text-accent">6</p>
            <p className="text-sm text-muted-foreground">Service Lines</p>
          </div>
        </div>

        {/* Neighborhoods */}
        <div>
          <h2 className="font-display text-2xl font-bold text-accent">Areas We Serve Near {area.name}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {area.neighborhoods.map((n) => (
              <span key={n} className="rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-sm font-medium text-accent">
                {n}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-accent p-8 text-center text-white md:p-12">
          <h2 className="font-display text-2xl font-bold md:text-3xl">Get Your Free Estimate in {area.name}</h2>
          <p className="mt-2 text-brand-100">No obligation. Licensed &amp; insured. One call does it all.</p>
          <Link href="/get-a-quote" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold uppercase tracking-wider text-accent transition hover:bg-brand-50">
            Get a Free Estimate <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
