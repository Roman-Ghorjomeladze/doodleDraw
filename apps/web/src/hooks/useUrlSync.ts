import { useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/gameStore';

/**
 * Syncs the browser URL with the current game room state.
 * - When a room is joined → pushes /game/:roomId to URL
 * - When a room is left → pushes / to URL
 * - On initial load → parses /game/:roomId from URL and sets pendingRoomId
 * - Handles browser back button (popstate)
 */
export function useUrlSync() {
  const prevRoomIdRef = useRef<string | null>(null);

  useEffect(() => {
    // On mount: check if the URL contains a room code.
    const match = window.location.pathname.match(/^\/game\/([A-Z0-9]{4,8})$/i);
    if (match) {
      const urlRoomId = match[1].toUpperCase();
      const currentRoomId = useGameStore.getState().roomId;
      if (!currentRoomId) {
        // Not in a room yet — set pendingRoomId so HomePage can auto-join.
        useGameStore.getState().setPendingRoomId(urlRoomId);
      }
    }

    // Subscribe to all state changes, track roomId manually.
    prevRoomIdRef.current = useGameStore.getState().roomId;

    const unsubscribe = useGameStore.subscribe((state) => {
      const roomId = state.roomId;
      const prev = prevRoomIdRef.current;

      if (roomId === prev) return;
      prevRoomIdRef.current = roomId;

      if (roomId && roomId !== prev) {
        // Joined a room — update URL.
        const newPath = `/game/${roomId}`;
        if (window.location.pathname !== newPath) {
          window.history.pushState({}, '', newPath);
        }
      } else if (!roomId && prev) {
        // Left a room — go back to home.
        if (window.location.pathname !== '/') {
          window.history.pushState({}, '', '/');
        }
      }
    });

    // Handle browser back/forward button.
    const handlePopState = () => {
      const popMatch = window.location.pathname.match(/^\/game\/([A-Z0-9]{4,8})$/i);
      const currentRoomId = useGameStore.getState().roomId;

      if (!popMatch && currentRoomId) {
        // User navigated back to / while in a room — leave.
        useGameStore.getState().reset();
      } else if (popMatch && !currentRoomId) {
        // User navigated forward to a game URL — set pending.
        useGameStore.getState().setPendingRoomId(popMatch[1].toUpperCase());
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      unsubscribe();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
}
