import Link from "next/link";
import Image from "next/image";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Commercial", href: "/commercial" },
  { label: "Why Green", href: "/#why-green" },
  { label: "Blog", href: "/blog" },
  { label: "Community", href: "/community" },
  { label: "About", href: "/#about" },
  { label: "FAQ", href: "/#faq" },
  { label: "Get a Quote", href: "/get-a-quote" }
];

const SERVICE_AREAS = [
  "Flatwoods • Russell • Catlettsburg",
  "Ashland • South Shore",
  "St. Petersburg • Clearwater",
  "Huntington • Brandon • Riverview",
  "Land O’ Lakes • Wesley Chapel"
];

const SOCIAL_LINKS = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/tseorganicclean",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <path
          fill="currentColor"
          d="M12 2C6.5 2 2 6.5 2 12c0 5 3.7 9.1 8.4 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7C18.3 21.1 22 17 22 12c0-5.5-4.5-10-10-10z"
        />
      </svg>
    )
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@go.green.organic",
    icon: (
      <svg width="20" height="20" viewBox="0 0 32 32" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <path
          fill="currentColor"
          d="M16.708.027c1.745-.027 3.48-.011 5.213-.027.105 2.041.839 4.12 2.333 5.563 1.491 1.479 3.6 2.156 5.652 2.385v5.369c-1.923-.063-3.855-.463-5.6-1.291-.76-.344-1.468-.787-2.161-1.24-.009 3.896.016 7.787-.025 11.667-.104 1.864-.719 3.719-1.803 5.255-1.744 2.557-4.771 4.224-7.88 4.276-1.907.109-3.812-.411-5.437-1.369-2.693-1.588-4.588-4.495-4.864-7.615-.032-.667-.043-1.333-.016-1.984.24-2.537 1.495-4.964 3.443-6.615 2.208-1.923 5.301-2.839 8.197-2.297.027 1.975-.052 3.948-.052 5.923-1.323-.428-2.869-.308-4.025.495-.844.547-1.485 1.385-1.819 2.333-.276.676-.197 1.427-.181 2.145.317 2.188 2.421 4.027 4.667 3.828 1.489-.016 2.916-.88 3.692-2.145.251-.443.532-.896.547-1.417.131-2.385.079-4.76.095-7.145.011-5.375-.016-10.735.025-16.093z"
        />
      </svg>
    )
  },
  {
    label: "X",
    href: "https://x.com/ggorganicclean",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <path
          fill="currentColor"
          d="M13.982 10.622 20.54 3h-1.554l-5.693 6.618L8.745 3H3.5l6.876 10.007L3.5 21h1.554l6.012-6.989L15.868 21h5.245l-7.131-10.378Zm-2.128 2.474-.697-.997-5.543-7.93H8l4.474 6.4.697.996 5.815 8.318h-2.387l-4.745-6.787Z"
        />
      </svg>
    )
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/tseorganicclean/",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <path
          fill="currentColor"
          d="M12 3c2.444 0 2.751.01 3.711.054.958.044 1.612.196 2.185.418.592.23 1.094.538 1.594 1.038.5.5.808 1.002 1.038 1.594.222.572.375 1.227.418 2.185.044.96.054 1.267.054 3.711s-.01 2.751-.054 3.711c-.044.958-.196 1.612-.418 2.185-.23.592-.538 1.094-1.038 1.594-.5.5-1.002.808-1.594 1.038-.572.222-1.227.375-2.185.418-.96.044-1.267.054-3.711.054s-2.751-.01-3.711-.054c-.958-.044-1.612-.196-2.185-.418-.592-.23-1.094-.538-1.594-1.038-.5-.5-.808-1.002-1.038-1.594-.222-.572-.375-1.227-.418-2.185C3.01 14.751 3 14.444 3 12s.01-2.751.054-3.711c.044-.958.196-1.612.418-2.185.23-.592.538-1.094 1.038-1.594.5-.5 1.002-.808 1.594-1.038.572-.222 1.227-.375 2.185-.418C9.249 3.01 9.556 3 12 3Zm0 4.378A4.622 4.622 0 0 0 7.378 12c0 2.553 2.069 4.622 4.622 4.622S16.622 14.553 16.622 12 14.553 7.378 12 7.378Zm5.804-1.262a1.08 1.08 0 1 0 0 2.16 1.08 1.08 0 0 0 0-2.16Z"
        />
      </svg>
    )
  },
  {
    label: "Google",
    href: "https://maps.app.goo.gl/4FBEesLcS8c3Djc87",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <path
          fill="currentColor"
          d="M12.02 10.18v3.72h5.51c-.26 1.57-1.67 4.22-5.5 4.22-3.31 0-6.01-2.75-6.01-6.12s2.7-6.12 6.01-6.12c1.87 0 3.13.8 3.85 1.48l2.84-2.76C16.99 2.99 14.73 2 12.03 2c-5.52 0-10 4.48-10 10s4.48 10 10 10c5.77 0 9.6-4.06 9.6-9.77 0-.83-.11-1.42-.25-2.05h-9.36Z"
        />
      </svg>
    )
  }
];

export const Footer = () => (
  <footer className="bg-accent text-white" id="contact">
    <div className="section-wrapper grid grid-cols-1 gap-8 py-12 sm:gap-12 sm:py-16 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
      <div className="space-y-5">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/images/cropped-Mobile-Logo-164x76.png"
            alt="Tri State Enterprise logo"
            width={164}
            height={76}
            className="h-12 w-auto object-contain"
          />
        </Link>
        <p className="text-base leading-relaxed text-white/90">
          Tri State Enterprise delivers meticulously detailed cleaning with products that honor your health and Kentucky&apos;s environment. Licensed, insured, and serving local families and businesses across Flatwoods.
        </p>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
          Satisfaction guaranteed • Safe for kids & pets
        </p>
        <div className="flex items-center gap-3">
          {SOCIAL_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              aria-label={link.label}
            >
              {link.icon}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-lg font-semibold text-white">Quick Links</h4>
        <ul className="mt-5 space-y-3 text-base leading-relaxed text-white">
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <Link href={link.href} className="transition hover:text-brand-100">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-lg font-semibold text-white">Contact</h4>
        <div className="mt-5 space-y-4 text-base leading-relaxed text-white">
          <Link href="tel:+16065550100" className="block text-lg font-semibold text-white">
            (606) 555-0100
          </Link>
          <Link href="mailto:info@tsenow.com" className="block transition hover:text-brand-100">
            info@tsenow.com
          </Link>
          <p>
            Mon – Fri: 8:00 AM – 4:00 PM<br />
            Sat – Sun: By appointment
          </p>
          <p className="text-sm uppercase tracking-[0.25em] text-white/75">Licensed & Insured • Satisfaction Guaranteed</p>
        </div>
      </div>

      <div>
        <h4 className="text-lg font-semibold text-white">Service Areas</h4>
        <ul className="mt-5 space-y-3 text-base leading-relaxed text-white">
          {SERVICE_AREAS.map((area) => (
            <li key={area}>{area}</li>
          ))}
        </ul>
      </div>
    </div>

    <div className="border-t border-white/10 bg-accent/95">
      <div className="section-wrapper flex flex-col items-center justify-between gap-4 py-6 text-center text-base text-white sm:flex-row sm:text-left">
        <p className="font-medium">© {new Date().getFullYear()} Tri State Enterprise. All rights reserved. v21.0.0</p>
        <span className="flex items-center gap-3">
          <Link href="/privacy" className="transition hover:text-brand-200">Privacy Policy</Link>
          <span className="text-white/40">•</span>
          <Link href="/terms" className="transition hover:text-brand-200">Terms of Service</Link>
        </span>
        <span className="font-medium">Licensed &amp; Insured • EPA Safer Choice Products</span>
        <span className="flex items-center gap-2">
          <Image src="/images/en_US.png" alt="English" width={20} height={14} />
          English
        </span>
      </div>
    </div>
  </footer>
);
