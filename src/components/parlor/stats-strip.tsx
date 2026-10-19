"use client";

import React from "react";
import { motion } from "framer-motion";

interface StatItem {
  value: string;
  label: string;
  sublabel?: string;
  highlight?: boolean;
}

const STATS: StatItem[] = [
  {
    value: "500+",
    label: "Parlour Menus",
  },
  {
    value: "1,000+",
    label: "Verified Services",
    highlight: true,
  },
  {
    value: "20+",
    label: "Service Categories",
  },
  {
    value: "One Platform",
    label: "to Build Your Parlour Menu",
    highlight: true,
  },
];

export function ParlorStatsStrip() {
  const borderClasses = [
    "border-b sm:border-b lg:border-b-0 sm:border-r border-gray-100",
    "border-b sm:border-b lg:border-b-0 lg:border-r border-gray-100",
    "border-b sm:border-b-0 sm:border-r border-gray-100",
    "",
  ];

  return (
    <section className="w-full bg-white py-8 sm:py-12 px-4 sm:px-6 lg:px-8 border-b border-gray-100">
      <div className="max-w-[1240px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                className={`flex flex-col p-5 sm:p-6 lg:p-7 hover:bg-pink-50/20 transition-colors group ${borderClasses[i] || ""}`}
              >
                <span
                  className={`text-3xl sm:text-4xl lg:text-[36px] font-black tracking-tight leading-none mb-2 sm:mb-2.5 ${
                    stat.highlight ? "text-[#FF5A36]" : "text-gray-900"
                  }`}
                >
                  {stat.value}
                </span>
                <span className="text-sm sm:text-[15px] font-bold text-gray-800 leading-snug">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
