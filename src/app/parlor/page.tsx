import React from "react";
import { ParlorNavbar } from "@/components/parlor/navbar";
import { ParlorHeroSection } from "@/components/parlor/hero-section";
import { ParlorStatsStrip } from "@/components/parlor/stats-strip";
import { ParlorHowItWorksSection } from "@/components/parlor/how-it-works-section";
import { Pricing } from "@/components/landing/Pricing";
import { ParlorFAQSection } from "@/components/parlor/faq-section";
import { ParlorFinalCTASection } from "@/components/parlor/final-cta-section";
import { ParlorFooter } from "@/components/parlor/footer";
import { ParlorStickyMobileCTA } from "@/components/parlor/sticky-mobile-cta";
import { getPublicPricingPackagesAction } from "@/app/actions/packages";

export default async function ParlorLandingPage() {
  const packagesRes = await getPublicPricingPackagesAction();
  const packages = packagesRes.success && packagesRes.data ? packagesRes.data : [];

  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-[#FF5A36]/15 selection:text-[#FF5A36] overflow-x-clip">
      {/* Dedicated Sticky Navigation */}
      <ParlorNavbar />

      <main>
        {/* 1. Hero Section with Interactive Video Mockup */}
        <ParlorHeroSection />

        {/* 2. Verified Metrics Strip */}
        <ParlorStatsStrip />

        {/* 3. Infographic Banner + Video Walkthrough with Switcher */}
        <ParlorHowItWorksSection />

        {/* 4. Interactive Pricing Table (Same system, same price, same options) */}
        <Pricing initialPackages={packages} />

        {/* 5. Parlour FAQ Accordion */}
        <ParlorFAQSection />

        {/* 6. Final High-Converting Closing CTA */}
        <ParlorFinalCTASection />
      </main>

      {/* Clean Parlour Footer */}
      <ParlorFooter />

      {/* Sticky Bottom Bar for Mobile Visitors */}
      <ParlorStickyMobileCTA />
    </div>
  );
}
