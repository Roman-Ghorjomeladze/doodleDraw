import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import Avatar from '@/components/Avatar';
import { useSocket } from '@/hooks/useSocket';
import { useFriendStore } from '@/stores/friendStore';
import { useGameStore } from '@/stores/gameStore';
import { useTranslation } from '@/i18n';

interface InviteFriendsModalProps {
  onClose: () => void;
}

const MAX_INITIAL_DISPLAY = 5;

export default function InviteFriendsModal({ onClose }: InviteFriendsModalProps) {
  const { emit } = useSocket();
  const friends = useFriendStore((s) => s.friends);
  const roomId = useGameStore((s) => s.roomId);
  const { t } = useTranslation();
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const onlineFriends = useMemo(
    () => friends.filter((f) => f.isOnline && f.currentRoomId !== roomId),
    [friends, roomId],
  );

  const filteredFriends = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? onlineFriends.filter(
          (f) =>
            f.nickname.toLowerCase().includes(q) ||
            f.username.toLowerCase().includes(q),
        )
      : onlineFriends;
    // Only cap to MAX_INITIAL_DISPLAY when there's no search query.
    return q ? list : list.slice(0, MAX_INITIAL_DISPLAY);
  }, [onlineFriends, search]);

  const hasMore = !search.trim() && onlineFriends.length > MAX_INITIAL_DISPLAY;

  const handleInvite = (persistentId: string) => {
    if (!roomId) return;
    emit('friends:inviteToGame', { friendPersistentId: persistentId, roomId });
    setInvitedIds((prev) => new Set(prev).add(persistentId));
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white dark:bg-surface-800 rounded-xl shadow-xl border border-surface-200 dark:border-surface-700 overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-700">
          <h3 className="font-bold">{t('friends.inviteFriends')}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-button hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pt-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('friends.search')}
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 text-sm border border-surface-200 dark:border-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            />
          </div>
        </div>

        <div className="p-3 max-h-80 overflow-y-auto">
          {onlineFriends.length === 0 ? (
            <p className="text-sm text-surface-500 text-center py-6">
              {t('friends.noOnlineFriends')}
            </p>
          ) : filteredFriends.length === 0 ? (
            <p className="text-sm text-surface-500 text-center py-6">
              {t('friends.noResults')}
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredFriends.map((friend) => (
                <div key={friend.persistentId} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700/50">
                  <div className="relative shrink-0">
                    <Avatar seed={friend.avatar} size={32} />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-surface-800 bg-success-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{friend.nickname}</p>
                  </div>
                  {invitedIds.has(friend.persistentId) ? (
                    <span className="px-2.5 py-1 text-xs font-medium text-primary-500">
                      {t('friends.invited')}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleInvite(friend.persistentId)}
                      className="px-2.5 py-1 text-xs font-medium rounded-button bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                    >
                      {t('friends.invite')}
                    </button>
                  )}
                </div>
              ))}
              {hasMore && (
                <p className="text-xs text-surface-500 text-center py-2">
                  {t('friends.searchToSeeMore')}
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
