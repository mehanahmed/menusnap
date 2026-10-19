"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MapPin } from "lucide-react";

export function ParlorFooter() {
  const pathname = usePathname();
  const currentPath = (pathname || "").replace(/\/$/, "") || "/";
  const isOnParlorPage = currentPath === "/parlor" || currentPath === "/parlour";

  const handleNavClick = (href: string, e: React.MouseEvent) => {
    if (href.startsWith("#")) {
      e.preventDefault();
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
    <footer className="w-full bg-[#111111] text-gray-400 py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
      <div className="max-w-[1240px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 lg:gap-12 mb-12">
          {/* Brand Info (Span 2) */}
          <div className="md:col-span-2 space-y-4">
            <Link
              href="/parlor"
              onClick={handleLogoClick}
              className="inline-flex items-center group select-none cursor-pointer"
            >
              <Image
                src="/menusnap-logo-white.png"
                alt="MenuSnap Parlour Logo"
                width={150}
                height={32}
                className="h-7 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </Link>

            <p className="text-base font-bold text-gray-200">
              Research Less. Build Smarter.
            </p>

            <p className="text-xs text-gray-400 leading-relaxed max-w-sm font-sans">
              Parlour Menu Research & Service Management SaaS platform designed for beauty entrepreneurs and parlour owners across Bangladesh.
            </p>

            <div className="text-[11px] text-gray-500 pt-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#FF5A36]" />
              <span>Proudly built for Bangladesh&apos;s beauty & lifestyle industry.</span>
            </div>
          </div>

          {/* Column 1: Product */}
          <div className="space-y-3 text-xs">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Product
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#how-it-works"
                  onClick={(e) => handleNavClick("#how-it-works", e)}
                  className="hover:text-white transition-colors"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/free-design" className="hover:text-white transition-colors">
                  Free Menu Design
                </Link>
              </li>
              <li>
                <Link href="/free-guide/?from=parlor" className="hover:text-white transition-colors">
                  Free Guide
                </Link>
              </li>
              <li>
                <Link
                  href="#pricing"
                  onClick={(e) => handleNavClick("#pricing", e)}
                  className="hover:text-white transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="#faq"
                  onClick={(e) => handleNavClick("#faq", e)}
                  className="hover:text-white transition-colors"
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Account */}
          <div className="space-y-3 text-xs">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Account
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/login/" className="hover:text-white transition-colors">
                  Client Login
                </Link>
              </li>
              <li>
                <Link
                  href="#pricing"
                  onClick={(e) => handleNavClick("#pricing", e)}
                  className="hover:text-white transition-colors"
                >
                  Get Started
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Support & Help
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Trust */}
          <div className="space-y-3 text-xs">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/refund" className="hover:text-white transition-colors">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright Strip */}
        <div className="pt-8 border-t border-gray-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© {new Date().getFullYear()} MenuSnap. All rights reserved.</p>
          <p className="text-[11px]">Crafted with care for beauty entrepreneurs.</p>
        </div>
      </div>
    </footer>
  );
}
