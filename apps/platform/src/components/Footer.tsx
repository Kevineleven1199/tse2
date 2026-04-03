import Link from "next/link";
import Image from "next/image";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/#about" },
  { label: "Services", href: "/services" },
  { label: "Contact", href: "/#contact" },
  { label: "Blogs", href: "/blog" },
  { label: "Careers", href: "/careers" },
  { label: "Recent Projects", href: "/reviews" },
  { label: "Get a Quote", href: "/get-a-quote" },
  { label: "Pay Your Bill", href: "/how-to-pay" }
];

const SERVICE_AREAS = [
  "Flatwoods \u2022 Russell \u2022 Catlettsburg",
  "Ashland \u2022 South Shore \u2022 Grayson",
  "Huntington, WV \u2022 Ironton, OH",
  "Greenup \u2022 Boyd \u2022 Carter Counties",
  "KY \u2022 OH \u2022 WV Tri-State Area"
];

const SOCIAL_LINKS = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/tristateenterprise",
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
    label: "Instagram",
    href: "https://www.instagram.com/tristateenterprise/",
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
          Serving the Kentucky-Ohio-West Virginia Tri-State area since 1992. From home improvements to large commercial projects, we provide reliable, local expertise backed by decades of experience in Construction, HVAC, Lawn Care, Landscaping, Site Work, and Paving.
        </p>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
          &ldquo;One Call Does It All&rdquo; &bull; Licensed &amp; Insured
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
          <Link href="tel:+16068362534" className="block text-lg font-semibold text-white">
            (606) 836-2534
          </Link>
          <Link href="mailto:tse@tristateenterprise.com" className="block transition hover:text-brand-100">
            tse@tristateenterprise.com
          </Link>
          <p>
            Mon &ndash; Fri: 8:00 AM &ndash; 4:30 PM<br />
            Weekends: Closed
          </p>
          <p className="text-sm uppercase tracking-[0.25em] text-white/75">Licensed &amp; Insured &bull; Since 1992</p>
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
        <p className="font-medium">&copy; {new Date().getFullYear()} Tri State Enterprise. All rights reserved.</p>
        <span className="flex items-center gap-3">
          <Link href="/privacy" className="transition hover:text-brand-200">Privacy Policy</Link>
          <span className="text-white/40">&bull;</span>
          <Link href="/terms" className="transition hover:text-brand-200">Terms of Service</Link>
        </span>
        <span className="font-medium">Licensed &amp; Insured &bull; Since 1992</span>
      </div>
    </div>
  </footer>
);
