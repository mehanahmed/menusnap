"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MapPin } from "lucide-react";

export function Footer({ landingSource }: { landingSource?: "v2" | "default" | "parlor" } = {}) {
  const pathname = usePathname();
  const currentPath = (pathname || "").replace(/\/$/, "") || "/";
  const isDirectV2 = currentPath === "/v2" || currentPath === "/landingv2";
  const isDirectParlor = currentPath === "/parlor" || currentPath === "/parlour";
  const [sourceMode, setSourceMode] = useState<"v2" | "default" | "parlor">(
    landingSource || (isDirectParlor ? "parlor" : isDirectV2 ? "v2" : "default")
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (landingSource) {
      setSourceMode(landingSource);
      return;
    }

    if (isDirectParlor) {
      setSourceMode("parlor");
    } else if (isDirectV2) {
      setSourceMode("v2");
    } else if (currentPath === "/") {
      setSourceMode("default");
    } else {
      const params = new URLSearchParams(window.location.search);
      const fromParam = params.get("from") || params.get("ref");
      const stored = sessionStorage.getItem("menusnap_landing_source");
      const cookieMatch = document.cookie.match(/landing_source=([^;]+)/);
      const cookieVal = cookieMatch ? cookieMatch[1] : null;
      const ref = document.referrer || "";
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

      setSourceMode(cameFromParlor ? "parlor" : cameFromV2 ? "v2" : "default");
    }
  }, [currentPath, isDirectV2, isDirectParlor, landingSource]);

  const baseLandingPath = sourceMode === "parlor" ? "/parlor" : sourceMode === "v2" ? "/v2/" : "/";
  const resolveHref = (href: string) => {
    if (!href.startsWith("#")) return href;
    if (currentPath === "/" && sourceMode === "default") return href;
    if (isDirectV2 && sourceMode === "v2") return href;
    if (isDirectParlor && sourceMode === "parlor") return href;
    if (sourceMode === "parlor") return `/parlor${href}`;
    if (sourceMode === "v2") return `/v2/${href}`;
    return `/${href}`;
  };

  return (
    <footer className="w-full bg-[#111111] text-gray-400 py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
      <div className="max-w-[1240px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 lg:gap-12 mb-12">
          
          {/* Brand Info (Span 2) */}
          <div className="md:col-span-2 space-y-4">
            <Link href={baseLandingPath} className="inline-flex items-center group select-none">
              <Image
                src="/menusnap-logo-white.png"
                alt="MenuSnap Logo"
                width={150}
                height={32}
                className="h-7 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </Link>

            <p className="text-base font-bold text-gray-200">
              Research Less. Build Smarter.
            </p>

            <p className="text-xs text-gray-400 leading-relaxed max-w-sm font-sans">
              Restaurant Menu Research & Menu Builder SaaS platform designed primarily for food entrepreneurs, café owners, and restaurants across Bangladesh.
            </p>

            <div className="text-[11px] text-gray-500 pt-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#FF5A36]" />
              <span>Proudly built for Bangladesh&apos;s food industry.</span>
            </div>
          </div>

          {/* Column 1: Product */}
          <div className="space-y-3 text-xs">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Product
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href={resolveHref("#how-it-works")} className="hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/free-design" className="hover:text-white transition-colors">
                  Free Menu Design
                </Link>
              </li>
              <li>
                <Link href={resolveHref("#pricing")} className="hover:text-white transition-colors">
                  Pricing Plans
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Client Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Resources */}
          <div className="space-y-3 text-xs">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Resources
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href={resolveHref("#how-it-works")} className="hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href={resolveHref("#faq")} className="hover:text-white transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <a href="https://wa.me/8801800000000" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                  WhatsApp Support
                </a>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Help Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal */}
          <div className="space-y-3 text-xs">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Data Accuracy Disclaimer
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© 2026 MenuSnap. All rights reserved.</p>
          <p className="text-[11px]">
            Third-party menu references belong to their respective restaurants and are used for research and comparison purposes only.
          </p>
        </div>
      </div>
    </footer>
  );
}
