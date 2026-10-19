"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { trackEvent } from "@/lib/analytics";

export function ParlorStickyMobileCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show only after scrolling down 300px
      const isPastHero = window.scrollY > 300;
      
      // Hide if near footer or pricing section
      const pricingEl = document.getElementById("pricing");
      let nearPricing = false;
      if (pricingEl) {
        const rect = pricingEl.getBoundingClientRect();
        nearPricing = rect.top < window.innerHeight && rect.bottom > 0;
      }

      setVisible(isPastHero && !nearPricing);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollTo = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      window.history.pushState(null, "", `#${id}`);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-white/95 backdrop-blur-lg border-t border-gray-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] sm:hidden"
        >
          <div className="flex items-center gap-2 max-w-md mx-auto">
            {/* Watch Demo Shortcut */}
            <button
              type="button"
              onClick={(e) => handleScrollTo("demo", e)}
              className="flex-1 py-2.5 px-3 rounded-xl border border-gray-200 bg-gray-50 active:bg-gray-100 text-gray-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Play className="w-3.5 h-3.5 text-[#FF5A36] fill-current" />
              <span>Watch Demo</span>
            </button>

            {/* Start Building Primary CTA */}
            <Link
              href="#pricing"
              onClick={(e) => {
                trackEvent("parlor_sticky_mobile_cta_clicked");
                handleScrollTo("pricing", e);
              }}
              className="flex-[1.5] py-2.5 px-3 rounded-xl bg-[#FF5A36] hover:bg-[#e64c29] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-[0.98] transition-all"
            >
              <span>Start Building</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
