"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { FeatureSlide } from "@/app/actions/landing-slides";

interface FeatureCarouselSectionProps {
  initialSlides?: FeatureSlide[];
}

export function FeatureCarouselSection({ initialSlides = [] }: FeatureCarouselSectionProps) {
  const slides = initialSlides.filter((s) => s.is_active);
  const [currentIndex, setCurrentIndex] = useState(0);

  const total = slides.length;

  const nextSlide = useCallback(() => {
    if (total === 0) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total === 0) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Auto-play interval: 5 seconds for both desktop & mobile, auto-resets on slide change
  useEffect(() => {
    if (total <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, 5000);
    return () => clearInterval(timer);
  }, [currentIndex, total]);

  if (total === 0) return null;

  const currentSlide = slides[currentIndex] || slides[0];

  return (
    <section
      id="features"
      className="py-16 sm:py-24 bg-gradient-to-b from-white via-orange-50/20 to-white relative overflow-hidden border-b border-gray-100"
    >
      {/* Subtle ambient blur circle */}
      <div
        className="pointer-events-none absolute top-1/4 -right-40 w-96 h-96 rounded-full bg-[#FF5A36]/5 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-10 -left-40 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-orange-50/80 px-3.5 py-1.5 text-xs font-bold text-[#FF5A36] mb-3.5 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#FF5A36]" />
            <span>Powerhouse Features</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-[40px] font-black text-gray-950 tracking-tight leading-[1.2]">
            এক প্ল্যাটফর্মে ৫টি <span className="text-[#FF5A36]">Smart Business Solution</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed font-normal">
            মেনু তৈরি, কাস্টমার QR টেবিল অর্ডার ও প্রফিট মার্জিন ক্যালকুলেশন — রেস্তোরাঁ পরিচালনার প্রতিটি ধাপ এখন সিম্পল।
          </p>
        </div>

        {/* Feature Selector Tabs (Interactive Navigation Pills) - Hidden on mobile, visible on desktop */}
        {total > 1 && (
          <div className="hidden md:flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 mb-8 sm:mb-12 px-1 max-w-7xl mx-auto">
            {slides.map((slide, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={slide.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-[13px] font-bold whitespace-nowrap transition-all flex items-center gap-2 border cursor-pointer ${isActive
                      ? "bg-[#FF5A36] text-white border-[#FF5A36] shadow-md shadow-[#FF5A36]/25 scale-[1.02]"
                      : "bg-white text-gray-600 border-gray-200/80 hover:border-orange-200 hover:text-gray-950 shadow-xs"
                    }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                      }`}
                  >
                    0{idx + 1}
                  </span>
                  <span>{slide.tag || slide.title.slice(0, 24)}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Main 2-Column Split Feature Card */}
        <div className="bg-white rounded-3xl border border-gray-200/90 shadow-[0_10px_35px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] p-6 sm:p-10 lg:p-12 relative">
          {/* Side Navigation Arrow Buttons */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Previous slide"
                className="absolute -left-3 sm:-left-5 lg:-left-6 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/95 backdrop-blur-md border border-gray-200 shadow-md sm:shadow-lg flex items-center justify-center text-gray-700 hover:text-[#FF5A36] hover:border-orange-200 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                aria-label="Next slide"
                className="absolute -right-3 sm:-right-5 lg:-right-6 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/95 backdrop-blur-md border border-gray-200 shadow-md sm:shadow-lg flex items-center justify-center text-gray-700 hover:text-[#FF5A36] hover:border-orange-200 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
            >
              {/* Text Side (50%) */}
              <div className="lg:col-span-6 space-y-5 order-2 lg:order-1">
                {currentSlide.tag && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-orange-50 text-[#FF5A36] text-xs font-bold border border-orange-100 tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A36]" />
                    <span>{currentSlide.tag}</span>
                  </div>
                )}

                <h3 className="text-2xl sm:text-3xl lg:text-[34px] font-black text-gray-950 leading-tight tracking-tight">
                  {currentSlide.title}
                </h3>

                {currentSlide.description && (
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed font-normal">
                    {currentSlide.description}
                  </p>
                )}

                {/* Key Benefits / Checkmarks */}
                {currentSlide.benefits && currentSlide.benefits.length > 0 && (
                  <div className="space-y-2.5 pt-2">
                    {currentSlide.benefits.map((benefit, bIdx) => (
                      <div key={bIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-800 font-medium">
                        <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/80 mt-0.5">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                        </span>
                        <span className="leading-snug">{benefit}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* CTA Action Button */}
                <div className="pt-4 flex flex-wrap items-center gap-4">
                  <Link
                    href={currentSlide.cta_url || "#pricing"}
                    className="inline-flex items-center gap-2 bg-[#FF5A36] hover:bg-[#e84d2a] text-white font-bold text-sm sm:text-base px-7 py-3 rounded-full shadow-md shadow-[#FF5A36]/25 hover:shadow-lg hover:shadow-[#FF5A36]/35 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                  >
                    <span>{currentSlide.cta_text || "Start Building"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Image Side (50%) */}
              <div className="lg:col-span-6 order-1 lg:order-2">
                <div className="relative rounded-2xl overflow-hidden border border-gray-200/90 bg-gray-50/80 shadow-md group aspect-[16/10]">
                  <Image
                    src={currentSlide.image_url}
                    alt={currentSlide.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-102"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority={currentIndex === 0}
                  />

                  {/* Top glass header accent resembling browser bar */}
                  <div className="absolute top-0 inset-x-0 h-6 bg-gradient-to-b from-black/10 to-transparent pointer-events-none" />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Bottom Bar: Slider Controls & Counter */}
          {total > 1 && (
            <div className="mt-8 sm:mt-10 pt-6 border-t border-gray-100 flex items-center justify-between">
              {/* Slide Counter */}
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                <span className="text-gray-900 text-sm">0{currentIndex + 1}</span>
                <span className="text-gray-300">/</span>
                <span>0{total}</span>
              </div>

              {/* Progress Dots */}
              <div className="flex items-center gap-1.5">
                {slides.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    onClick={() => setCurrentIndex(dotIdx)}
                    aria-label={`Go to slide ${dotIdx + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      dotIdx === currentIndex
                        ? "w-7 bg-[#FF5A36]"
                        : "w-2 bg-gray-200 hover:bg-gray-300"
                    }`}
                  />
                ))}
              </div>

              {/* Spacer on right for symmetry with counter */}
              <div className="w-10 sm:w-12" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

