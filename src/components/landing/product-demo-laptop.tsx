"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Laptop,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface ProductDemoLaptopProps {
  videoUrl?: string;
  mobileVideoUrl?: string;
  poster?: string;
  mobilePoster?: string;
  title?: string;
  mobileTitle?: string;
  badge?: string;
  mobileBadge?: string;
  className?: string;
}

export function ProductDemoLaptop({
  videoUrl = "https://v1.pinimg.com/videos/iht/expMp4/79/86/b7/7986b72a3da0ea79fcd1c5c482eefecf_720w.mp4",
  mobileVideoUrl = "/videos/demo%20mobile%20version.MOV",
  poster = "https://i.pinimg.com/videos/thumbnails/originals/79/86/b7/7986b72a3da0ea79fcd1c5c482eefecf.0000000.jpg",
  mobilePoster,
  title = "MenuSnap Workflow Demo",
  mobileTitle = "MenuSnap Mobile Experience",
  badge = "Studio & Menu Intelligence",
  mobileBadge = "Mobile Experience",
  className = "",
}: ProductDemoLaptopProps) {
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("0:00");
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    setProgress(0);
    setCurrentTime("0:00");
    setDuration("0:00");
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    }
  }, [deviceMode, videoUrl, mobileVideoUrl, isMuted]);

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return "0:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      if (total) {
        setProgress((current / total) * 100);
        setCurrentTime(formatTime(current));
        setDuration(formatTime(total));
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {});
      }
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const target = containerRef.current || videoRef.current;
    if (target) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if (target.requestFullscreen) {
        target.requestFullscreen().catch(() => {});
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    setProgress(newProgress);
    if (videoRef.current && videoRef.current.duration) {
      videoRef.current.currentTime = (newProgress / 100) * videoRef.current.duration;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, ease: "easeOut" }}
      className={`w-full mx-auto px-2 sm:px-4 ${className}`}
    >
      {/* Device Viewport Toggle (Desktop vs Mobile) */}
      <div className="flex items-center justify-center mb-6 sm:mb-8">
        <div className="inline-flex items-center p-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 shadow-inner">
          <button
            type="button"
            onClick={() => setDeviceMode("desktop")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none",
              deviceMode === "desktop"
                ? "bg-[#FF5A36] text-white shadow-md shadow-orange-500/25 scale-[1.02]"
                : "text-white/70 hover:text-white hover:bg-white/5"
            )}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Desktop Version</span>
          </button>
          <button
            type="button"
            onClick={() => setDeviceMode("mobile")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none",
              deviceMode === "mobile"
                ? "bg-[#FF5A36] text-white shadow-md shadow-orange-500/25 scale-[1.02]"
                : "text-white/70 hover:text-white hover:bg-white/5"
            )}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile Version</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {deviceMode === "desktop" ? (
          /* ================= DESKTOP LAPTOP MOCKUP ================= */
          <motion.div
            key="desktop-mode"
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -12 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[1060px] mx-auto"
          >
            {/* Laptop Upper Display Lid / Aluminum Bezel */}
            <div className="bg-[#18191b] p-2.5 sm:p-3.5 rounded-t-[26px] sm:rounded-t-[36px] shadow-[0_30px_90px_rgba(0,0,0,0.4)] border-t border-x border-neutral-700/60 relative">
              {/* Top Webcam Notch & Status Light */}
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 mx-auto mb-2 border border-neutral-700/60 flex items-center justify-center">
                <span className="w-1 h-1 rounded-full bg-emerald-500/80 animate-pulse" />
              </div>

              {/* Screen Viewport with Exact Video Aspect Ratio (16:9) */}
              <div
                ref={containerRef}
                onMouseEnter={() => setShowControls(true)}
                onMouseLeave={() => setShowControls(false)}
                className="relative aspect-video w-full rounded-t-[16px] sm:rounded-t-[24px] overflow-hidden bg-black border border-neutral-800 flex flex-col justify-between select-none group"
              >
                <video
                  ref={videoRef}
                  src={videoUrl}
                  poster={poster}
                  loop
                  muted={isMuted}
                  autoPlay
                  playsInline
                  preload="auto"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleTimeUpdate}
                  onClick={togglePlay}
                  className="absolute inset-0 w-full h-full object-contain bg-black z-0 cursor-pointer"
                />

                {/* Top Info Bar Overlay */}
                <div
                  className={`relative z-20 p-3 sm:p-4 flex items-center justify-between text-white drop-shadow-md transition-opacity duration-300 pointer-events-none ${
                    !isPlaying || showControls ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <div className="flex items-center gap-2 pointer-events-auto">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[11px] font-semibold text-white shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-[#FF5A36] animate-pulse" />
                      <span>{badge}</span>
                    </div>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-[10px] font-mono text-white/90">
                      1080p HD
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pointer-events-auto">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/90 hover:text-white cursor-pointer transition-all active:scale-95"
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Central Big Play/Pause Button Overlay */}
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/65 hover:bg-[#FF5A36] text-white flex items-center justify-center shadow-2xl backdrop-blur-md border border-white/30 transition-all transform hover:scale-110 pointer-events-auto cursor-pointer ${
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

                {/* Bottom Video Controls & Scrubber Overlay */}
                <div
                  className={`relative z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 sm:p-4 text-white transition-opacity duration-300 ${
                    !isPlaying || showControls ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {/* Scrubber Progress Track */}
                  <div
                    onClick={handleSeek}
                    className="w-full bg-white/25 hover:bg-white/40 h-1.5 rounded-full mb-2.5 overflow-hidden cursor-pointer transition-all"
                  >
                    <div
                      className="bg-[#FF5A36] h-full rounded-full transition-all duration-150"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Bottom Controls Row */}
                  <div className="flex items-center justify-between text-xs text-neutral-300">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="hover:text-white transition-colors cursor-pointer"
                      >
                        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                      </button>
                      <button
                        type="button"
                        onClick={toggleMute}
                        className="hover:text-white transition-colors cursor-pointer"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <span className="font-mono text-[11px] text-neutral-300">
                        {currentTime} / {duration}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="hidden sm:inline-block text-neutral-400 font-medium">
                        {title}
                      </span>
                      <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="p-1 rounded hover:bg-white/20 text-neutral-300 hover:text-white transition-all cursor-pointer"
                        title="Fullscreen"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Laptop Bottom Aluminum Base & Opening Notch Lip */}
            <div className="bg-[#cfd3d8] h-3.5 sm:h-4 rounded-b-[18px] sm:rounded-b-[24px] shadow-lg border-t border-neutral-300/80 mx-auto w-[102%] -ml-[1%] relative">
              <div className="w-20 h-1 bg-neutral-400/70 rounded-full mx-auto" />
            </div>

            {/* Ambient Floor Shadow under the Laptop */}
            <div className="w-[85%] h-5 bg-black/20 blur-xl rounded-full mx-auto -mt-1" />
          </motion.div>
        ) : (
          /* ================= MOBILE PHONE MOCKUP ================= */
          <motion.div
            key="mobile-mode"
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -12 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[340px] sm:max-w-[380px] mx-auto"
          >
            {/* Phone Outer Shell */}
            <div className="bg-[#18191b] p-3 sm:p-3.5 rounded-[48px] sm:rounded-[54px] shadow-[0_35px_100px_rgba(0,0,0,0.65)] border-2 border-neutral-700/70 relative">
              {/* Dynamic Island / Speaker Pill */}
              <div className="w-24 sm:w-28 h-5 rounded-full bg-black mx-auto mb-2.5 border border-neutral-800 flex items-center justify-end px-3 gap-1.5 shadow-inner">
                <span className="w-2 h-2 rounded-full bg-[#111] border border-neutral-700/60" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-900/60" />
              </div>

              {/* Screen Viewport with Vertical Aspect Ratio (9:19.5) */}
              <div
                ref={containerRef}
                onMouseEnter={() => setShowControls(true)}
                onMouseLeave={() => setShowControls(false)}
                className="relative aspect-[9/19.5] w-full rounded-[38px] sm:rounded-[44px] overflow-hidden bg-black border border-neutral-800 flex flex-col justify-between select-none group"
              >
                <video
                  ref={videoRef}
                  src={mobileVideoUrl}
                  poster={mobilePoster}
                  loop
                  muted={isMuted}
                  autoPlay
                  playsInline
                  preload="auto"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleTimeUpdate}
                  onClick={togglePlay}
                  className="absolute inset-0 w-full h-full object-cover bg-black z-0 cursor-pointer"
                />

                {/* Top Info Bar Overlay */}
                <div
                  className={`relative z-20 p-3 sm:p-4 flex items-center justify-between text-white drop-shadow-md transition-opacity duration-300 pointer-events-none ${
                    !isPlaying || showControls ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <div className="flex items-center gap-1.5 pointer-events-auto">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-semibold text-white shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A36] animate-pulse" />
                      <span>{mobileBadge}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pointer-events-auto">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/90 hover:text-white cursor-pointer transition-all active:scale-95"
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Central Big Play/Pause Button Overlay */}
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className={`w-14 h-14 rounded-full bg-black/65 hover:bg-[#FF5A36] text-white flex items-center justify-center shadow-2xl backdrop-blur-md border border-white/30 transition-all transform hover:scale-110 pointer-events-auto cursor-pointer ${
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

                {/* Bottom Video Controls & Scrubber Overlay */}
                <div
                  className={`relative z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 sm:p-4 text-white transition-opacity duration-300 ${
                    !isPlaying || showControls ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {/* Scrubber Progress Track */}
                  <div
                    onClick={handleSeek}
                    className="w-full bg-white/25 hover:bg-white/40 h-1.5 rounded-full mb-2 overflow-hidden cursor-pointer transition-all"
                  >
                    <div
                      className="bg-[#FF5A36] h-full rounded-full transition-all duration-150"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Bottom Controls Row */}
                  <div className="flex items-center justify-between text-[11px] text-neutral-300">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="hover:text-white transition-colors cursor-pointer"
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      </button>
                      <span className="font-mono text-[10px] text-neutral-300">
                        {currentTime} / {duration}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      className="p-1 rounded hover:bg-white/20 text-neutral-300 hover:text-white transition-all cursor-pointer"
                      title="Fullscreen"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Home Indicator Bar */}
              <div className="w-24 h-1 bg-white/30 rounded-full mx-auto mt-2.5" />
            </div>

            {/* Floor Shadow */}
            <div className="w-[70%] h-6 bg-black/40 blur-xl rounded-full mx-auto -mt-2" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
