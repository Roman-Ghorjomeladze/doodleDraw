import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Avatar from '@/components/Avatar';
import { useFriendStore } from '@/stores/friendStore';
import { useGameStore } from '@/stores/gameStore';
import { useDrawingStore } from '@/stores/drawingStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useSocket } from '@/hooks/useSocket';
import { useTranslation } from '@/i18n';

export default function GameInviteToast() {
  const gameInvites = useFriendStore((s) => s.gameInvites);
  const currentRoomId = useGameStore((s) => s.roomId);
  const { emit } = useSocket();
  const { t } = useTranslation();

  // Auto-expire invites after 60s on the client side too.
  useEffect(() => {
    if (gameInvites.length === 0) return;
    const timers = gameInvites.map((invite) => {
      const elapsed = Date.now() - invite.timestamp;
      const remaining = Math.max(60_000 - elapsed, 0);
      return setTimeout(() => {
        useFriendStore.getState().removeGameInvite(invite.id);
      }, remaining);
    });
    return () => timers.forEach(clearTimeout);
  }, [gameInvites]);

  const handleAccept = (inviteId: string, roomId: string) => {
    useFriendStore.getState().removeGameInvite(inviteId);

    // If user is already in a room, leave it first.
    if (currentRoomId) {
      emit('room:leave');
      useGameStore.getState().reset();
      useDrawingStore.getState().reset();
      usePlayerStore.getState().setIsSpectator(false);
    }

    // Join the invited room after a short delay to ensure leave is processed.
    setTimeout(() => {
      const { nickname, avatar, persistentId } = usePlayerStore.getState();
      emit('room:join', { roomId, nickname, avatar, persistentId });
    }, 100);
  };

  const handleDecline = (inviteId: string) => {
    useFriendStore.getState().removeGameInvite(inviteId);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-xs">
      <AnimatePresence>
        {gameInvites.map((invite) => (
          <motion.div
            key={invite.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className="bg-white dark:bg-surface-800 rounded-xl shadow-game-lg border border-surface-200 dark:border-surface-700 p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <Avatar seed={invite.fromAvatar} size={40} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{invite.fromNickname}</p>
                <p className="text-xs text-surface-500">
                  {t('friends.gameInviteFrom').replace('{name}', invite.fromNickname)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleAccept(invite.id, invite.roomId)}
                className="flex-1 px-3 py-1.5 text-sm font-medium rounded-button bg-success-500 text-white hover:bg-success-600 transition-colors"
              >
                {t('friends.accept')}
              </button>
              <button
                onClick={() => handleDecline(invite.id)}
                className="flex-1 px-3 py-1.5 text-sm font-medium rounded-button bg-surface-200 dark:bg-surface-600 text-surface-700 dark:text-surface-300 hover:bg-surface-300 dark:hover:bg-surface-500 transition-colors"
              >
                {t('friends.decline')}
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
