import React from "react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Links | Tri State Enterprise",
  description: "All our links in one place — book a clean, follow us on social media, join our crew, or explore our community."
};

type LinkItem = {
  label: string;
  description: string;
  href: string;
  icon: string;
  primary?: boolean;
  external?: boolean;
};

const LINKS: { category: string; items: LinkItem[] }[] = [
  {
    category: "Book & Connect",
    items: [
      {
        label: "Get a Free Quote",
        description: "See your price in 30 seconds",
        href: "/get-a-quote",
        icon: "sparkles",
        primary: true
      },
      {
        label: "Call Us Now",
        description: "(606) 836-2534",
        href: "tel:+16068362534",
        icon: "phone"
      },
      {
        label: "Email Us",
        description: "tse@tristateenterprise.com",
        href: "mailto:tse@tristateenterprise.com",
        icon: "mail"
      },
      {
        label: "Client Portal Login",
        description: "View visits, quotes & billing",
        href: "/login",
        icon: "user"
      }
    ]
  },
  {
    category: "Explore",
    items: [
      {
        label: "Community Hub",
        description: "Tips, deals & neighborhood chat",
        href: "/community",
        icon: "community"
      },
      {
        label: "Our Services",
        description: "Construction, HVAC & Landscaping",
        href: "/#services",
        icon: "services"
      },
      {
        label: "Why Tri State?",
        description: "Our professional approach",
        href: "/#why-choose-us",
        icon: "leaf"
      }
    ]
  },
  {
    category: "Follow Us",
    items: [
      {
        label: "Google Reviews",
        description: "Trusted contractor in Flatwoods",
        href: "https://maps.app.goo.gl/4FBEesLcS8c3Djc87",
        icon: "google",
        external: true
      },
      {
        label: "Facebook",
        description: "@tristateenterprise",
        href: "https://www.facebook.com/tristateenterprise",
        icon: "facebook",
        external: true
      },
      {
        label: "Instagram",
        description: "@tristateenterprise",
        href: "https://www.instagram.com/tristateenterprise/",
        icon: "instagram",
        external: true
      },
      {
        label: "TikTok",
        description: "@tristateenterprise",
        href: "https://www.tiktok.com/@tristateenterprise",
        icon: "tiktok",
        external: true
      },
      {
        label: "X (Twitter)",
        description: "@tristateenterprise",
        href: "https://x.com/tristateenterprise",
        icon: "x",
        external: true
      }
    ]
  },
  {
    category: "Join the Team",
    items: [
      {
        label: "Apply to Join Our Crew",
        description: "We're hiring professional cleaners",
        href: "/apply",
        icon: "briefcase"
      }
    ]
  }
];

const ICON_MAP: Record<string, React.ReactNode> = {
  sparkles: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  ),
  phone: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  ),
  mail: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  ),
  user: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  community: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  ),
  services: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m0 0L11.42 4.97m-5.1 5.1H21M3 21h18" />
    </svg>
  ),
  leaf: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 3.03v.568c0 2.849.84 5.641 2.417 8.015M12.75 3.03c-2.917.564-5.444 2.175-7.147 4.502M12.75 3.03V1.5M4.186 9.5c-.51 1.155-.786 2.414-.786 3.75 0 5.385 4.365 9.75 9.75 9.75 1.336 0 2.595-.276 3.75-.786M15.167 11.613a9.002 9.002 0 015.583 5.387M3.75 21L7.5 17.25" />
    </svg>
  ),
  google: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.02 10.18v3.72h5.51c-.26 1.57-1.67 4.22-5.5 4.22-3.31 0-6.01-2.75-6.01-6.12s2.7-6.12 6.01-6.12c1.87 0 3.13.8 3.85 1.48l2.84-2.76C16.99 2.99 14.73 2 12.03 2c-5.52 0-10 4.48-10 10s4.48 10 10 10c5.77 0 9.6-4.06 9.6-9.77 0-.83-.11-1.42-.25-2.05h-9.36Z" />
    </svg>
  ),
  facebook: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.5 2 2 6.5 2 12c0 5 3.7 9.1 8.4 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7C18.3 21.1 22 17 22 12c0-5.5-4.5-10-10-10z" />
    </svg>
  ),
  instagram: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3c2.444 0 2.751.01 3.711.054.958.044 1.612.196 2.185.418.592.23 1.094.538 1.594 1.038.5.5.808 1.002 1.038 1.594.222.572.375 1.227.418 2.185.044.96.054 1.267.054 3.711s-.01 2.751-.054 3.711c-.044.958-.196 1.612-.418 2.185-.23.592-.538 1.094-1.038 1.594-.5.5-1.002.808-1.594 1.038-.572.222-1.227.375-2.185.418-.96.044-1.267.054-3.711.054s-2.751-.01-3.711-.054c-.958-.044-1.612-.196-2.185-.418-.592-.23-1.094-.538-1.594-1.038-.5-.5-.808-1.002-1.038-1.594-.222-.572-.375-1.227-.418-2.185C3.01 14.751 3 14.444 3 12s.01-2.751.054-3.711c.044-.958.196-1.612.418-2.185.23-.592.538-1.094 1.038-1.594.5-.5 1.002-.808 1.594-1.038.572-.222 1.227-.375 2.185-.418C9.249 3.01 9.556 3 12 3Zm0 4.378A4.622 4.622 0 0 0 7.378 12c0 2.553 2.069 4.622 4.622 4.622S16.622 14.553 16.622 12 14.553 7.378 12 7.378Zm5.804-1.262a1.08 1.08 0 1 0 0 2.16 1.08 1.08 0 0 0 0-2.16Z" />
    </svg>
  ),
  tiktok: (
    <svg className="h-5 w-5" viewBox="0 0 32 32" fill="currentColor">
      <path d="M16.708.027c1.745-.027 3.48-.011 5.213-.027.105 2.041.839 4.12 2.333 5.563 1.491 1.479 3.6 2.156 5.652 2.385v5.369c-1.923-.063-3.855-.463-5.6-1.291-.76-.344-1.468-.787-2.161-1.24-.009 3.896.016 7.787-.025 11.667-.104 1.864-.719 3.719-1.803 5.255-1.744 2.557-4.771 4.224-7.88 4.276-1.907.109-3.812-.411-5.437-1.369-2.693-1.588-4.588-4.495-4.864-7.615-.032-.667-.043-1.333-.016-1.984.24-2.537 1.495-4.964 3.443-6.615 2.208-1.923 5.301-2.839 8.197-2.297.027 1.975-.052 3.948-.052 5.923-1.323-.428-2.869-.308-4.025.495-.844.547-1.485 1.385-1.819 2.333-.276.676-.197 1.427-.181 2.145.317 2.188 2.421 4.027 4.667 3.828 1.489-.016 2.916-.88 3.692-2.145.251-.443.532-.896.547-1.417.131-2.385.079-4.76.095-7.145.011-5.375-.016-10.735.025-16.093z" />
    </svg>
  ),
  x: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.982 10.622 20.54 3h-1.554l-5.693 6.618L8.745 3H3.5l6.876 10.007L3.5 21h1.554l6.012-6.989L15.868 21h5.245l-7.131-10.378Zm-2.128 2.474-.697-.997-5.543-7.93H8l4.474 6.4.697.996 5.815 8.318h-2.387l-4.745-6.787Z" />
    </svg>
  ),
  briefcase: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
    </svg>
  )
};

const LinksPage = () => (
  <div className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-brand-50">
    {/* Header */}
    <div className="bg-gradient-to-br from-accent to-brand-700 pb-20 pt-12 text-center text-white">
      <div className="mx-auto max-w-lg px-4">
        <Image
          src="/images/cropped-Mobile-Logo-164x76.png"
          alt="Tri State Enterprise logo"
          width={164}
          height={76}
          className="mx-auto h-16 w-auto object-contain brightness-0 invert"
        />
        <h1 className="mt-4 text-2xl font-bold">Tri State Enterprise</h1>
        <p className="mt-1 text-sm text-brand-200">
          Flatwoods's premier professional services service
        </p>
        <p className="mt-3 text-xs text-brand-200/80">
          100% professional equipment · Licensed & insured · 5.0 stars on Google
        </p>
      </div>
    </div>

    {/* Links */}
    <div className="mx-auto -mt-12 max-w-lg px-4 pb-16">
      {LINKS.map((group) => (
        <div key={group.category} className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {group.category}
          </h2>
          <div className="space-y-2">
            {group.items.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                className={`flex items-center gap-4 rounded-2xl border px-5 py-4 transition ${
                  link.primary
                    ? "border-brand-500 bg-accent text-white shadow-brand hover:bg-brand-700"
                    : "border-brand-100 bg-white text-foreground shadow-sm hover:border-brand-200 hover:shadow-md"
                }`}
              >
                <span className={link.primary ? "text-white/80" : "text-brand-500"}>
                  {ICON_MAP[link.icon] || null}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold ${link.primary ? "text-white" : "text-accent"}`}>
                    {link.label}
                  </p>
                  <p className={`text-sm ${link.primary ? "text-white/70" : "text-muted-foreground"}`}>
                    {link.description}
                  </p>
                </div>
                <svg
                  className={`h-4 w-4 flex-shrink-0 ${link.primary ? "text-white/50" : "text-brand-300"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Bottom branding */}
      <div className="mt-8 text-center">
        <p className="text-xs text-muted-foreground">
          Serving Flatwoods, Ashland, Tri-State Area &amp; surrounding areas
        </p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          &copy; {new Date().getFullYear()} Tri State Enterprise
        </p>
      </div>
    </div>
  </div>
);

export default LinksPage;
