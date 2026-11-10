"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { useClientAuth } from "@/hooks/use-client-auth";
import { Logo } from "@/components/landing/Logo";

export interface NavItem {
  label: string;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Free Guide", href: "/free-guide/" },
  { label: "FAQ", href: "#faq" },
];

export interface NavbarProps {
  dark?: boolean;
  theme?: "light" | "dark";
  landingSource?: "v2" | "default" | "parlor";
}

export function Navbar({ dark = false, theme = "light", landingSource }: NavbarProps) {
  const isDark = theme === "dark" || dark;
  const pathname = usePathname();
  const currentPath = (pathname || "").replace(/\/$/, "") || "/";
  const isDirectV2 = currentPath === "/v2" || currentPath === "/landingv2";
  const isDirectParlor = currentPath === "/parlor" || currentPath === "/parlour";

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [sourceMode, setSourceMode] = useState<"v2" | "default" | "parlor">(
    landingSource || (isDirectParlor ? "parlor" : isDirectV2 ? "v2" : "default")
  );
  const { isClientLoggedIn, clientLoading } = useClientAuth();

  useEffect(() => {
    setMounted(true);
    if (typeof document !== "undefined" && document.cookie.includes("admin_session=")) {
      setIsAdminLoggedIn(true);
    }
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Set cookie and track landing page source (v2 vs default vs parlor) across page navigations
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (landingSource) {
      setSourceMode(landingSource);
      try {
        document.cookie = `landing_source=${landingSource}; path=/; max-age=2592000; SameSite=Lax`;
        sessionStorage.setItem("menusnap_landing_source", landingSource);
      } catch {}
      return;
    }

    if (isDirectParlor) {
      try {
        document.cookie = "landing_source=parlor; path=/; max-age=2592000; SameSite=Lax";
        sessionStorage.setItem("menusnap_landing_source", "parlor");
      } catch {}
      setSourceMode("parlor");
    } else if (isDirectV2) {
      try {
        document.cookie = "landing_source=v2; path=/; max-age=2592000; SameSite=Lax";
        sessionStorage.setItem("menusnap_landing_source", "v2");
      } catch {}
      setSourceMode("v2");
    } else if (currentPath === "/") {
      try {
        document.cookie = "landing_source=default; path=/; max-age=2592000; SameSite=Lax";
        sessionStorage.setItem("menusnap_landing_source", "default");
      } catch {}
      setSourceMode("default");
    } else {
      // Subpages like /free-guide or /login
      const params = new URLSearchParams(window.location.search);
      const fromParam = params.get("from") || params.get("ref");
      let stored: string | null = null;
      try {
        stored = sessionStorage.getItem("menusnap_landing_source");
      } catch {}
      const cookieMatch = typeof document !== "undefined" ? document.cookie.match(/landing_source=([^;]+)/) : null;
      const cookieVal = cookieMatch ? cookieMatch[1] : null;
      const ref = typeof document !== "undefined" ? document.referrer : "";

      const cameFromParlor =
        fromParam === "parlor" ||
        fromParam === "parlour" ||
        stored === "parlor" ||
        stored === "parlour" ||
        cookieVal === "parlor" ||
        cookieVal === "parlour" ||
        ref.includes("/parlor") ||
        ref.includes("/parlour");

      const cameFromV2 =
        !cameFromParlor &&
        (fromParam === "v2" ||
         stored === "v2" ||
         cookieVal === "v2" ||
         ref.includes("/v2") ||
         ref.includes("/landingv2"));

      const mode = cameFromParlor ? "parlor" : cameFromV2 ? "v2" : "default";
      setSourceMode(mode);
      try {
        document.cookie = `landing_source=${mode}; path=/; max-age=2592000; SameSite=Lax`;
        sessionStorage.setItem("menusnap_landing_source", mode);
      } catch {}
    }
  }, [currentPath, isDirectV2, isDirectParlor, landingSource]);

  const baseLandingPath = sourceMode === "parlor" ? "/parlor" : sourceMode === "v2" ? "/v2/" : "/";

  const loggedIn = mounted && !clientLoading && (isClientLoggedIn || isAdminLoggedIn);
  const dashboardHref = isClientLoggedIn ? "/dashboard/" : "/m-admin/";

  /**
   * Resolves href so anchor links work correctly and stay in the respective landing version:
   * - If link is "/free-guide":
   *     - if from parlor: "/free-guide/?from=parlor"
   *     - if from v2: "/free-guide/?from=v2"
   *     - if from default: "/free-guide/"
   * - If link starts with "#" (e.g. #how-it-works, #pricing, #faq):
   *     - if on current landing page, keeps "#..." for smooth in-page scroll.
   *     - if on subpage (like /free-guide/):
   *         - if parlor context: "/parlor#..."
   *         - if v2 context: "/v2/#..."
   *         - if default context: "/#..."
   */
  const resolveHref = (href: string) => {
    if (href === "/free-guide" || href === "/free-guide/") {
      return sourceMode === "parlor"
        ? "/free-guide/?from=parlor"
        : sourceMode === "v2"
        ? "/free-guide/?from=v2"
        : "/free-guide/";
    }

    if (!href.startsWith("#")) return href;

    if (currentPath === "/" && sourceMode === "default") return href;
    if (isDirectV2 && sourceMode === "v2") return href;
    if (isDirectParlor && sourceMode === "parlor") return href;

    if (sourceMode === "parlor") return `/parlor${href}`;
    if (sourceMode === "v2") return `/v2/${href}`;
    return `/${href}`;
  };

  /**
   * Resolves logo link:
   * - If on default "/", stays on "/" (smooth scroll to top)
   * - If on v2, stays on "/v2/" (smooth scroll to top)
   * - If on parlor, stays on "/parlor" (smooth scroll to top)
   * - If on subpage (like /free-guide/):
   *     - if parlor context: navigates to "/parlor"
   *     - if v2 context: navigates to "/v2/"
   *     - if default context: navigates to "/"
   */
  const resolveLogoHref = () => {
    if (currentPath === "/" || isDirectV2 || isDirectParlor) {
      if (isDirectParlor) return "/parlor";
      return isDirectV2 ? "/v2/" : "/";
    }
    return baseLandingPath;
  };

  const handleLogoClick = () => {
    if (currentPath === "/" || isDirectV2 || isDirectParlor) {
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? isDark
            ? "bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] py-3"
            : "bg-white/90 backdrop-blur-md border-b border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] py-3"
          : "bg-transparent py-4 sm:py-5"
      }`}
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href={resolveLogoHref()}
          onClick={handleLogoClick}
          className="flex items-center group select-none cursor-pointer"
          aria-label="MenuSnap"
        >
          <Logo dark={isDark} />
        </Link>

        {/* Center Nav Items (Desktop Pill) */}
        <nav
          className={`hidden md:flex items-center gap-7 lg:gap-8 px-5 py-2 rounded-full backdrop-blur-sm transition-colors ${
            isDark
              ? "bg-white/10 border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
              : "bg-white/80 border border-gray-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
          }`}
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={resolveHref(item.href)}
              className={`text-[13.5px] lg:text-[14px] font-medium transition-colors cursor-pointer select-none ${
                isDark
                  ? "text-gray-200 hover:text-white"
                  : "text-gray-600 hover:text-gray-950"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right CTA / Login (Desktop) */}
        <div className="hidden md:flex items-center gap-4">
          {!loggedIn && (
            <Link
              href="/login/"
              className={`text-[14px] font-medium transition-colors px-3 py-1.5 cursor-pointer select-none ${
                isDark
                  ? "text-gray-200 hover:text-white"
                  : "text-gray-700 hover:text-gray-950"
              }`}
            >
              Login
            </Link>
          )}
          {loggedIn ? (
            <Link
              href={dashboardHref}
              className="inline-flex items-center gap-1.5 bg-[#FF5A36] hover:bg-[#e84d2a] text-white text-[13.5px] font-semibold px-4 sm:px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md hover:shadow-orange-500/20 transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href={resolveHref("#pricing")}
              onClick={() => trackEvent("hero_cta_clicked", { source: "navbar" })}
              className="inline-flex items-center gap-1.5 bg-[#FF5A36] hover:bg-[#e84d2a] text-white text-[13.5px] font-semibold px-4 sm:px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md hover:shadow-orange-500/20 transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>Get MenuSnap</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="md:hidden flex items-center">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2 rounded-xl transition-colors focus:outline-none ${
              isDark
                ? "text-gray-200 hover:text-white hover:bg-white/10"
                : "text-gray-700 hover:text-gray-950 hover:bg-gray-100/80"
            }`}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className={`md:hidden px-5 pt-3 pb-6 shadow-xl overflow-hidden border-b ${
              isDark
                ? "bg-[#0e0e0e] border-white/10 text-white"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="flex flex-col space-y-1.5">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  href={resolveHref(item.href)}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2.5 rounded-lg text-[15px] font-medium transition-colors ${
                    isDark
                      ? "text-gray-200 hover:bg-white/5 hover:text-white"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-950"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div
              className={`pt-4 mt-3 border-t flex flex-col gap-2.5 ${
                isDark ? "border-white/10" : "border-gray-100"
              }`}
            >
              {!loggedIn && (
                <Link
                  href="/login/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full text-center py-2.5 text-[14.5px] font-semibold rounded-xl transition-colors ${
                    isDark
                      ? "text-gray-200 hover:bg-white/5 hover:text-white"
                      : "text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  Login
                </Link>
              )}
              {loggedIn ? (
                <Link
                  href={dashboardHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 bg-[#FF5A36] text-white text-[14px] font-semibold py-3 rounded-xl shadow-md transition-all active:scale-[0.98]"
                >
                  <span>Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  href={resolveHref("#pricing")}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    trackEvent("hero_cta_clicked", { source: "mobile_navbar" });
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-[#FF5A36] text-white text-[14px] font-semibold py-3 rounded-xl shadow-md transition-all active:scale-[0.98]"
                >
                  <span>Get MenuSnap</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
