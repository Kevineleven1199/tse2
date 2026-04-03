import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import "../styles/globals.css";
import Providers from "@/components/providers";

const display = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display"
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body"
});

export const metadata: Metadata = {
  title: "Tri State Enterprise | Construction, HVAC & Landscaping — One Call Does It All",
  description:
    "Serving the Kentucky-Ohio-West Virginia Tri-State area since 1992. Tri State Enterprise delivers trusted services in Construction, HVAC, Lawn Care, Landscaping, Site Work, and Paving.",
  keywords: [
    "construction company Kentucky",
    "HVAC services Tri-State area",
    "landscaping Ashland KY",
    "lawn care Flatwoods KY",
    "site work contractor Kentucky",
    "paving company Ohio West Virginia",
    "Tri State Enterprise",
    "commercial construction KY OH WV",
    "heating and air conditioning Kentucky",
    "residential contractor Tri-State",
  ],
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover",
  alternates: {
    canonical: "https://tsenow.com",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  metadataBase: new URL("https://tsenow.com"),
  openGraph: {
    title: "Tri State Enterprise | Construction, HVAC & Landscaping",
    description:
      "Serving the KY-OH-WV Tri-State area since 1992. Construction, HVAC, Lawn Care, Landscaping, Site Work, and Paving. One Call Does It All.",
    url: "https://tsenow.com",
    siteName: "Tri State Enterprise",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/images/og-cover.jpg",
        width: 1200,
        height: 630,
        alt: "Tri State Enterprise crew on a job site"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Tri State Enterprise",
    description:
      "Construction, HVAC, lawn care, landscaping, site work & paving in the KY-OH-WV Tri-State area since 1992.",
    images: ["/images/og-cover.jpg"]
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png"
  },
  themeColor: "#008D0A",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TriState",
  },
  manifest: "/manifest.json",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://tsenow.com",
  name: "Tri State Enterprise",
  description:
    "Serving the Kentucky-Ohio-West Virginia Tri-State area since 1992, Tri State Enterprise delivers trusted services in Construction, HVAC, Lawn Care, Landscaping, Site Work, and Paving. Licensed, bonded, and insured.",
  url: "https://tsenow.com",
  telephone: "+16068362534",
  email: "tse@tristateenterprise.com",
  image: "https://tsenow.com/images/og-cover.jpg",
  logo: "https://tsenow.com/images/cropped-Mobile-Logo-164x76.png",
  priceRange: "$$",
  address: {
    "@type": "PostalAddress",
    streetAddress: "701 3rd Street",
    addressLocality: "Flatwoods",
    addressRegion: "KY",
    postalCode: "41139",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 38.5218,
    longitude: -82.7179,
  },
  areaServed: [
    { "@type": "State", name: "Kentucky" },
    { "@type": "State", name: "Ohio" },
    { "@type": "State", name: "West Virginia" },
    { "@type": "County", name: "Greenup County, KY" },
    { "@type": "County", name: "Boyd County, KY" },
    { "@type": "County", name: "Carter County, KY" },
    { "@type": "County", name: "Lawrence County, OH" },
    { "@type": "County", name: "Cabell County, WV" },
  ],
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "16:30",
    },
  ],
  sameAs: [
    "https://www.facebook.com/tristateenterprise",
    "https://www.instagram.com/tristateenterprise/",
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What services does Tri State Enterprise offer?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We offer a full range of services including Construction, HVAC (heating & air conditioning), Lawn Care, Landscaping, Site Work, and Paving. From home improvements to large commercial projects, one call does it all.",
      },
    },
    {
      "@type": "Question",
      name: "What areas do you serve?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We serve the entire Kentucky-Ohio-West Virginia Tri-State area including Flatwoods, Ashland, Russell, Catlettsburg, South Shore, Huntington, and surrounding communities.",
      },
    },
    {
      "@type": "Question",
      name: "Are you licensed and insured?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Tri State Enterprise is fully licensed, bonded, and insured. We have been in business since 1992, with over 30 years of experience serving the Tri-State area.",
      },
    },
    {
      "@type": "Question",
      name: "How do I get a free estimate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Call us at (606) 836-2534 or use our online quote form. We provide free estimates for all services and can typically schedule a site visit within the same week.",
      },
    },
  ],
};

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en" suppressHydrationWarning>
    <head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {/* Google Analytics 4 */}
      {GA_ID && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{page_path:window.location.pathname});`,
            }}
          />
        </>
      )}
    </head>
    <body className={`${display.variable} ${body.variable} bg-surface text-foreground`}>
      <Providers>{children}</Providers>
    </body>
  </html>
);

export default RootLayout;
