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

export const PARLOR_NAV_ITEMS: NavItem[] = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Free Guide", href: "/free-guide/?from=parlor" },
  { label: "FAQ", href: "#faq" },
];

export function ParlorNavbar() {
  const pathname = usePathname();
  const currentPath = (pathname || "").replace(/\/$/, "") || "/";
  const isOnParlorPage = currentPath === "/parlor" || currentPath === "/parlour";

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
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

  // Set parlour landing source cookie & sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      document.cookie = "landing_source=parlor; path=/; max-age=2592000; SameSite=Lax";
      sessionStorage.setItem("menusnap_landing_source", "parlor");
    } catch {}
  }, []);

  const loggedIn = mounted && !clientLoading && (isClientLoggedIn || isAdminLoggedIn);
  const dashboardHref = isClientLoggedIn ? "/dashboard/" : "/m-admin/";

  const handleNavClick = (href: string, e: React.MouseEvent) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      setMobileMenuOpen(false);
      if (isOnParlorPage) {
        const id = href.replace("#", "");
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
          window.history.pushState(null, "", href);
        }
      } else {
        window.location.href = `/parlor${href}`;
      }
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    if (isOnParlorPage) {
      e.preventDefault();
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        window.history.pushState(null, "", "/parlor");
      }
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-md border-b border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] py-3"
          : "bg-transparent py-4 sm:py-5"
      }`}
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo - strictly stays on /parlor */}
        <Link
          href="/parlor"
          onClick={handleLogoClick}
          className="flex items-center group select-none cursor-pointer"
          aria-label="MenuSnap Parlour"
        >
          <Logo />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {PARLOR_NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={(e) => handleNavClick(item.href, e)}
              className="px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer text-gray-700 hover:text-gray-900 hover:bg-gray-100/70"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {loggedIn ? (
            <Link
              href={dashboardHref}
              className="px-4 py-2 text-sm font-bold text-white bg-[#FF5A36] hover:bg-[#e64c29] rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login/"
                onClick={() => trackEvent("parlor_nav_login_clicked")}
                className="px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors text-gray-700 hover:text-gray-900 hover:bg-gray-100/70"
              >
                Login
              </Link>
              <Link
                href="#pricing"
                onClick={(e) => handleNavClick("#pricing", e)}
                className="px-5 py-2.5 text-sm font-bold text-white bg-[#FF5A36] hover:bg-[#e64c29] rounded-xl transition-all shadow-[0_2px_10px_rgba(255,90,54,0.25)] hover:shadow-[0_4px_16px_rgba(255,90,54,0.35)] flex items-center gap-1.5 active:scale-[0.98] cursor-pointer"
              >
                <span>Start Building</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Trigger */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg transition-colors text-gray-800 hover:bg-gray-100"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-b border-gray-200 bg-white/95 backdrop-blur-xl px-4 pt-3 pb-6 shadow-xl"
          >
            <div className="flex flex-col gap-1">
              {PARLOR_NAV_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleNavClick(item.href, e)}
                  className="px-3.5 py-2.5 text-sm font-semibold rounded-lg text-gray-800 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  {item.label}
                </Link>
              ))}

              <div className="pt-3 mt-2 border-t border-gray-100 flex flex-col gap-2">
                {loggedIn ? (
                  <Link
                    href={dashboardHref}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-3 text-center text-sm font-bold text-white bg-[#FF5A36] rounded-xl shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <span>Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login/"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full py-2.5 text-center text-sm font-semibold rounded-lg text-gray-800 hover:bg-gray-50 border border-gray-200"
                    >
                      Login
                    </Link>
                    <Link
                      href="#pricing"
                      onClick={(e) => handleNavClick("#pricing", e)}
                      className="w-full py-3 text-center text-sm font-bold text-white bg-[#FF5A36] hover:bg-[#e64c29] rounded-xl shadow-md flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      <span>Start Building</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
