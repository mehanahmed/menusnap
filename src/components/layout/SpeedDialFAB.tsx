"use client";

import { useState } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, MessageCircle } from 'lucide-react';
import { usePreferences } from '@/context/PreferencesContext';

interface SpeedDialFABProps {
  phoneNumber?: string;
}

export function SpeedDialFAB({ phoneNumber = "8801805561178" }: SpeedDialFABProps = {}): ReactNode {
  const [showBubble, setShowBubble] = useState(true);
  const { language } = usePreferences();

  const handleOpenWhatsApp = () => {
    const message = encodeURIComponent("Hello MenuSnap, I need assistance with my digital menu.");
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  // Greeting text based on language (Unicode escaped for safe Bengali rendering)
  const greetingText =
    language === 'bn'
      ? '\u09b8\u09cd\u09af\u09be\u09b0, \u0995\u09bf\u09ad\u09be\u09ac\u09c7 \u09b8\u09b9\u09af\u09cb\u0997\u09bf\u09a4\u09be \u0995\u09b0\u09a4\u09c7 \u09aa\u09be\u09b0\u09bf?'
      : 'Hello! How can I assist you today?';

  return (
    <div className="fixed top-auto bottom-40 right-4 flex items-center gap-2.5 z-50 md:bottom-4 print:hidden">
      {/* Animated Speech Bubble */}
      <AnimatePresence>
        {showBubble && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: 10 }}
            transition={{ duration: 0.25 }}
            onClick={handleOpenWhatsApp}
            className="relative bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-3.5 py-2.5 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold max-w-[220px] cursor-pointer select-none group hover:shadow-2xl transition-all"
            title="Chat with us on WhatsApp"
          >
            {/* Close Button on Bubble */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowBubble(false);
              }}
              className="absolute -top-2 -left-2 w-5 h-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center border border-slate-300 dark:border-slate-700 shadow-xs transition-colors"
              aria-label="Close message"
            >
              <X className="w-3 h-3" />
            </button>

            {/* Message Content */}
            <div className="leading-snug pr-0.5 text-center">
              <span>{greetingText}</span>
            </div>

            {/* Pointer Arrow pointing to the avatar */}
            <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-l-[6px] border-l-white dark:border-l-slate-900" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Circular AI Avatar Button with Direct WhatsApp Action */}
      <div className="relative">
        <motion.button
          onClick={handleOpenWhatsApp}
          className="relative rounded-full h-12 w-12 md:h-14 md:w-14 shadow-2xl flex items-center justify-center overflow-hidden border-2 border-white dark:border-slate-800 ring-2 ring-emerald-500/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-transform duration-200 bg-background cursor-pointer"
          aria-label="Chat with Support on WhatsApp"
          animate={{
            scale: [1, 1.04, 1],
            y: [0, -3, 0],
          }}
          transition={{
            duration: 2.2,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "mirror",
          }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
        >
          <div className="w-full h-full relative">
            <Image
              src="/assets/ai-avatar.png"
              alt="AI Support Assistant"
              fill
              sizes="(max-width: 768px) 48px, 56px"
              className="object-cover"
              priority
            />
          </div>
        </motion.button>

        {/* Active Online Status Badge (Top Right) */}
        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 pointer-events-none z-10" title="Online">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-xs"></span>
        </span>

        {/* WhatsApp Brand Badge (Bottom Right) */}
        <div
          onClick={handleOpenWhatsApp}
          className="absolute -bottom-1 -right-1 w-5 h-5 md:w-5.5 md:h-5.5 rounded-full bg-[#25D366] text-white flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm cursor-pointer z-10 hover:scale-110 transition-transform"
          title="Chat on WhatsApp"
        >
          <MessageCircle className="w-3 h-3 md:w-3.5 md:h-3.5 fill-white stroke-none" />
        </div>
      </div>
    </div>
  );
}
