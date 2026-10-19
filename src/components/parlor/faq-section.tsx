"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

interface FAQItem {
  q: string;
  a: string;
}

const PARLOR_FAQ_LIST: FAQItem[] = [
  {
    q: "MenuSnap Parlour কী?",
    a: "MenuSnap Parlour হলো বিউটি পার্লার ওনারদের জন্য তৈরি Menu Research & Service Management SaaS প্ল্যাটফর্ম। এর মাধ্যমে আপনি বাংলাদেশের 500+ জনপ্রিয় পার্লারের মেন্যু ও প্রাইসিং রেফারেন্স দেখতে পারবেন, Facial, Hair, Makeup ও Spa সার্ভিসের বিবরণ ও রেট রিসার্চ করতে পারবেন এবং আপনার নিজস্ব পার্লারের কমপ্লিট সার্ভিস মেন্যু সাজিয়ে প্রিন্ট বা এক্সপোর্ট করতে পারবেন।",
  },
  {
    q: "MenuSnap-এ পার্লারের কী কী সার্ভিস যুক্ত আছে?",
    a: "MenuSnap-এ বর্তমানে ফেসিয়াল (২০০+ প্রকার), হেয়ার কাট, হেয়ার ট্রিটমেন্ট, রিবন্ডিং, ফেয়ার পলিশ, ব্রাইডাল মেকআপ, বডি ম্যাসাজ, হেয়ার স্পা, এক্সটেনশন, ওয়াক্সিং, থ্রেডিং, মেনিকিউর ও পেডিকিউরসহ সকল ধরণের সার্ভিসের বিস্তারিত বিবরণ ও রেট ইনডেক্স করা রয়েছে।",
  },
  {
    q: "আমি কি অন্য পার্লারের প্রাইস সরাসরি কপি করবো?",
    a: "না, হুবহু কপি করা রিকমেন্ডেড নয়। MenuSnap তৈরি করা হয়েছে আপনার রিসার্চ ও সঠিক সিদ্ধান্ত নেওয়ার সুবিধার্থে—যাতে আপনি বুঝতে পারেন বাজারে অন্যান্য পার্লারে কী ধরণের সার্ভিস ট্রেন্ড চলছে এবং গড় মূল্য কেমন। সেখান থেকে আইডিয়া নিয়ে আপনি আপনার সার্ভিস কোয়ালিটি অনুযায়ী বিক্রয়মূল্য নির্ধারণ করবেন।",
  },
  {
    q: "আমি কি নিজের পার্লারের নতুন সার্ভিস ও রেট যুক্ত করতে পারবো?",
    a: "হ্যাঁ, অবশ্যই! আপনি রিসার্চ করা সার্ভিসগুলো সিলেক্ট করতে পারবেন, নিজস্ব সার্ভিস কাস্টম নাম দিয়ে অ্যাড করতে পারবেন, নিজের ইচ্ছামতো প্রাইস ও ডেসক্রিপশন এডিট করতে পারবেন এবং ক্যাটাগরি অনুযায়ী সাজিয়ে নিতে পারবেন।",
  },
  {
    q: "সার্ভিস মেন্যু কি প্রিন্ট বা PDF আকারে ডাউনলোড করা যাবে?",
    a: "হ্যাঁ! Pro এবং Agency সাবস্ক্রিপশনে আপনি যেকোনো সময় আপনার তৈরি করা সম্পূর্ণ পার্লার সার্ভিস মেন্যুটি প্রিন্ট-রেডি PDF এবং Excel স্প্রেডশিট আকারে ওয়ান-ক্লিকে ডাউনলোড করে নিতে পারবেন।",
  },
  {
    q: "Agency Plan কাদের জন্য উপযোগী?",
    a: "Agency Plan তৈরি করা হয়েছে বিউটি কনসালটেন্ট, ব্র্যান্ডিং ডিজাইনার এবং চেইন পার্লার ও একাধিক ব্রাঞ্চ চালানো ওনারদের জন্য, যারা একাধিক পার্লারের মেন্যু প্রজেক্ট একসাথে তৈরি ও পরিচালনা করতে চান।",
  },
  {
    q: "সাবস্ক্রিপশনের পেমেন্ট সিস্টেম কী?",
    a: "আপনি bKash, Nagad, Rocket বা যেকোনো কার্ড দিয়ে PayStation-এর মাধ্যমে নিরাপদে পেমেন্ট করতে পারবেন। পেমেন্ট কনফার্ম হওয়ার সাথে সাথেই ইনস্ট্যান্টলি আপনার অ্যাকাউন্ট এক্টিভ হয়ে যাবে।",
  },
];

export function ParlorFAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    const next = openIndex === idx ? null : idx;
    setOpenIndex(next);
    if (next !== null) {
      trackEvent("parlor_faq_opened", { questionIndex: idx, question: PARLOR_FAQ_LIST[idx].q });
    }
  };

  return (
    <section id="faq" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-white border-t border-gray-100">
      <div className="max-w-[840px] mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-pink-50 border border-pink-200/80 text-[#FF5A36] text-xs font-bold uppercase tracking-wider mb-4">
            <HelpCircle className="w-3.5 h-3.5" />
            Frequently Asked Questions
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111827] font-bengali tracking-tight leading-tight mb-4">
            সাধারণ কিছু জিজ্ঞাসা ও উত্তর
          </h2>
          <p className="text-sm sm:text-base text-neutral-600 font-bengali max-w-xl mx-auto leading-relaxed">
            MenuSnap Parlour সম্পর্কে আপনার সব প্রশ্নের স্পষ্ট উত্তর এখানে দেওয়া হলো।
          </p>
        </div>

        <div className="space-y-3.5">
          {PARLOR_FAQ_LIST.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={faq.q}
                className="rounded-2xl border border-neutral-200/80 bg-white overflow-hidden transition-all shadow-xs hover:border-orange-200"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer select-none"
                  aria-expanded={isOpen}
                >
                  <span className="text-base sm:text-lg font-bold text-neutral-900 font-bengali leading-snug">
                    {faq.q}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full border border-neutral-200/80 flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 bg-[#FF5A36] text-white border-[#FF5A36]" : "bg-neutral-50 text-neutral-600"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-sm sm:text-base text-neutral-600 font-bengali leading-relaxed border-t border-neutral-100 pt-4">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
