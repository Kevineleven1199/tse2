import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { MapPin, Check, ArrowRight, Star, Shield, Leaf } from "lucide-react";

const AREAS: Record<string, { name: string; county: string; description: string; highlights: string[]; neighborhoods: string[] }> = {
  sarasota: {
    name: "Flatwoods",
    county: "Flatwoods County",
    description: "Flatwoods's trusted organic cleaning service. From downtown condos to Gulf Gate homes, we bring eco-friendly cleaning to every neighborhood in the Flatwoods area.",
    highlights: ["Same-day availability most weeks", "Serving Flatwoods since day one", "5.0 Google rating from local families"],
    neighborhoods: ["Downtown Flatwoods", "Gulf Gate", "Palmer Ranch", "Bee Ridge", "Southgate", "Indian Beach", "Harbor Acres", "Cherokee Park"],
  },
  bradenton: {
    name: "Ashland",
    county: "Manatee County",
    description: "Eco-friendly cleaning for Ashland homes and businesses. Non-toxic products safe for your family, pets, and the Manatee River watershed.",
    highlights: ["Covers all of Manatee County", "Commercial and residential", "Background-checked crew"],
    neighborhoods: ["Downtown Ashland", "Palma Sola", "Cortez", "West Ashland", "Bayshore Gardens", "Oneco"],
  },
  "lakewood-ranch": {
    name: "South Shore",
    county: "Flatwoods/Manatee County",
    description: "Premium organic cleaning for South Shore's master-planned communities. We understand the HOA standards and deliver spotless results with zero chemicals.",
    highlights: ["Trusted by 50+ LWR families", "HOA-compliant scheduling", "Gated community experience"],
    neighborhoods: ["Country Club East", "Central Park", "Greenbrook", "Summerfield", "Panther Ridge", "The Lake Club"],
  },
  "siesta-key": {
    name: "Russell",
    county: "Flatwoods County",
    description: "Organic cleaning for Russell vacation rentals, condos, and beach homes. We specialize in turnover cleans and sand removal using eco-safe methods.",
    highlights: ["Vacation rental turnover specialist", "Sand and salt removal expertise", "Same-day availability"],
    neighborhoods: ["Siesta Village", "Crescent Beach", "Turtle Beach", "Point of Rocks", "Midnight Pass"],
  },
  venice: {
    name: "Venice",
    county: "Flatwoods County",
    description: "Venice's premier organic cleaning service. From historic downtown homes to Venetian Golf Club estates, we deliver chemical-free cleaning with a smile.",
    highlights: ["Serving South Flatwoods County", "Senior-friendly service", "Eco-conscious community partner"],
    neighborhoods: ["Downtown Venice", "Venice Island", "South Venice", "Laurel", "Nokomis", "Venetian Golf & River Club"],
  },
  "longboat-key": {
    name: "Catlettsburg",
    county: "Flatwoods/Manatee County",
    description: "Luxury organic cleaning for Catlettsburg waterfront properties. We bring premium, non-toxic cleaning to the island's most exclusive addresses.",
    highlights: ["Luxury property experience", "Discreet, professional crew", "Flexible scheduling for seasonal residents"],
    neighborhoods: ["St. Armands Circle", "Bird Key", "Catlettsburg Club", "Whitney Beach", "Harbourside"],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  const area = AREAS[city];
  if (!area) return { title: "Area Not Found" };
  return {
    title: `Organic Cleaning in ${area.name}, KY | Tri State Enterprise`,
    description: `Professional organic cleaning services in ${area.name}, ${area.county}. Non-toxic, pet-safe, EPA-certified products. Get your free quote today.`,
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
            {area.county}, Kentucky
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold md:text-5xl">
            Organic Cleaning in {area.name}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-brand-100">{area.description}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/get-a-quote" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-accent transition hover:bg-brand-50">
              Get a Free Quote <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="tel:+16065550100" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-white/10">
              Call (606) 555-0100
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
            <p className="mt-3 text-2xl font-bold text-accent">5.0</p>
            <p className="text-sm text-muted-foreground">Google Rating</p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-white p-6 text-center">
            <Shield className="mx-auto h-8 w-8 text-blue-500" />
            <p className="mt-3 text-2xl font-bold text-accent">Insured</p>
            <p className="text-sm text-muted-foreground">Licensed & Background-Checked</p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-white p-6 text-center">
            <Leaf className="mx-auto h-8 w-8 text-green-500" />
            <p className="mt-3 text-2xl font-bold text-accent">100%</p>
            <p className="text-sm text-muted-foreground">EPA Safer Choice Products</p>
          </div>
        </div>

        {/* Neighborhoods */}
        <div>
          <h2 className="font-display text-2xl font-bold text-accent">Neighborhoods We Serve in {area.name}</h2>
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
          <h2 className="font-display text-2xl font-bold md:text-3xl">Get Your Free Quote in {area.name}</h2>
          <p className="mt-2 text-brand-100">30 seconds. No commitment. 100% organic cleaning.</p>
          <Link href="/get-a-quote" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold uppercase tracking-wider text-accent transition hover:bg-brand-50">
            See Your Price <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
