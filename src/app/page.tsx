import React from "react";
import { Navbar } from "@/components/landingv2/navbar";
import { HeroSection } from "@/components/landingv2/hero-section";
import { StatsStrip } from "@/components/landingv2/stats-strip";
import { HowItWorksSection } from "@/components/landingv2/how-it-works-section";
import { Pricing } from "@/components/landing/Pricing";
import { FAQSection } from "@/components/landingv2/faq-section";
import { FinalCTASection } from "@/components/landingv2/final-cta-section";
import { Footer } from "@/components/landingv2/footer";
import { StickyMobileCTA } from "@/components/landingv2/sticky-mobile-cta";
import { FAQS } from "@/lib/data";
import { getPublicPricingPackagesAction } from "@/app/actions/packages";

export default async function HomePage() {
  const packagesRes = await getPublicPricingPackagesAction();
  const packages = packagesRes.success && packagesRes.data ? packagesRes.data : [];
  const minPrice = packages.length > 0 ? Math.min(...packages.map((p) => p.price)) : 499;

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MenuSnap",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Restaurant menu research and menu builder for Bangladesh. Explore 500+ restaurant and parlor menu references, research food items and price references, and build your own restaurant menu.",
    offers: packages.length > 0
      ? packages.map((pkg) => ({
          "@type": "Offer",
          name: pkg.name,
          price: String(pkg.price),
          priceCurrency: pkg.currency_code || "BDT",
        }))
      : [
          { "@type": "Offer", name: "Starter", price: "499", priceCurrency: "BDT" },
          { "@type": "Offer", name: "Pro", price: "1499", priceCurrency: "BDT" },
          { "@type": "Offer", name: "Agency", price: "4999", priceCurrency: "BDT" },
        ],
    inLanguage: ["bn", "en"],
    publisher: { "@type": "Organization", name: "MenuSnap" },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-[#FF5A36]/15 selection:text-[#FF5A36] overflow-x-clip">
      {/* Premium Sticky Navigation */}
      <Navbar />

      <main id="main-content">
        {/* 1. Hero Section with 3D Interactive Dashboard Mockup */}
        <HeroSection />

        {/* 2. Fast Proof Metrics Strip */}
        <StatsStrip />

        {/* 3. 3-Step Guided Workflow */}
        <HowItWorksSection />

        {/* 4. Interactive Pricing Table */}
        <Pricing initialPackages={packages} />

        {/* 5. Accessible FAQ Accordion */}
        <FAQSection />

        {/* 6. Final High-Converting Closing CTA */}
        <FinalCTASection />
      </main>

      {/* Clean SaaS Footer */}
      <Footer />

      {/* Sticky Bottom Bar for Mobile Visitors */}
      <StickyMobileCTA minPrice={minPrice} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </div>
  );
}
