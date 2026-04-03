import Link from "next/link";
import Image from "next/image";
import { Hammer, ThermometerSun, TreePine, HardHat, Wrench, Home, CheckCircle2, Shield, Clock, Star, ArrowRight, Phone } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Services | Tri State Enterprise",
  description: "Construction, HVAC, lawn care, landscaping, site work, and paving in the KY-OH-WV Tri-State area. Licensed, bonded, and insured since 1992.",
};

const SERVICES = [
  {
    title: "Construction",
    slug: "construction",
    requestType: "HOME_CLEAN",
    tagline: "From foundation to finish.",
    description: "New builds, renovations, additions, remodeling, and structural repairs for both residential and commercial properties. Our experienced crew handles every phase of construction with quality craftsmanship.",
    highlights: [
      "New home construction & custom builds",
      "Room additions & structural expansions",
      "Kitchen & bathroom renovations",
      "Commercial build-outs & tenant improvements",
      "Foundation repair & structural work",
      "Roofing, siding & exterior upgrades",
    ],
    startingAt: "Free Estimate",
    frequency: "per project",
    icon: Hammer,
    image: "/images/service-basic-clean.jpg",
  },
  {
    title: "HVAC / Heating & Air",
    slug: "hvac",
    requestType: "HOME_CLEAN",
    tagline: "Stay comfortable year-round.",
    description: "Complete heating and air conditioning services including installation, repair, maintenance, and emergency service. We work with all major brands and systems.",
    highlights: [
      "Furnace & heat pump installation",
      "Central air conditioning systems",
      "Emergency repair service",
      "Preventive maintenance plans",
      "Ductwork installation & repair",
      "Thermostat & smart home integration",
    ],
    startingAt: "Free Estimate",
    frequency: "per service",
    icon: ThermometerSun,
    image: "/images/service-deep-clean.jpg",
  },
  {
    title: "Lawn Care",
    slug: "lawn-care",
    requestType: "HOME_CLEAN",
    tagline: "A healthy lawn, maintained right.",
    description: "Professional lawn maintenance to keep your property looking its best. Weekly, bi-weekly, or one-time service available for residential and commercial properties.",
    highlights: [
      "Mowing, edging & trimming",
      "Weed control & fertilization",
      "Aeration & overseeding",
      "Leaf removal & seasonal cleanup",
      "Hedge & shrub trimming",
      "Commercial property maintenance",
    ],
    startingAt: "Free Estimate",
    frequency: "per visit",
    icon: TreePine,
    image: "/images/service-moveout-clean.jpg",
  },
  {
    title: "Landscaping",
    slug: "landscaping",
    requestType: "HOME_CLEAN",
    tagline: "Transform your outdoor space.",
    description: "Custom landscape design and installation to enhance your property's curb appeal and value. From simple plantings to complete outdoor transformations.",
    highlights: [
      "Landscape design & planning",
      "Planting trees, shrubs & flowers",
      "Mulching & bed preparation",
      "Retaining walls & hardscaping",
      "Outdoor lighting installation",
      "Irrigation system setup",
    ],
    startingAt: "Free Estimate",
    frequency: "per project",
    icon: TreePine,
    image: "/images/tse-landscaping.jpg",
  },
  {
    title: "Site Work",
    slug: "site-work",
    requestType: "HOME_CLEAN",
    tagline: "Preparing your site for success.",
    description: "Complete site preparation services including grading, excavation, clearing, and drainage. We prepare residential and commercial sites for construction.",
    highlights: [
      "Land clearing & grading",
      "Excavation & earthmoving",
      "Drainage solutions & French drains",
      "Utility trenching",
      "Fill dirt & topsoil delivery",
      "Erosion control",
    ],
    startingAt: "Free Estimate",
    frequency: "per project",
    icon: HardHat,
    image: "/images/why-choose-us.jpg",
  },
  {
    title: "Paving",
    slug: "paving",
    requestType: "HOME_CLEAN",
    tagline: "Smooth surfaces, built to last.",
    description: "Asphalt and concrete paving for driveways, parking lots, walkways, and commercial surfaces. Quality materials and expert installation.",
    highlights: [
      "Driveway paving & resurfacing",
      "Parking lot construction",
      "Concrete sidewalks & patios",
      "Pothole repair & patching",
      "Seal coating & striping",
      "Commercial paving solutions",
    ],
    startingAt: "Free Estimate",
    frequency: "per project",
    icon: Wrench,
    image: "/images/about-team.jpg",
  },
];

const TRUST_POINTS = [
  { icon: Shield, text: "Licensed, Bonded & Insured" },
  { icon: Clock, text: "30+ Years Experience" },
  { icon: Star, text: "Top-Rated Contractor" },
  { icon: CheckCircle2, text: "Free Estimates" },
];

const ServicesPage = () => (
  <main className="bg-surface">
    {/* Hero */}
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-emerald-900 py-16 md:py-24">
      <div className="section-wrapper relative">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-5 py-2 text-xs font-bold uppercase tracking-[0.25em] text-brand-200">
            Full-Service Contractor
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold text-white md:text-5xl leading-tight">
            Our Services
          </h1>
          <p className="mt-4 text-lg text-brand-100/80 max-w-2xl mx-auto">
            Construction, HVAC, lawn care, landscaping, site work, and paving. Serving the Kentucky-Ohio-West Virginia Tri-State area since 1992.
          </p>

          {/* Trust points */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {TRUST_POINTS.map(({ icon: Icon, text }) => (
              <span key={text} className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4 py-2 text-xs font-semibold text-white">
                <Icon className="h-4 w-4 text-brand-300" />
                {text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* Services list */}
    <section className="bg-white py-16">
      <div className="section-wrapper space-y-16">
        {SERVICES.map((service, i) => (
          <div key={service.slug} id={service.slug} className="scroll-mt-24">
            <div className={`flex flex-col gap-8 md:flex-row md:items-start ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}>
              {/* Image */}
              <div className="md:w-2/5">
                <div className="relative overflow-hidden rounded-3xl shadow-lg">
                  <Image src={service.image} alt={service.title} width={600} height={400} className="w-full object-cover aspect-[3/2]" />
                  <div className="absolute bottom-4 left-4 rounded-xl bg-white/95 px-4 py-2 shadow-md">
                    <p className="text-sm font-bold text-accent">{service.startingAt}</p>
                    <p className="text-[10px] text-muted-foreground">{service.frequency}</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="md:w-3/5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <service.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-bold text-accent">{service.title}</h2>
                    <p className="text-sm font-medium text-brand-600">{service.tagline}</p>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed">{service.description}</p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {service.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-brand-500 mt-0.5 shrink-0" />
                      <span className="text-foreground/80">{h}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/get-a-quote"
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-brand-700"
                >
                  Get a Free Estimate <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* CTA */}
    <section className="bg-accent py-16">
      <div className="section-wrapper text-center">
        <h2 className="font-display text-3xl font-bold text-white md:text-4xl">Ready to get started?</h2>
        <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
          Call us today for a free, no-obligation estimate. One call does it all.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/get-a-quote" className="inline-flex items-center gap-2 rounded-full bg-white px-10 py-4 text-sm font-bold uppercase tracking-wider text-accent shadow-xl transition hover:bg-brand-50">
            Get a Free Estimate <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="tel:+16068362534" className="inline-flex items-center gap-2 rounded-full border-2 border-white/40 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">
            <Phone className="h-4 w-4" /> (606) 836-2534
          </Link>
        </div>
      </div>
    </section>
  </main>
);

export default ServicesPage;
