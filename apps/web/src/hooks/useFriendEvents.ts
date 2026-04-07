import { useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useFriendStore } from '@/stores/friendStore';
import { useAuthStore } from '@/stores/authStore';
import { friendsApi } from '@/utils/friendsApi';

/**
 * Loads initial friends data via HTTP and registers socket listeners
 * for real-time updates (status changes, incoming requests, game invites).
 * Must be called from a single top-level component (App).
 */
export function useFriendEvents() {
  const { on, socketVersion } = useSocket();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Load initial data via HTTP when authenticated.
  useEffect(() => {
    if (isAuthenticated) {
      friendsApi.list().then(({ friends }) => {
        useFriendStore.getState().setFriends(friends);
      }).catch(() => {});

      friendsApi.pendingRequests().then(({ incoming, outgoing }) => {
        useFriendStore.getState().setIncomingRequests(incoming);
        useFriendStore.getState().setOutgoingRequests(outgoing);
      }).catch(() => {});
    } else {
      useFriendStore.getState().reset();
    }
  }, [isAuthenticated, socketVersion]);

  // Register socket listeners for real-time push notifications.
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    // Server pushes updated friends list after accept/remove.
    unsubs.push(
      on('friends:list', ({ friends }) => {
        useFriendStore.getState().setFriends(friends);
      }),
    );

    // Real-time online/offline status changes.
    unsubs.push(
      on('friends:statusChanged', ({ persistentId, isOnline, currentRoomId }) => {
        useFriendStore.getState().updateFriendStatus(persistentId, isOnline, currentRoomId);
      }),
    );

    // Someone sent us a friend request.
    unsubs.push(
      on('friends:requestReceived', ({ request }) => {
        useFriendStore.getState().addIncomingRequest(request);
      }),
    );

    // A request we sent or received was accepted/rejected.
    unsubs.push(
      on('friends:requestUpdated', ({ requestId }) => {
        useFriendStore.getState().removeRequest(requestId);
      }),
    );

    // A friend removed us.
    unsubs.push(
      on('friends:removed', ({ friendPersistentId }) => {
        useFriendStore.getState().removeFriend(friendPersistentId);
      }),
    );

    // Game invite notifications.
    unsubs.push(
      on('friends:gameInvite', ({ invite }) => {
        useFriendStore.getState().addGameInvite(invite);
      }),
    );

    unsubs.push(
      on('friends:inviteExpired', ({ inviteId }) => {
        useFriendStore.getState().removeGameInvite(inviteId);
      }),
    );

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [on, socketVersion]);
}
