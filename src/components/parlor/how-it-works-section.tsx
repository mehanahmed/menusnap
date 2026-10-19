"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { ProductDemoLaptop } from "./product-demo-laptop";

export function ParlorHowItWorksSection() {
  return (
    <>
      {/* Infographic Banner: Menu Research & Solution (Identical to v2) */}
      <section id="how-it-works" className="pt-2 sm:pt-6 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 bg-white border-t border-neutral-100">
        <div className="max-w-[1240px] mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative w-full max-w-[1240px] mx-auto"
          >
            <Image
              src="/section.png"
              alt="MenuSnap - Parlour Menu Research & Solution"
              width={1672}
              height={941}
              priority
              className="w-full h-auto object-contain block"
            />
          </motion.div>

          {/* Bottom CTA Button (below section.png) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-4 sm:mt-6 flex justify-center"
          >
            <Link
              href="#pricing"
              onClick={(e) => {
                trackEvent("parlor_infographic_cta_clicked", { source: "infographic_bottom_cta" });
                const el = document.getElementById("pricing");
                if (el) {
                  e.preventDefault();
                  el.scrollIntoView({ behavior: "smooth" });
                  window.history.pushState(null, "", "#pricing");
                }
              }}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-b from-[#e0f2fe] via-[#bae6fd] to-[#7dd3fc] border border-sky-300 text-[#0369a1] font-bold text-sm sm:text-base shadow-[0_4px_16px_rgba(56,189,248,0.25)] hover:shadow-[0_6px_22px_rgba(56,189,248,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>Start building</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Live Interactive Video Walkthrough in Laptop Mockup with Dark Grid Pattern */}
      <section id="demo" className="relative overflow-hidden bg-[#111111] text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-y border-neutral-800">
        {/* Dark Grid Background Pattern */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '24px 24px' 
          }} 
          aria-hidden="true" 
        />
        
        {/* Radial Ambient Orange Glow */}
        <div 
          className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full opacity-50 blur-3xl" 
          style={{ background: "radial-gradient(closest-side, rgb(255 90 54 / 0.18), transparent)" }} 
          aria-hidden="true" 
        />

        <div className="max-w-[1240px] mx-auto relative z-10 text-center">
          {/* Section Heading & Subtitle */}
          <div className="flex flex-col gap-4 items-center text-center mb-10 sm:mb-14">
            <span className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] border-white/15 bg-white/5 text-[#FF5A36]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF5A36]" aria-hidden="true" />
              See MenuSnap in Action
            </span>
            <h2 className="text-balance text-2xl sm:text-4xl lg:text-[42px] font-extrabold leading-[1.15] tracking-tight text-white font-bengali">
              Research থেকে Ready Menu — দেখুন কীভাবে।
            </h2>
            <p className="text-balance max-w-2xl text-sm sm:text-base text-white/60 leading-relaxed font-normal">
              Two minutes is all you need to understand how MenuSnap turns scattered research into an organized, buildable parlour menu.
            </p>
          </div>

          {/* Centered Video Walkthrough Mockup with Desktop / Mobile Switcher */}
          <ProductDemoLaptop
            videoUrl="https://v1.pinimg.com/videos/iht/expMp4/79/86/b7/7986b72a3da0ea79fcd1c5c482eefecf_720w.mp4"
            mobileVideoUrl="/videos/demo%20mobile%20version.MOV"
            poster="https://i.pinimg.com/videos/thumbnails/originals/79/86/b7/7986b72a3da0ea79fcd1c5c482eefecf.0000000.jpg"
            title="MenuSnap Interactive Menu Intelligence"
            mobileTitle="MenuSnap Mobile Experience"
            badge="Desktop View"
            mobileBadge="Mobile View"
          />

          {/* Workflow Steps Pills */}
          <div className="mt-12 sm:mt-16">
            <ul className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3" aria-label="MenuSnap parlour workflow">
              {["Login", "Explore", "Search", "Research Price", "Add Services", "Customize"].map((step) => (
                <li key={step} className="flex items-center gap-2">
                  <span className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[13px] font-semibold text-white/80">
                    {step}
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-3.5 w-3.5 text-white/30">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </li>
              ))}
              <li className="flex items-center gap-2">
                <span className="rounded-full bg-[#FF5A36] px-3.5 py-1.5 text-[13px] font-bold text-white shadow-md">
                  Build
                </span>
              </li>
            </ul>
          </div>

          {/* Bottom CTA Button */}
          <div className="mt-8 sm:mt-10 flex justify-center">
            <Link
              href="#pricing"
              onClick={() => trackEvent("parlor_demo_cta_clicked", { source: "demo_dark_section_cta" })}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-[#FF5A36] hover:bg-[#e6482a] text-white font-bold text-sm sm:text-base shadow-[0_4px_16px_rgba(255,90,54,0.3)] hover:shadow-[0_6px_22px_rgba(255,90,54,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>Start Building My Parlour Menu</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
