import Link from "next/link";
import Image from "next/image";
import {
  Camera, Clock, Shield, Smartphone, Bell, CheckCircle2,
  Repeat, Eye, ArrowRight, Sparkles, Star,
} from "lucide-react";

const HERO_FEATURES = [
  {
    icon: Camera,
    title: "Before & After Photo Proof",
    tagline: "See your home transform — every single visit.",
    description: "Your cleaner photographs every room before they touch it and after they finish. Timestamped, uploaded to your private Google Drive folder, and visible in your portal. No other cleaning company does this.",
    image: "/images/service-basic-clean.jpg",
    stat: "100%",
    statLabel: "of visits documented",
  },
  {
    icon: Clock,
    title: "Live Clock In & Clock Out",
    tagline: "Know exactly when your cleaner is in your home.",
    description: "GPS-verified arrival and departure timestamps. The moment your cleaner enters your home, you get an instant notification. When they leave, you get a completion alert with hours worked and a link to your before/after photos.",
    image: "/images/why-choose-us.jpg",
    stat: "Instant",
    statLabel: "real-time alerts",
  },
  {
    icon: Smartphone,
    title: "Your Own Client Portal",
    tagline: "Every job, every photo, every invoice — in your hands.",
    description: "Log in to your personal dashboard to see your complete cleaning history, upcoming visits, before/after photos for every job, invoices, payment history, and your assigned cleaner's profile and rating. This is YOUR data.",
    image: "/images/about-team.jpg",
    stat: "24/7",
    statLabel: "portal access",
  },
];

const GRID_FEATURES = [
  {
    icon: Bell,
    title: "Multi-Channel Alerts",
    description: "Get notified your way — SMS, email, Telegram, WhatsApp, or Slack. Customize which alerts you receive and how.",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: CheckCircle2,
    title: "Room-by-Room Checklists",
    description: "Every room has a digital checklist your cleaner follows and checks off in real-time. Kitchen: 6 tasks. Bathrooms: 6 tasks. Nothing gets missed.",
    color: "from-emerald-500 to-emerald-600",
  },
  {
    icon: Eye,
    title: "Live Stream for Snowbirds",
    description: "Away from your Kentucky home? Watch your clean live via YouTube stream. Perfect for snowbirds, vacation rental owners, and property managers.",
    color: "from-purple-500 to-purple-600",
  },
  {
    icon: Shield,
    title: "AI Quality Assurance",
    description: "Our AI learns your preferences — products you like, areas to focus on, things to avoid. Every clean gets better because the system remembers.",
    color: "from-amber-500 to-amber-600",
  },
  {
    icon: Repeat,
    title: "Fully Automated Lifecycle",
    description: "Book once. We handle scheduling, reminders, cleaners, photos, invoices, payments, and payroll. The entire operation runs on AI.",
    color: "from-pink-500 to-pink-600",
  },
];

export const TriStateSystemSection = () => (
  <section id="go-green-system">
    {/* Dark hero intro */}
    <div className="bg-gradient-to-br from-brand-900 via-brand-800 to-emerald-800 py-16 md:py-20">
      <div className="section-wrapper text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-5 py-2 text-xs font-bold uppercase tracking-[0.3em] text-brand-200">
          <Sparkles className="h-4 w-4" /> Exclusive Technology
        </span>
        <h2 className="mt-5 font-display text-3xl font-bold text-white sm:text-4xl md:text-5xl leading-tight">
          The Tri State AI System
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base sm:text-xl text-brand-100/80">
          The most transparent cleaning service in Kentucky. See everything. Know everything. Trust everything.
        </p>
        <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm">
          {[
            { icon: Camera, label: "Photo-documented" },
            { icon: Clock, label: "GPS-verified" },
            { icon: Shield, label: "AI-powered" },
            { icon: Star, label: "4.9★ rated" },
          ].map((item) => (
            <span key={item.label} className="flex items-center gap-2 text-brand-100/70">
              <item.icon className="h-4 w-4 text-brand-300" /> {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>

    {/* Feature showcases with images — alternating layout */}
    <div className="bg-white">
      {HERO_FEATURES.map((feature, i) => (
        <div key={feature.title} className={`py-16 ${i % 2 === 1 ? "bg-brand-50/30" : ""}`}>
          <div className={`section-wrapper flex flex-col gap-6 sm:gap-10 md:flex-row md:items-center ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}>
            {/* Image */}
            <div className="flex-1">
              <div className="relative overflow-hidden rounded-3xl shadow-2xl">
                <Image src={feature.image} alt={feature.title} width={600} height={400} className="w-full object-cover" />
                {/* Stat overlay */}
                <div className="absolute bottom-4 left-4 rounded-2xl bg-white/95 backdrop-blur-sm px-5 py-3 shadow-lg">
                  <p className="text-2xl font-bold text-accent">{feature.stat}</p>
                  <p className="text-xs text-muted-foreground">{feature.statLabel}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <feature.icon className="h-7 w-7" />
              </div>
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-accent">{feature.title}</h3>
              <p className="text-lg font-medium text-brand-600">{feature.tagline}</p>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              <Link href="/get-a-quote" className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-8 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition hover:bg-brand-700 active:scale-[0.97] w-full sm:w-auto min-h-[48px]">
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Grid features */}
    <div className="bg-gradient-to-br from-brand-900 to-emerald-800 py-16">
      <div className="section-wrapper">
        <h3 className="text-center font-display text-2xl font-bold text-white mb-10">And That&apos;s Not All</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {GRID_FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-3xl bg-white/10 backdrop-blur-sm border border-white/10 p-5 transition hover:bg-white/15">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} text-white mb-3 shadow-lg`}>
                <feature.icon className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-white text-sm">{feature.title}</h4>
              <p className="mt-1.5 text-xs text-brand-100/70 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/get-a-quote" className="inline-flex items-center gap-2 rounded-full bg-white px-10 py-4 text-sm font-bold uppercase tracking-wider text-accent shadow-xl transition hover:bg-brand-50 active:scale-[0.97]">
            Experience The Difference <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 text-sm text-brand-100/50">
            Every customer gets the full Tri State AI System — portal, photos, alerts, checklists — included free with every clean.
          </p>
        </div>
      </div>
    </div>
  </section>
);
