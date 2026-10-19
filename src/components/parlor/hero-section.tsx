"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Scissors,
  ArrowDown
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";

interface ParlorHeroSectionProps {
  videoSrc?: string;
  videoPoster?: string;
}

export function ParlorHeroSection({
  videoSrc = "https://v1.pinimg.com/videos/iht/expMp4/f5/95/a4/f595a4da623d1223b1717a624b53940c_720w.mp4",
  videoPoster = "/images/hero-sf-wallpaper.jpg",
}: ParlorHeroSectionProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("00:00");
  const [duration, setDuration] = useState("00:00");
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          setIsPlaying(false);
        });
    }
  }, [videoSrc]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      setProgress((current / total) * 100);

      const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
      };

      setCurrentTime(formatTime(current));
      setDuration(formatTime(total));
    }
  };

  return (
    <section className="relative pt-28 sm:pt-36 pb-12 sm:pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#fdf2f8]/50 via-[#fdf4ff]/30 to-[#fdfbf7] overflow-hidden">
      {/* Floating Ambient Atmosphere */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <motion.div
          animate={{ x: [0, 15, 0], y: [0, -8, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-12 -left-20 w-[420px] h-[220px] opacity-40 blur-2xl bg-pink-100/70 rounded-full"
        />
        <motion.div
          animate={{ x: [0, -18, 0], y: [0, 10, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 -right-24 w-[460px] h-[240px] opacity-40 blur-2xl bg-orange-100/70 rounded-full"
        />
      </div>

      <div className="max-w-[1240px] mx-auto text-center flex flex-col items-center relative z-10">
        {/* Main Headline - Strictly Parlour (NO Salon) */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="text-3xl sm:text-5xl md:text-6xl lg:text-[62px] font-extrabold text-[#111827] font-bengali tracking-tight leading-[1.2] sm:leading-[1.18] mb-5 text-center max-w-4xl mx-auto"
        >
          আপনার <span className="text-[#FF5A36]">Parlour</span>-এর Menu বানানো এখন অনেক সহজ।
        </motion.h1>

        {/* Subtitle - Strictly Parlour (NO Salon) */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18 }}
          className="text-sm sm:text-base md:text-[17px] text-neutral-600 font-bengali max-w-2xl sm:max-w-3xl mx-auto text-center font-normal leading-relaxed sm:leading-[1.7] mb-8"
        >
          বাংলাদেশের 500+ জনপ্রিয় Parlour-এর Service ও Price Reference Explore করুন, Facial, Hair, Makeup ও Spa Services Search করুন এবং নিজের Parlour-এর Complete Service Menu তৈরি করুন।
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.24 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto mb-10 sm:mb-14"
        >
          {/* Primary CTA */}
          <Link
            href="#pricing"
            onClick={(e) => {
              trackEvent("parlor_hero_cta_clicked", { button: "primary_pricing" });
              const el = document.getElementById("pricing");
              if (el) {
                e.preventDefault();
                el.scrollIntoView({ behavior: "smooth" });
                window.history.pushState(null, "", "#pricing");
              }
            }}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#FF5A36] hover:bg-[#e64c29] text-white font-bold text-sm shadow-[0_4px_16px_rgba(255,90,54,0.3)] hover:shadow-[0_6px_22px_rgba(255,90,54,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Scissors className="w-4 h-4 text-white" />
            <span>Start Building Parlour Menu</span>
          </Link>

          {/* Secondary CTA: Scroll to See MenuSnap in Action demo */}
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("demo") || document.getElementById("how-it-works");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-white/90 backdrop-blur-md border border-neutral-200/90 text-neutral-800 font-semibold text-sm shadow-sm hover:bg-neutral-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>See how MenuSnap works</span>
            <div className="w-4 h-4 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600">
              <ArrowDown className="w-2.5 h-2.5" />
            </div>
          </button>
        </motion.div>

        {/* Laptop Mockup with Inside Demo Video Player - Tags row removed */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.36 }}
          className="w-full max-w-[1040px] mx-auto"
        >
          {/* Laptop Outer Bezel */}
          <div className="bg-[#1e2022] p-2 sm:p-3 rounded-t-[28px] sm:rounded-t-[36px] shadow-[0_25px_70px_rgba(0,0,0,0.25)] border-t border-x border-neutral-700/60 relative">
            <div className="w-2 h-2 rounded-full bg-neutral-900 mx-auto mb-1.5 border border-neutral-700/50 flex items-center justify-center">
              <span className="w-0.5 h-0.5 rounded-full bg-pink-500/80 animate-pulse" />
            </div>

            {/* Laptop Screen Viewport */}
            <div
              onMouseEnter={() => setShowControls(true)}
              onMouseLeave={() => setShowControls(false)}
              className="relative aspect-[16/10] w-full rounded-t-[18px] sm:rounded-t-[24px] overflow-hidden bg-black border border-neutral-800 flex flex-col justify-between select-none group"
            >
              {videoSrc ? (
                <video
                  ref={videoRef}
                  src={videoSrc}
                  poster={videoPoster}
                  autoPlay
                  muted={isMuted}
                  playsInline
                  loop
                  preload="auto"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onLoadedMetadata={handleTimeUpdate}
                  onTimeUpdate={handleTimeUpdate}
                  className="absolute inset-0 w-full h-full object-cover z-0 cursor-pointer"
                  onClick={togglePlay}
                />
              ) : (
                <div className="absolute inset-0 z-0">
                  <Image
                    src={videoPoster}
                    alt="MenuSnap Parlour Demo"
                    fill
                    priority
                    className="object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-black/30" />
                </div>
              )}

              {/* Top Video Header Bar */}
              <div className="relative z-20 p-3 sm:p-4 flex items-center justify-between text-white drop-shadow-md">
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[11px] font-semibold text-white">
                    <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                    <span>Parlour Intelligence</span>
                  </div>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-[10px] font-mono">
                    1080p HD
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/90 hover:text-white cursor-pointer transition-all"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Center Play Button Overlay */}
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <button
                  type="button"
                  onClick={togglePlay}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/60 hover:bg-[#FF5A36] text-white flex items-center justify-center shadow-xl backdrop-blur-md border border-white/30 transition-all pointer-events-auto cursor-pointer ${
                    !isPlaying || showControls ? "opacity-100 scale-100" : "opacity-0 scale-95"
                  }`}
                  aria-label={isPlaying ? "Pause Video" : "Play Video"}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current translate-x-0.5" />
                  )}
                </button>
              </div>

              {/* Bottom Scrubber */}
              <div
                className={`relative z-20 bg-gradient-to-t from-black/80 to-transparent p-3 sm:p-4 text-white transition-opacity duration-200 ${
                  !isPlaying || showControls ? "opacity-100" : "opacity-0"
                }`}
              >
                <div className="w-full bg-white/25 h-1.5 rounded-full mb-2 overflow-hidden">
                  <div className="bg-[#FF5A36] h-full rounded-full" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-300">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={togglePlay} className="hover:text-white transition-colors cursor-pointer">
                      {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    </button>
                    <span className="font-mono text-[11px] text-neutral-300">
                      {currentTime} / {duration}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-neutral-300">MenuSnap Studio</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Laptop Base */}
          <div className="bg-[#cfd3d8] h-3.5 sm:h-4 rounded-b-[18px] sm:rounded-b-[24px] shadow-lg border-t border-neutral-300/80 mx-auto w-[102%] -ml-[1%] relative">
            <div className="w-20 h-1 bg-neutral-400/70 rounded-full mx-auto" />
          </div>
          <div className="w-[85%] h-5 bg-black/20 blur-xl rounded-full mx-auto -mt-1" />
        </motion.div>
      </div>
    </section>
  );
}
