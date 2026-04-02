import { TrustBar } from "@/src/components/TrustBar";
import { HeroSection } from "@/src/components/HeroSection";
import { AboutSection } from "@/src/components/AboutSection";
import { PillarsSection } from "@/src/components/PillarsSection";
import { ServicesSection } from "@/src/components/ServicesSection";
import { GallerySection } from "@/src/components/GallerySection";
import { HowItWorks } from "@/src/components/HowItWorks";
import { ServiceAreasSection } from "@/src/components/ServiceAreasSection";
import { StatsSection } from "@/src/components/StatsSection";
import { TestimonialsSection } from "@/src/components/TestimonialsSection";
import { CredentialsSection } from "@/src/components/CredentialsSection";
import { FAQSection } from "@/src/components/FAQSection";
import { NewsletterSignup } from "@/src/components/NewsletterSignup";
import { QuoteSection } from "@/src/components/QuoteSection";
import { StickyMobileCTA } from "@/src/components/StickyMobileCTA";
import { TriStateSystemSection } from "@/src/components/TriStateSystemSection";
import { BlogPreviewSection } from "@/src/components/BlogPreviewSection";
import { CleaningTransformation } from "@/src/components/CleaningTransformation";

// NavBar and Footer are now provided by the shared (public) layout

const HomePage = () => {
  return (
    <main className="bg-surface">
      <TrustBar />
      <HeroSection />
      <StatsSection />
      <TriStateSystemSection />
      <CleaningTransformation />
      <PillarsSection />
      <ServicesSection />
      <GallerySection />
      <HowItWorks />
      <CredentialsSection />
      <TestimonialsSection />
      <BlogPreviewSection />
      <AboutSection />
      <ServiceAreasSection />
      <FAQSection />
      <QuoteSection />
      <NewsletterSignup />

      {/* Conversion optimization components */}
      <StickyMobileCTA />
    </main>
  );
};

export default HomePage;
