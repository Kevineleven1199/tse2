import Link from "next/link";
import Image from "next/image";
import { Home, Sparkles, RefreshCcw, Building2, CheckCircle2, Shield, Leaf, Clock, Star, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Services | Tri State Enterprise",
  description: "Healthy home cleaning, deep refresh, move-in/move-out, commercial care, pressure washing, and eco auto detailing in Flatwoods, Ashland, and Tri-State Area.",
};

const SERVICES = [
  {
    title: "Healthy Home Cleaning",
    slug: "healthy-home",
    requestType: "HOME_CLEAN",
    tagline: "Your home, maintained the natural way.",
    description: "Weekly, bi-weekly, or monthly visits tailored to your household rhythm. We maintain shine without synthetic fragrances or harsh residues.",
    highlights: [
      "Dusting, sanitizing, and floor care with plant-based solutions",
      "Kitchen and bath detailing every visit",
      "Custom task list matched to your lifestyle",
      "HEPA-filter vacuuming to reduce allergens",
      "Safe for kids, pets, and sensitive households",
    ],
    included: ["All rooms", "Kitchen deep wipe", "Bathroom sanitize", "Floors vacuum + mop", "Dusting all surfaces", "Trash removal"],
    notIncluded: ["Inside oven", "Inside fridge", "Windows exterior", "Garage", "Laundry folding"],
    startingAt: "$129",
    frequency: "per visit",
    icon: Home,
    image: "/images/service-basic-clean.jpg",
    color: "brand",
  },
  {
    title: "Deep Refresh & Detox",
    slug: "deep-refresh",
    requestType: "HOME_CLEAN",
    tagline: "A seasonal reset for every surface.",
    description: "Reset your space with meticulous attention to baseboards, vents, appliances, and high-touch areas. Perfect for seasonal resets, special events, or when life gets ahead of you.",
    highlights: [
      "High and low dusting, grout and fixture polishing",
      "HEPA-filter vacuuming to remove trapped allergens",
      "Inside appliances and window tracks included",
      "Baseboards, vents, and ceiling fan detailing",
      "Ideal before holidays, parties, or house guests",
    ],
    startingAt: "$249",
    frequency: "one-time",
    icon: Sparkles,
    image: "/images/service-deep-clean.jpg",
    color: "amber",
  },
  {
    title: "Move-In / Move-Out Detail",
    slug: "move-clean",
    requestType: "HOME_CLEAN",
    tagline: "Leave no room overlooked before the keys change hands.",
    description: "We prepare homes and rentals with a chemical-free finish future residents will love. Landlord checklists, realtor walkthroughs, and construction dust removal all welcome.",
    highlights: [
      "Cabinetry, closets, and appliances cleaned inside and out",
      "Construction dust and debris removal",
      "Landlord and realtor checklists welcomed",
      "Garage and outdoor areas available as add-on",
      "Same-day or next-day scheduling when available",
    ],
    startingAt: "$299",
    frequency: "one-time",
    icon: RefreshCcw,
    image: "/images/service-moveout-clean.jpg",
    color: "sky",
  },
  {
    title: "Eco Commercial Care",
    slug: "commercial",
    requestType: "CUSTOM",
    tagline: "Professional spaces deserve professional clean. Without the toxins.",
    description: "Keep offices, studios, clinics, and salons feeling fresh. Flexible schedules minimize disruption while maintaining a toxin-free workspace your team and clients notice.",
    highlights: [
      "Night or off-hour visits available",
      "Electrostatic disinfecting with green products",
      "Custom scopes for lobbies, breakrooms, and shared areas",
      "Recurring contracts with priority scheduling",
      "Monthly reporting and service logs available",
    ],
    startingAt: "Custom",
    frequency: "quote",
    icon: Building2,
    image: "/images/gallery-organic-cleaning.jpg",
    color: "emerald",
  },
  {
    title: "Pressure Washing",
    slug: "pressure-wash",
    requestType: "PRESSURE_WASH",
    tagline: "Restore your exterior to like-new condition.",
    description: "Driveways, patios, pool decks, sidewalks, and exterior walls transformed with our professional eco-friendly pressure washing service. No harsh chemicals running into your yard.",
    highlights: [
      "Driveways and sidewalks",
      "Patio, lanai, and pool deck restoration",
      "Exterior wall and fence cleaning",
      "Eco-friendly detergents safe for landscaping",
      "Same-day quotes available",
    ],
    startingAt: "$149",
    frequency: "one-time",
    icon: Sparkles,
    image: "/images/gallery-pressure-washing.jpg",
    color: "cyan",
  },
  {
    title: "Eco Auto Detail",
    slug: "auto-detail",
    requestType: "AUTO_DETAIL",
    tagline: "Your car deserves the same organic treatment as your home.",
    description: "Interior vacuum, dash and console detailing, exterior hand wash, tire dressing, and window treatment using our signature plant-based products.",
    highlights: [
      "Exterior hand wash and dry",
      "Interior vacuum and wipe-down",
      "Dashboard, console, and door panel detailing",
      "Window cleaning inside and out",
      "Tire dressing and wheel cleaning",
    ],
    startingAt: "$89",
    frequency: "per vehicle",
    icon: Star,
    image: "/images/gallery-car-detailing.jpg",
    color: "violet",
  },
  {
    title: "Home Watch & Property Care",
    slug: "home-watch",
    requestType: "CUSTOM",
    tagline: "Peace of mind for snowbirds and absentee homeowners.",
    description: "Weekly or biweekly property inspections for vacant homes. We check for leaks, AC issues, pest activity, storm damage, and ensure your Kentucky home stays pristine while you're away.",
    highlights: [
      "Exterior and interior property walkthrough",
      "AC, plumbing, and appliance checks",
      "Storm prep and post-storm inspection",
      "Photo documentation sent to you",
      "Mail and package management",
    ],
    startingAt: "$49",
    frequency: "per visit",
    icon: Home,
    image: "/images/why-choose-us.jpg",
    color: "sky",
  },
  {
    title: "Airbnb & Vacation Rental Turnover",
    slug: "airbnb-turnover",
    requestType: "HOME_CLEAN",
    tagline: "5-star guest reviews start with a spotless turnover.",
    description: "Fast, thorough turnover cleans between guests. Linen changes, restocking, photo verification, and property manager dashboard access included. Same-day and next-day scheduling available.",
    highlights: [
      "Full property clean between guests",
      "Linen change and bed making",
      "Kitchen and bathroom deep sanitize",
      "Restock amenities and supplies",
      "Before/after photos for property manager",
    ],
    startingAt: "$149",
    frequency: "per turnover",
    icon: Home,
    image: "/images/service-moveout-clean.jpg",
    color: "amber",
  },
  {
    title: "Carpet & Upholstery Steam Cleaning",
    slug: "carpet-steam",
    requestType: "CUSTOM",
    tagline: "Deep extraction without the toxic chemicals.",
    description: "Hot water extraction and steam cleaning for carpets, rugs, sofas, and fabric furniture using 100% plant-based solutions. Removes allergens, pet dander, and deep-set stains safely.",
    highlights: [
      "Hot water extraction for carpets",
      "Sofa and loveseat steam cleaning",
      "Rug cleaning (area and oriental)",
      "Pet stain and odor treatment (organic)",
      "Anti-allergen treatment included",
    ],
    startingAt: "$199",
    frequency: "per session",
    icon: Sparkles,
    image: "/images/service-deep-clean.jpg",
    color: "indigo",
  },
  {
    title: "Event & Party Cleanup",
    slug: "event-cleanup",
    requestType: "CUSTOM",
    tagline: "Enjoy the party. We handle the aftermath.",
    description: "Pre-event prep and post-event deep cleaning for private parties, corporate events, open houses, and holiday gatherings. Organic products safe for food prep areas.",
    highlights: [
      "Pre-event staging and polish",
      "Post-event full property cleanup",
      "Kitchen and food prep area sanitize",
      "Bathroom refreshes",
      "Same-day and next-morning scheduling",
    ],
    startingAt: "$199",
    frequency: "per event",
    icon: Star,
    image: "/images/gallery-organic-cleaning.jpg",
    color: "pink",
  },
  {
    title: "Post-Construction Cleanup",
    slug: "post-construction",
    requestType: "CUSTOM",
    tagline: "From construction site to move-in ready — organically.",
    description: "Detailed cleanup after renovations, remodels, or new construction. Dust removal from every surface, window cleaning, fixture polishing, and floor treatment using non-toxic products.",
    highlights: [
      "Construction dust removal (all surfaces)",
      "Window and glass cleaning",
      "Fixture and hardware polishing",
      "Floor scrubbing and treatment",
      "HEPA air filtration pass",
    ],
    startingAt: "$349",
    frequency: "one-time",
    icon: Building2,
    image: "/images/service-moveout-clean.jpg",
    color: "orange",
  },
  {
    title: "Garage & Outdoor Living",
    slug: "garage-outdoor",
    requestType: "PRESSURE_WASH",
    tagline: "Extend your living space — keep it spotless.",
    description: "Garage cleanouts, lanai deep cleans, outdoor kitchen sanitization, pool furniture detailing, and patio surface washing. All with eco-friendly products safe for your landscaping.",
    highlights: [
      "Garage floor and wall cleaning",
      "Lanai and screened porch detailing",
      "Outdoor kitchen and grill cleaning",
      "Pool furniture washing",
      "Patio and deck surface treatment",
    ],
    startingAt: "$129",
    frequency: "per session",
    icon: Home,
    image: "/images/gallery-pressure-washing.jpg",
    color: "teal",
  },
  {
    title: "Eco Junk Removal",
    slug: "junk-removal",
    requestType: "CUSTOM",
    tagline: "Clear the clutter — responsibly.",
    description: "Furniture, appliances, yard waste, and household junk removed and disposed of with maximum recycling and donation. We sort, haul, and sweep the area clean. No harsh dump-and-run — we leave it spotless.",
    highlights: [
      "Furniture and appliance removal",
      "Yard waste and debris hauling",
      "Donation drop-off for usable items",
      "Responsible recycling (no landfill dumping)",
      "Broom-clean sweep of cleared area",
    ],
    startingAt: "$149",
    frequency: "per load",
    icon: RefreshCcw,
    image: "/images/service-moveout-clean.jpg",
    color: "slate",
  },
  {
    title: "Mobile Car Detailing",
    slug: "mobile-detailing",
    requestType: "AUTO_DETAIL",
    tagline: "Showroom finish — we come to you.",
    description: "Full interior and exterior detailing at your home, office, or condo parking lot. Hand wash, clay bar, wax, interior shampoo, leather conditioning, and engine bay cleaning — all with waterless and plant-based products.",
    highlights: [
      "We come to your location (home, office, condo)",
      "Full exterior: hand wash, clay bar, wax/sealant",
      "Full interior: vacuum, shampoo, leather condition",
      "Engine bay cleaning available",
      "Waterless wash option for condos and garages",
    ],
    startingAt: "$149",
    frequency: "per vehicle",
    icon: Star,
    image: "/images/gallery-car-detailing.jpg",
    color: "blue",
  },
  {
    title: "Eco Pool Cleaning & Maintenance",
    slug: "pool-cleaning",
    requestType: "CUSTOM",
    tagline: "Crystal clear water — without the chemical overload.",
    description: "Weekly pool maintenance, green-up treatments, filter cleaning, and pool draining using eco-friendly alternatives to harsh chlorine. Safe for kids, pets, and Kentucky wildlife. Includes lanai and pool deck sweep.",
    highlights: [
      "Weekly skimming, brushing, and vacuuming",
      "Eco-friendly water treatment (low-chlorine alternatives)",
      "Filter cleaning and equipment check",
      "Pool drain and acid wash (seasonal)",
      "Lanai and pool deck sweep included",
    ],
    startingAt: "$99",
    frequency: "per month",
    icon: Sparkles,
    image: "/images/gallery-pressure-washing.jpg",
    color: "cyan",
  },
  {
    title: "Eco Laundry & Organization",
    slug: "laundry-organization",
    requestType: "CUSTOM",
    tagline: "Closets, pantries, and laundry — sorted and refreshed.",
    description: "Professional laundry, folding, closet organization, pantry reorganization, and linen care using organic fabric products. Perfect as an add-on to any cleaning visit.",
    highlights: [
      "Wash, dry, and fold laundry",
      "Closet organization and declutter",
      "Pantry clean and reorganize",
      "Linen change and ironing",
      "Organic fabric softener only",
    ],
    startingAt: "$79",
    frequency: "per session",
    icon: Sparkles,
    image: "/images/clean.png",
    color: "rose",
  },
];

const TRUST_POINTS = [
  { icon: Leaf, label: "100% Plant-Based Products" },
  { icon: Shield, label: "Insured & Background-Checked" },
  { icon: Clock, label: "Flexible Scheduling" },
  { icon: Star, label: "4.9 Star Average on Google" },
];

export default function ServicesPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-accent py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-200">Our Services</p>
          <h1 className="mt-4 font-display text-4xl font-bold text-white md:text-5xl lg:text-6xl">
            A cleaner home.<br />A healthier life.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-brand-100/90">
            Every service uses our signature plant-based products — safe for kids, pets, and the planet.
            Serving Flatwoods, Ashland, and Tri-State Area.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/get-a-quote"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold uppercase tracking-wider text-accent shadow-lg transition hover:bg-brand-50 active:scale-[0.97]"
            >
              Get a Free Quote <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="tel:+16065550100"
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 px-8 py-4 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-white/10"
            >
              Call (606) 555-0100
            </a>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-b border-brand-100 bg-brand-50/30 py-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-8 px-4">
          {TRUST_POINTS.map((tp) => (
            <div key={tp.label} className="flex items-center gap-2 text-sm font-semibold text-accent">
              <tp.icon className="h-5 w-5 text-brand-600" />
              {tp.label}
            </div>
          ))}
        </div>
      </section>

      {/* Service cards */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="space-y-16">
          {SERVICES.map((svc, i) => (
            <div
              key={svc.slug}
              id={svc.slug}
              className={`scroll-mt-24 flex flex-col gap-8 md:flex-row md:items-center ${
                i % 2 === 1 ? "md:flex-row-reverse" : ""
              }`}
            >
              {/* Image */}
              <div className="flex-1">
                <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-xl">
                  <Image
                    src={svc.image}
                    alt={svc.title}
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  {/* Price overlay */}
                  <div className="absolute bottom-4 left-4 rounded-2xl bg-white/95 backdrop-blur-sm px-4 py-2 shadow-lg">
                    <span className="text-xl font-bold text-accent">{svc.startingAt}</span>
                    <span className="ml-1 text-xs text-muted-foreground">{svc.frequency}</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                    <svc.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-bold text-accent">{svc.title}</h2>
                    <p className="text-sm font-medium text-brand-600">{svc.tagline}</p>
                  </div>
                </div>

                <p className="text-muted-foreground leading-relaxed">{svc.description}</p>

                <ul className="space-y-2">
                  {svc.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm text-accent">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600" />
                      {h}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center gap-3 pt-3">
                  <Link
                    href={`/get-a-quote`}
                    className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition hover:bg-brand-700 active:scale-[0.97]"
                  >
                    Get Free Quote <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/request?service=${svc.requestType}`}
                    className="inline-flex items-center gap-2 rounded-full border-2 border-accent px-7 py-3 text-sm font-bold uppercase tracking-wider text-accent transition hover:bg-brand-50 active:scale-[0.97]"
                  >
                    Book Now
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Inline Lead Gen Form */}
      <section id="get-started" className="bg-gradient-to-br from-brand-900 via-brand-800 to-accent py-16 md:py-24">
        <div className="mx-auto max-w-2xl px-4">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-white md:text-4xl">Get your free quote</h2>
            <p className="mt-3 text-lg text-brand-100/90">
              Tell us a little about your space and we will get back to you with a personalized estimate — usually within the hour.
            </p>
          </div>

          <ServiceLeadForm />
        </div>
      </section>
    </div>
  );
}

function ServiceLeadForm() {
  return (
    <form
      action="/api/requests"
      method="POST"
      className="space-y-5 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-white/80">Name *</label>
          <input name="name" required placeholder="Jane Smith"
            className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/20" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-white/80">Phone *</label>
          <input name="phone" type="tel" required placeholder="(941) 555-1234"
            className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/20" />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-white/80">Email *</label>
        <input name="email" type="email" required placeholder="jane@email.com"
          className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/20" />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-white/80">Service interested in *</label>
        <select name="serviceType" required
          className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/20">
          <option value="" className="bg-gray-800">Select a service...</option>
          <option value="HOME_CLEAN" className="bg-gray-800">Healthy Home Cleaning</option>
          <option value="HOME_CLEAN" className="bg-gray-800">Deep Refresh &amp; Detox</option>
          <option value="HOME_CLEAN" className="bg-gray-800">Move-In / Move-Out Detail</option>
          <option value="CUSTOM" className="bg-gray-800">Eco Commercial Care</option>
          <option value="PRESSURE_WASH" className="bg-gray-800">Pressure Washing</option>
          <option value="AUTO_DETAIL" className="bg-gray-800">Eco Auto Detail</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-white/80">Address</label>
          <input name="address" placeholder="123 Palm Ave"
            className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/20" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-white/80">City</label>
          <input name="city" placeholder="Flatwoods"
            className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/20" />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-white/80">Tell us about your space</label>
        <textarea name="notes" rows={3} placeholder="Bedrooms, bathrooms, square footage, pets, special requests..."
          className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/20" />
      </div>

      <Link
        href="/get-a-quote"
        className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold uppercase tracking-wider text-accent shadow-lg transition hover:bg-brand-50 active:scale-[0.97]"
      >
        Get My Free Quote <ArrowRight className="h-4 w-4" />
      </Link>

      <p className="text-center text-xs text-white/50">
        No spam, no pressure. We typically respond within 1 hour during business hours.
      </p>
    </form>
  );
}
