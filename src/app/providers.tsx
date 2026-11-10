
'use client';

import { Suspense, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeProvider } from '@/context/ThemeContext';
import { PreferencesProvider } from '@/context/PreferencesContext';
import { ClientAuthProvider } from '@/hooks/use-client-auth';
import { ClientSideOnlyToaster } from '@/components/layout/client-side-only-toaster';
import { MetaPixelScriptLoader } from '@/components/layout/meta-pixel-loader';
import { GtmScriptLoader } from '@/components/layout/gtm-loader';
import { DraftAutoSyncer } from '@/components/common/draft-auto-syncer';

function PageTitleManager() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    const segments = pathname.split('/').filter(Boolean);
    const isMagicDoc = pathname.includes('/magic-docs/') || pathname.includes('/docs/edit/') || pathname.includes('/docs/view/');
    
    if (
      pathname.match(/\/manage-orders\/[^/]+/) ||
      pathname.match(/^\/share\/[^/]+/) ||
      pathname.match(/^\/editor\/[^/]+/) ||
      (isMagicDoc && segments.length > segments.indexOf('magic-docs') + 1) ||
      (pathname.includes('/docs/edit/') && segments.length > segments.indexOf('edit') + 1) ||
      (pathname.includes('/docs/view/') && segments.length > segments.indexOf('view') + 1)
    ) {
      // For dynamic doc pages, if we haven't set a title yet, set a placeholder
      if (isMagicDoc && (document.title === 'MenuSnap' || document.title === '')) {
          document.title = 'Magic Doc | MenuSnap';
      }
      return;
    }

    const cleanPath = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;

    const seoTitles: Record<string, string> = {
      '/templates': 'Explore Restaurant & Parlour Menu Design Gallery | MenuSnap',
      '/free-design': 'Free Custom Menu Design Service for Restaurants & Parlours | MenuSnap',
      '/dashboard': 'Dashboard - Explore & Manage Your Menu Design Collection | MenuSnap',
      '/magictab': 'MagicTab - AI Menu Builder & Creative Layout Designer | MenuSnap',
      '/marketing-consultation': 'Restaurant Marketing & Menu Consultation Service | MenuSnap',
    };

    if (seoTitles[cleanPath]) {
      document.title = seoTitles[cleanPath];
      return;
    }

    let pageName = 'Home';
    if (segments.length > 0) {
      pageName = segments[segments.length - 1];
    }

    const formattedName = pageName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    document.title = `${formattedName} | MenuSnap`;
  }, [pathname]);

  return null;
}

function ChunkErrorAutoReloader() {
  useEffect(() => {
    const handleError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const error = 'error' in event ? event.error : event.reason;
      const isChunkError =
        error?.name === 'ChunkLoadError' ||
        (typeof error?.message === 'string' &&
          (error.message.includes('Loading chunk') ||
            error.message.includes('Failed to load chunk') ||
            error.message.includes('Loading CSS chunk')));

      if (isChunkError) {
        const lastReload = sessionStorage.getItem('chunk_reload_timestamp');
        const now = Date.now();
        // Prevent continuous infinite reload loop (require at least 10 seconds between auto-reloads)
        if (!lastReload || now - Number(lastReload) > 10000) {
          sessionStorage.setItem('chunk_reload_timestamp', String(now));
          window.location.reload();
        }
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  return null;
}

function ExtensionCleaner() {
  useEffect(() => {
    try {
      const clean = () => {
        const els = document.querySelectorAll('[bis_skin_checked]');
        for (let i = 0; i < els.length; i++) els[i].removeAttribute('bis_skin_checked');
      };
      clean();
      const obs = new MutationObserver((muts) => {
        for (let i = 0; i < muts.length; i++) {
          const m = muts[i];
          if (m.type === 'attributes' && m.attributeName === 'bis_skin_checked' && m.target) {
            (m.target as Element).removeAttribute('bis_skin_checked');
          } else if (m.type === 'childList') {
            for (let j = 0; j < m.addedNodes.length; j++) {
              const node = m.addedNodes[j] as Element;
              if (node.nodeType === 1) {
                if (node.hasAttribute('bis_skin_checked')) node.removeAttribute('bis_skin_checked');
                const nested = node.querySelectorAll ? node.querySelectorAll('[bis_skin_checked]') : [];
                for (let k = 0; k < nested.length; k++) nested[k].removeAttribute('bis_skin_checked');
              }
            }
          }
        }
      });
      obs.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['bis_skin_checked'],
        childList: true,
        subtree: true,
      });
      return () => obs.disconnect();
    } catch (_) {}
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClientAuthProvider>
      <ThemeProvider>
        <PreferencesProvider>
        <Suspense fallback={null}>
          <ChunkErrorAutoReloader />
          <ExtensionCleaner />
          <DraftAutoSyncer />
          <MetaPixelScriptLoader />
          <GtmScriptLoader />
          <PageTitleManager />
        </Suspense>
        {children}
        <ClientSideOnlyToaster />
        </PreferencesProvider>
      </ThemeProvider>
    </ClientAuthProvider>
  );
}
