import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSocket } from '@/hooks/useSocket';
import { useGame } from '@/hooks/useGame';
import { usePlayerStore } from '@/stores/playerStore';
import { useTranslation } from '@/i18n';
import type { OngoingGameInfo } from '@doodledraw/shared';
import Avatar from '@/components/Avatar';
import Pagination from '@/components/UI/Pagination';

const ITEMS_PER_PAGE = 10;

const phaseColors: Record<string, string> = {
  selecting_word: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  drawing: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  round_end: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
};

export default function OngoingGames() {
  const { emit, on } = useSocket();
  const { spectateRoom } = useGame();
  const { nickname } = usePlayerStore();
  const { t } = useTranslation();
  const [games, setGames] = useState<OngoingGameInfo[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    emit('rooms:ongoingList');

    const unsubList = on('rooms:ongoingList', (data: { rooms: OngoingGameInfo[] }) => {
      setGames(data.rooms);
    });

    const unsubUpdated = on('rooms:ongoingUpdated', (data: { rooms: OngoingGameInfo[] }) => {
      setGames(data.rooms);
    });

    return () => {
      unsubList();
      unsubUpdated();
    };
  }, [emit, on]);

  const sorted = [...games].sort((a, b) => b.createdAt - a.createdAt);
  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  if (games.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-surface-400 dark:text-surface-500">
        {t('ongoingGames.empty')}
      </div>
    );
  }

  const handleSpectate = (roomId: string) => {
    if (!nickname.trim()) return;
    spectateRoom(roomId);
  };

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {paginated.map(game => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 bg-surface-50 dark:bg-surface-700/50 rounded-card px-4 py-3"
          >
            <Avatar seed={game.hostAvatar} size={36} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm truncate">
                  {game.hostNickname}
                </span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    game.mode === 'classic'
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      : 'bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400'
                  }`}
                >
                  {game.mode === 'classic' ? t('create.classic') : t('create.teamBattle')}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${phaseColors[game.phase] ?? ''}`}>
                  {t(`ongoingGames.phase.${game.phase}` as any)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                <span>{t('ongoingGames.round', { current: String(game.currentRound), total: String(game.totalRounds) })}</span>
                <span>{t('ongoingGames.players', { count: String(game.playerCount) })}</span>
                {game.spectatorCount > 0 && (
                  <span>{t('ongoingGames.spectators', { count: String(game.spectatorCount) })}</span>
                )}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSpectate(game.id)}
              disabled={!nickname.trim()}
              className="px-4 py-1.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-sm font-bold rounded-button shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {t('ongoingGames.spectate')}
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
