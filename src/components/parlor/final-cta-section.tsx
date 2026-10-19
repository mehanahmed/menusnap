"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Play, Scissors } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export function ParlorFinalCTASection() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
      <div className="max-w-[1240px] mx-auto">
        <div className="relative rounded-[32px] bg-[#111111] text-white p-8 sm:p-14 lg:p-20 text-center overflow-hidden border border-gray-800 shadow-2xl">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 right-1/4 w-[500px] h-[350px] bg-pink-500/15 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] bg-[#FF5A36]/15 blur-[120px] rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto">
            {/* Small Label */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 text-pink-300 text-xs font-bold tracking-wider uppercase mb-6 border border-white/10">
              <Scissors className="w-3.5 h-3.5" />
              Your Parlour Menu Starts Here
            </div>

            {/* Headline */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white font-bengali tracking-tight leading-[1.15] mb-6">
              Next Parlour Menu শূন্য থেকে শুরু করবেন না।
            </h2>

            {/* Supporting Copy - Zero mentions of Salon */}
            <p className="text-base sm:text-lg text-gray-300 font-bengali leading-relaxed font-normal mb-10 max-w-2xl mx-auto">
              500+ Parlour Service References explore করুন এবং নিজের Parlour-এর Service Menu আরও দ্রুত plan করুন।
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link
                href="#pricing"
                onClick={() => trackEvent("parlor_final_cta_clicked", { button: "primary_final" })}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#FF5A36] hover:bg-[#e64c29] text-white font-bold text-base px-8 py-4 rounded-xl shadow-xl shadow-orange-500/25 active:scale-[0.98] transition-all cursor-pointer group"
              >
                <span>Start Building My Parlour Menu</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("demo") || document.getElementById("how-it-works");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-bold text-base px-7 py-4 rounded-xl border border-white/15 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-pink-300 fill-current" />
                <span>See MenuSnap in Action</span>
              </button>
            </div>

            {/* Trust Footer */}
            <p className="text-xs sm:text-sm text-gray-400 font-medium">
              Instant Activation • Lifetime Access Available • No Credit Card Required
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
