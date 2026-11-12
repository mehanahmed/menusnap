'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useClientAuth } from '@/hooks/use-client-auth';
import { setActiveSavedDraftAction, getActiveSavedDraftAction } from '@/app/actions/user-drafts';

export const ACTIVE_SAVED_DRAFT_KEY = 'menusnap_active_saved_draft_id';
export const ACTIVE_SAVED_DRAFT_NAME_KEY = 'menusnap_active_saved_draft_name';
const BROADCAST_CHANNEL_NAME = 'menusnap_active_draft_channel';

export interface ActiveSavedDraftState {
  activeSavedDraftId: string | null;
  activeSavedDraftName: string | null;
  isLoading: boolean;
  isDraftSaved: (draftId?: string | null) => boolean;
  saveAsActiveDraft: (draft: { id: string; name?: string }) => Promise<{
    success: boolean;
    previousDraftId?: string | null;
    previousDraftName?: string | null;
    error?: string;
  }>;
  refreshActiveDraft: () => Promise<void>;
}

export function useActiveSavedDraft(): ActiveSavedDraftState {
  const { clientUser } = useClientAuth();
  const [activeSavedDraftId, setActiveSavedDraftId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACTIVE_SAVED_DRAFT_KEY) || null;
    }
    return null;
  });
  const [activeSavedDraftName, setActiveSavedDraftName] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACTIVE_SAVED_DRAFT_NAME_KEY) || null;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Sync state from server and local storage
  const refreshActiveDraft = useCallback(async () => {
    // If not logged in, reset state
    if (!clientUser?.id && !clientUser?.businessName) {
      setActiveSavedDraftId(null);
      setActiveSavedDraftName(null);
      setIsLoading(false);
      return;
    }

    // 1. Check local storage first for optimistic UI
    if (typeof window !== 'undefined') {
      const localId = localStorage.getItem(ACTIVE_SAVED_DRAFT_KEY);
      const localName = localStorage.getItem(ACTIVE_SAVED_DRAFT_NAME_KEY);
      if (localId) {
        setActiveSavedDraftId(localId);
        setActiveSavedDraftName(localName);
      }
    }

    // 2. Fetch authoritative active draft from MySQL for this client
    try {
      const res = await getActiveSavedDraftAction({
        clientId: clientUser.id,
        businessName: clientUser.businessName,
      });

      if (res.success && res.activeDraftId) {
        setActiveSavedDraftId(res.activeDraftId);
        setActiveSavedDraftName(res.draftName || null);
        if (typeof window !== 'undefined') {
          localStorage.setItem(ACTIVE_SAVED_DRAFT_KEY, res.activeDraftId);
          if (res.draftName) {
            localStorage.setItem(ACTIVE_SAVED_DRAFT_NAME_KEY, res.draftName);
          }
        }
      } else if (res.success && !res.activeDraftId) {
        setActiveSavedDraftId(null);
        setActiveSavedDraftName(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(ACTIVE_SAVED_DRAFT_KEY);
          localStorage.removeItem(ACTIVE_SAVED_DRAFT_NAME_KEY);
        }
      }
    } catch (_) {
      // Ignore network errors and keep local cache
    } finally {
      setIsLoading(false);
    }
  }, [clientUser?.id, clientUser?.businessName]);

  useEffect(() => {
    refreshActiveDraft();

    // Cross-tab synchronization via BroadcastChannel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        channelRef.current = channel;
        channel.onmessage = (event) => {
          if (event.data?.type === 'ACTIVE_DRAFT_CHANGED') {
            setActiveSavedDraftId(event.data.draftId || null);
            setActiveSavedDraftName(event.data.draftName || null);
          }
        };
      } catch (_) {}
    }

    // Cross-tab localStorage event listener
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ACTIVE_SAVED_DRAFT_KEY) {
        setActiveSavedDraftId(e.newValue || null);
      }
      if (e.key === ACTIVE_SAVED_DRAFT_NAME_KEY) {
        setActiveSavedDraftName(e.newValue || null);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (channelRef.current) {
        channelRef.current.close();
      }
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshActiveDraft]);

  const isDraftSaved = useCallback(
    (draftId?: string | null): boolean => {
      if (!draftId || !activeSavedDraftId) return false;
      return String(draftId).trim() === String(activeSavedDraftId).trim();
    },
    [activeSavedDraftId]
  );

  const saveAsActiveDraft = useCallback(
    async (draft: { id: string; name?: string }) => {
      const prevId = activeSavedDraftId;
      const prevName = activeSavedDraftName;
      const cleanDraftId = String(draft.id).trim();
      const cleanDraftName = draft.name ? String(draft.name).trim() : 'Draft Menu';

      // 1. Optimistic local state update
      setActiveSavedDraftId(cleanDraftId);
      setActiveSavedDraftName(cleanDraftName);
      if (typeof window !== 'undefined') {
        localStorage.setItem(ACTIVE_SAVED_DRAFT_KEY, cleanDraftId);
        localStorage.setItem(ACTIVE_SAVED_DRAFT_NAME_KEY, cleanDraftName);

        // Also mark isSaved in menuBuilderDrafts array if present
        try {
          const raw = localStorage.getItem('menuBuilderDrafts');
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const updated = list.map((d: any) => ({
                ...d,
                isSaved: String(d.id || d.draftId) === cleanDraftId,
              }));
              localStorage.setItem('menuBuilderDrafts', JSON.stringify(updated));
            }
          }
        } catch (_) {}
      }

      // Broadcast across tabs
      if (channelRef.current) {
        try {
          channelRef.current.postMessage({
            type: 'ACTIVE_DRAFT_CHANGED',
            draftId: cleanDraftId,
            draftName: cleanDraftName,
          });
        } catch (_) {}
      }

      // 2. Persist in MySQL database
      try {
        const res = await setActiveSavedDraftAction({
          draftId: cleanDraftId,
          clientId: clientUser?.id,
          businessName: clientUser?.businessName,
        });

        if (!res.success) {
          return {
            success: false,
            previousDraftId: prevId,
            previousDraftName: prevName,
            error: res.error,
          };
        }

        return {
          success: true,
          previousDraftId: prevId,
          previousDraftName: prevName,
        };
      } catch (err: any) {
        return {
          success: true, // Local optimistic success still holds
          previousDraftId: prevId,
          previousDraftName: prevName,
        };
      }
    },
    [activeSavedDraftId, activeSavedDraftName, clientUser?.id, clientUser?.businessName]
  );

  return {
    activeSavedDraftId,
    activeSavedDraftName,
    isLoading,
    isDraftSaved,
    saveAsActiveDraft,
    refreshActiveDraft,
  };
}

