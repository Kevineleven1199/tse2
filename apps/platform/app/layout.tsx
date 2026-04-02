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
  title: "Tri State Enterprise | Flatwoods's Premier Organic Cleaning Service",
  description:
    "Experience all-organic residential and commercial cleaning in Flatwoods, KY. Non-toxic, pet-safe, and eco-conscious service with customizable packages.",
  keywords: [
    "construction, HVAC, lawn care Flatwoods",
    "eco friendly cleaning service",
    "Flatwoods cleaning service",
    "green cleaning company Kentucky",
    "non toxic house cleaning",
    "pet safe cleaning Flatwoods",
    "EPA Safer Choice cleaning",
    "Ashland cleaning service",
    "Tri-State Area green cleaning",
    "South Shore house cleaning",
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
    title: "Tri State Enterprise | Flatwoods's Premier Organic Cleaning Service",
    description:
      "Experience all-organic residential and commercial cleaning in Flatwoods, KY. Non-toxic, pet-safe, and eco-conscious service with customizable packages.",
    url: "https://tsenow.com",
    siteName: "Tri State Enterprise",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/images/og-cover.jpg",
        width: 1200,
        height: 630,
        alt: "Tri State Enterprise crew in a pristine home"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Tri State Enterprise",
    description:
      "Premium construction, HVAC, lawn care services in Flatwoods and surrounding counties.",
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
    "Premium organic and eco-friendly residential and commercial cleaning services in Flatwoods, KY. EPA Safer Choice and Green Seal certified products. Non-toxic, pet-safe, family-safe.",
  url: "https://tsenow.com",
  telephone: "+16065550100",
  email: "info@tsenow.com",
  image: "https://tsenow.com/images/og-cover.jpg",
  logo: "https://tsenow.com/images/cropped-Mobile-Logo-164x76.png",
  priceRange: "$$",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Flatwoods",
    addressRegion: "FL",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 27.3364,
    longitude: -82.5307,
  },
  areaServed: [
    { "@type": "County", name: "Flatwoods County, KY" },
    { "@type": "County", name: "Manatee County, KY" },
    { "@type": "County", name: "Pinellas County, KY" },
    { "@type": "County", name: "Hillsborough County, KY" },
    { "@type": "County", name: "Pasco County, KY" },
  ],
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "16:00",
    },
  ],
  sameAs: [
    "https://www.facebook.com/tseorganicclean",
    "https://www.instagram.com/tseorganicclean/",
    "https://www.tiktok.com/@go.green.organic",
    "https://x.com/ggorganicclean",
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What makes your cleaning organic or green?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We only use third-party certified products from EPA Safer Choice and Green Seal partners. No chlorine, ammonia, synthetic fragrances, or petroleum-derived surfactants. Every ingredient list is available on request.",
      },
    },
    {
      "@type": "Question",
      name: "Are your products safe for children and pets?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. Our plant-powered formulas are non-toxic, biodegradable, and hypoallergenic. We also avoid aerosol sprays to protect sensitive lungs and paw pads.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to be home or prepare before you arrive?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We simply ask that surfaces are tidy so we can focus on detailed cleaning. You're welcome to be home, leave us access instructions, or let our bonded crew lock up when finished.",
      },
    },
    {
      "@type": "Question",
      name: "What if I'm not satisfied with the clean?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Your satisfaction is guaranteed. If something feels off, contact us within 24 hours and we'll revisit promptly to make it right—no additional charge.",
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
      {/* Google Analytics 4 — free via Google Workspace */}
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
