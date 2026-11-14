"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";

const QUESTIONS = [
  "কোন Item রাখবো?",
  "Competitors কী রাখছে?",
  "কোন Category দরকার?",
  "Price কত রাখা যায়?",
  "সব Information কোথায় পাবো?",
];

const FEATURES = [
  "500+ restaurant menu references",
  "Search thousands of food items",
  "Category-wise browsing",
  "Price references & comparisons",
  "One menu builder workspace",
];

export function ProblemSection() {
  return (
    <section id="how-it-works" className="py-16 sm:py-20 bg-gray-50/70" data-purpose="problem-vs-solution">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-6 sm:p-10 lg:p-12 mb-8">
          
          {/* 2-Column: Problem Graphic + Pain-point Question Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center mb-10">
            {/* Left: Graphic/Image */}
            <div className="lg:col-span-6">
              <div className="relative rounded-2xl overflow-hidden shadow-md border border-gray-100 bg-gray-50 aspect-[4/3] group">
                <Image
                  src="/images/landing/menu-research-struggle.png"
                  alt="Restaurant Menu Research Struggle"
                  fill
                  className="object-cover rounded-2xl transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              </div>
            </div>

            {/* Right: 5 Pain-point Question Cards */}
            <div className="lg:col-span-6 space-y-3">
              {QUESTIONS.map((question, idx) => (
                <motion.div
                  key={question}
                  initial={{ opacity: 0, x: 15 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: idx * 0.08 }}
                  className="p-3.5 sm:p-4 rounded-xl border border-gray-100 bg-white hover:border-orange-200 shadow-sm transition-all flex items-center gap-3.5"
                >
                  <span className="w-7 h-7 rounded-full bg-red-50 text-[#FF5A36] flex items-center justify-center font-bold text-xs shrink-0 border border-red-100">
                    ?
                  </span>
                  <span className="text-gray-800 font-semibold text-sm sm:text-base">
                    {question}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Solution Header & Feature Badges */}
          <div className="text-center max-w-4xl mx-auto pt-6 border-t border-gray-100">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-950 tracking-tight mb-4">
              <span className="text-[#FF5A36] font-sans">MenuSnap</span> সবকিছু এক জায়গায় নিয়ে আসে।
            </h2>

            {/* Feature Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-700 max-w-3xl mx-auto">
              {FEATURES.map((feat) => (
                <span
                  key={feat}
                  className="inline-flex items-center gap-1.5 sm:gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full font-medium shadow-xs"
                >
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{feat}</span>
                </span>
              ))}
            </div>

            {/* Bottom CTA Action */}
            <div className="mt-8">
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FF5A36] via-red-600 to-[#FF4D4D] hover:from-[#E04826] hover:to-red-700 text-white font-semibold text-sm sm:text-base px-8 py-3.5 rounded-full shadow-lg shadow-[#FF5A36]/20 hover:shadow-[#FF5A36]/35 hover:-translate-y-0.5 transition-all"
              >
                <span>Start building</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// Named alias for backwards compatibility
export { ProblemSection as ProblemSolutionBento };
export default ProblemSection;
