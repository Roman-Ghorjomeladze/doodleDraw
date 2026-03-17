import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSocket } from '@/hooks/useSocket';
import { useGame } from '@/hooks/useGame';
import { usePlayerStore } from '@/stores/playerStore';
import { useTranslation } from '@/i18n';
import type { PublicRoomInfo } from '@doodledraw/shared';
import Avatar from '@/components/Avatar';
import Pagination from '@/components/UI/Pagination';

const ITEMS_PER_PAGE = 10;

export default function AvailableRooms() {
  const { emit, on } = useSocket();
  const { joinRoom } = useGame();
  const { nickname, setNickname } = usePlayerStore();
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<PublicRoomInfo[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);
  const nicknameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emit('rooms:list');

    const unsubList = on('rooms:list', (data: { rooms: PublicRoomInfo[] }) => {
      setRooms(data.rooms);
    });

    const unsubUpdated = on('rooms:updated', (data: { rooms: PublicRoomInfo[] }) => {
      setRooms(data.rooms);
    });

    return () => {
      unsubList();
      unsubUpdated();
    };
  }, [emit, on]);

  const sorted = [...rooms].sort((a, b) => b.createdAt - a.createdAt);
  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset to page 1 if rooms shrink and current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Focus the nickname input when it appears
  useEffect(() => {
    if (pendingRoomId && nicknameInputRef.current) {
      nicknameInputRef.current.focus();
    }
  }, [pendingRoomId]);

  const handleJoin = (roomId: string) => {
    if (!nickname.trim()) {
      setPendingRoomId(roomId);
      return;
    }
    joinRoom(roomId);
  };

  const handleNicknameSubmit = () => {
    if (!nickname.trim() || !pendingRoomId) return;
    setPendingRoomId(null);
    joinRoom(pendingRoomId);
  };

  if (rooms.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-surface-400 dark:text-surface-500">
        {t('publicRooms.empty')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {pendingRoomId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 items-center bg-primary-50 dark:bg-primary-900/20 rounded-card px-4 py-3">
              <input
                ref={nicknameInputRef}
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNicknameSubmit()}
                placeholder={t('create.nicknamePlaceholder')}
                maxLength={20}
                className="flex-1 px-3 py-1.5 rounded-button bg-white dark:bg-surface-700 border border-surface-200 dark:border-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm transition-all"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNicknameSubmit}
                disabled={!nickname.trim()}
                className="px-4 py-1.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-sm font-bold rounded-button shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {t('publicRooms.join')}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {paginated.map(room => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 bg-surface-50 dark:bg-surface-700/50 rounded-card px-4 py-3"
          >
            <Avatar seed={room.hostAvatar} size={36} />

            <div className="flex-1 min-w-0">
              <span className="font-semibold text-sm block truncate">
                {room.hostNickname}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    room.mode === 'classic'
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      : 'bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400'
                  }`}
                >
                  {room.mode === 'classic' ? t('create.classic') : t('create.teamBattle')}
                </span>
                <span className="text-xs text-surface-500 dark:text-surface-400">
                  {t('publicRooms.players', {
                    count: String(room.playerCount),
                    max: String(room.maxPlayers),
                  })}
                </span>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleJoin(room.id)}
              className="px-4 py-1.5 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white text-sm font-bold rounded-button shadow-sm transition-all"
            >
              {t('publicRooms.join')}
            </motion.button>
          </motion.div>
        ))}
      </AnimatePresence>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
