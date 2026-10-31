'use client';

import { useEffect, useState, useRef } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { getGtmSettings, type GtmSettings } from '@/app/actions/gtm-settings';

export function GtmScriptLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<GtmSettings | null>(null);
  const lastTrackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const s = await getGtmSettings();
        setSettings(s);
      } catch (err) {
        console.error('Failed to load GTM settings', err);
      }
    }
    fetchSettings();
  }, []);

  // Track pageviews on SPA route changes with deduplication
  useEffect(() => {
    if (
      settings?.isEnabled &&
      settings?.gtmId &&
      !pathname?.startsWith('/m-admin') &&
      !pathname?.startsWith('/panel') &&
      typeof window !== 'undefined'
    ) {
      const queryString = searchParams?.toString();
      const currentUrl = pathname + (queryString ? `?${queryString}` : '');

      if (lastTrackedPathRef.current === currentUrl) return;
      lastTrackedPathRef.current = currentUrl;

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'page_view',
        page_path: currentUrl,
      });
    }
  }, [pathname, searchParams, settings]);

  // Disable GTM on admin pages
  if (pathname?.startsWith('/m-admin') || pathname?.startsWith('/panel')) {
    return null;
  }

  if (!settings?.isEnabled || !settings?.gtmId) {
    return null;
  }

  const cleanGtmId = settings.gtmId.trim();

  return (
    <>
      <Script
        key={cleanGtmId}
        id={`gtm-script-${cleanGtmId}`}
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${cleanGtmId}');
          `,
        }}
      />
      <noscript
        dangerouslySetInnerHTML={{
          __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${cleanGtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
        }}
      />
    </>
  );
}
