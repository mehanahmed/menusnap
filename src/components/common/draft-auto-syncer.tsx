'use client';

import { useEffect, useRef } from 'react';
import { batchSyncUserDraftsAction } from '@/app/actions/user-drafts';
import { useClientAuth } from '@/hooks/use-client-auth';

const DRAFTS_STORAGE_KEY = 'menuBuilderDrafts';
const CLIENT_STORAGE_KEY = 'colorHutClientUser';

export function DraftAutoSyncer() {
  const { clientUser } = useClientAuth();
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncDrafts = async () => {
      if (isSyncingRef.current) return;

      try {
        const storedDraftsRaw = localStorage.getItem(DRAFTS_STORAGE_KEY);
        if (!storedDraftsRaw) return;

        const parsedDrafts = JSON.parse(storedDraftsRaw);
        if (!Array.isArray(parsedDrafts) || parsedDrafts.length === 0) return;

        // Extract client user from context or localStorage directly
        let businessName = clientUser?.businessName;
        let businessType = clientUser?.type;
        let whatsappNumber = clientUser?.whatsappNumber;
        let email = clientUser?.email;
        let clientId = clientUser?.id;

        if (!businessName) {
          try {
            const rawClient = localStorage.getItem(CLIENT_STORAGE_KEY);
            if (rawClient) {
              const u = JSON.parse(rawClient);
              businessName = u.businessName || u.name;
              businessType = u.type || u.businessType;
              whatsappNumber = u.whatsappNumber || u.phone;
              email = u.email;
              clientId = u.id;
            }
          } catch {}
        }

        const payloads = parsedDrafts
          .filter((d: any) => {
            // Filter out drafts that belong to a different client
            if (clientId && d.clientId && Number(d.clientId) !== Number(clientId)) {
              return false;
            }
            return true;
          })
          .map((d: any) => {
            const draftId = String(d.id || d.draftId || `draft-${Date.now()}`);
            const draftName = String(d.name || d.draftName || 'Saved Draft');
            const primaryTag = d.primaryTag ? String(d.primaryTag) : (businessType === 'parlour' ? 'parlour' : 'restaurant');
            const items = Array.isArray(d.items) ? d.items : [];
            const itemCount = typeof d.itemCount === 'number' ? d.itemCount : items.length;

            return {
              draftId,
              draftName,
              businessName: businessName || (primaryTag === 'parlour' ? 'Anonymous Parlour' : 'Anonymous Restaurant'),
              businessType: businessType || primaryTag,
              whatsappNumber: whatsappNumber || undefined,
              email: email || undefined,
              clientId: typeof clientId === 'number' ? clientId : undefined,
              primaryTag,
              items,
              itemCount,
              createdAt: d.createdAt || undefined,
            };
          });

        isSyncingRef.current = true;
        await batchSyncUserDraftsAction(payloads);
      } catch (err) {
        console.error('[DraftAutoSyncer] Sync error:', err);
      } finally {
        isSyncingRef.current = false;
      }
    };

    // Sync on mount
    syncDrafts();

    // Also sync on window focus or visibility change
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncDrafts();
      }
    };

    window.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', syncDrafts);

    return () => {
      window.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', syncDrafts);
    };
  }, [clientUser]);

  return null;
}
