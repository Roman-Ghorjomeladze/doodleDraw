import { useState } from 'react';
import Avatar from '@/components/Avatar';
import { useSocket } from '@/hooks/useSocket';
import { useGameStore } from '@/stores/gameStore';
import { useTranslation } from '@/i18n';
import type { FriendInfo } from '@doodledraw/shared';

interface FriendListItemProps {
  friend: FriendInfo;
  onRemove?: (persistentId: string) => void;
}

export default function FriendListItem({ friend, onRemove }: FriendListItemProps) {
  const { emit } = useSocket();
  const roomId = useGameStore((s) => s.roomId);
  const phase = useGameStore((s) => s.phase);
  const { t } = useTranslation();
  const [invited, setInvited] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const canInvite = roomId && phase === 'lobby' && friend.isOnline && !invited && friend.currentRoomId !== roomId;

  const handleInvite = () => {
    if (!roomId) return;
    emit('friends:inviteToGame', { friendPersistentId: friend.persistentId, roomId });
    setInvited(true);
    setTimeout(() => setInvited(false), 60_000);
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700/50 group relative">
      <div className="relative shrink-0">
        <Avatar seed={friend.avatar} size={36} />
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-surface-800 ${
            friend.isOnline ? 'bg-success-500' : 'bg-surface-400'
          }`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-surface-900 dark:text-surface-100">
          {friend.nickname}
        </p>
        <p className="text-xs text-surface-500 dark:text-surface-400 truncate">
          @{friend.username}
          {friend.isOnline && friend.currentRoomId && (
            <span className="ml-1 text-primary-500">&middot; {t('friends.inGame')}</span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-1">
        {canInvite && (
          <button
            onClick={handleInvite}
            className="px-2.5 py-1 text-xs font-medium rounded-button bg-primary-500 text-white hover:bg-primary-600 transition-colors"
          >
            {t('friends.invite')}
          </button>
        )}
        {invited && (
          <span className="px-2.5 py-1 text-xs font-medium text-primary-500">
            {t('friends.invited')}
          </span>
        )}

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-surface-200 dark:hover:bg-surface-600 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
            </svg>
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-surface-700 rounded-lg shadow-lg border border-surface-200 dark:border-surface-600 py-1 min-w-[140px]">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onRemove?.(friend.persistentId);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-danger-600 dark:text-danger-400 hover:bg-surface-100 dark:hover:bg-surface-600"
                >
                  {t('friends.removeFriend')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
