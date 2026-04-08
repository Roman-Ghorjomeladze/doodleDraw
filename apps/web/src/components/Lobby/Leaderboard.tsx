import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from '@/i18n';
import { getAvatarDataUri } from '@/utils/avatars';
import { leaderboardApi, type LeaderboardType, type LeaderboardPagination } from '@/utils/leaderboardApi';
import ProfileModal from '@/components/Profile/ProfileModal';
import { COUNTRIES } from '@doodledraw/shared';
import type { LeaderboardEntry } from '@doodledraw/shared';
import CountrySelect from '@/components/UI/CountrySelect';
import Pagination from '@/components/UI/Pagination';

const PAGE_SIZE = 20;

export default function Leaderboard() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuthStore();
  const [type, setType] = useState<LeaderboardType>('allTime');
  const [country, setCountry] = useState('');
  const [page, setPage] = useState(1);

  const hasCountry = isAuthenticated && !!user?.country;
  const hasBirthYear = isAuthenticated && !!user?.birthYear;
  const userAge = hasBirthYear ? new Date().getFullYear() - user!.birthYear : null;
  const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
  const [pagination, setPagination] = useState<LeaderboardPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const abortRef = useRef<AbortController>(undefined);

  // Reset to page 1 whenever the tab/filter changes.
  useEffect(() => {
    setPage(1);
  }, [type, country]);

  // Auto-set country from profile when switching to country tab.
  useEffect(() => {
    if (type === 'country' && hasCountry && !country) {
      setCountry(user!.country);
    }
  }, [type, hasCountry, user, country]);

  useEffect(() => {
    // Don't fetch country leaderboard without a filter selected.
    if (type === 'country' && !country) {
      setPlayers([]);
      setPagination(null);
      setLoading(false);
      return;
    }
    // Age tab uses exact age from profile — always available if user has birthYear.
    if (type === 'age' && !hasBirthYear) {
      setPlayers([]);
      setPagination(null);
      setLoading(false);
      return;
    }

    // Abort any in-flight request when the query changes.
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    leaderboardApi
      .get({
        type,
        country: type === 'country' ? country : undefined,
        ageGroup: type === 'age' && user?.birthYear ? String(user.birthYear) : undefined,
        page,
        limit: PAGE_SIZE,
        signal: controller.signal,
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setPlayers(data.players);
          setPagination(data.pagination);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (err.name !== 'AbortError') {
          setPlayers([]);
          setPagination(null);
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [type, country, user?.birthYear, hasBirthYear, page]);

  const getMedalOrRank = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}`;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-300 dark:border-yellow-700';
    if (rank === 2) return 'bg-gray-50 dark:bg-gray-900/10 border-gray-300 dark:border-gray-700';
    if (rank === 3) return 'bg-orange-50 dark:bg-orange-900/10 border-orange-300 dark:border-orange-700';
    return 'bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700';
  };

  const tabBtn = (t_type: LeaderboardType, label: string) => (
    <button
      onClick={() => setType(t_type)}
      className={`flex-1 py-2 px-2 rounded-button text-xs sm:text-sm font-semibold transition-all ${
        type === t_type
          ? 'bg-primary-500 text-white shadow-md'
          : 'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-600'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{t('leaderboard.title')}</h2>

      {/* Type toggle */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {tabBtn('allTime', t('leaderboard.allTime'))}
        {tabBtn('weekly', t('leaderboard.thisWeek'))}
        {hasCountry && tabBtn('country', t('leaderboard.byCountry'))}
        {hasBirthYear && tabBtn('age', `${t('leaderboard.byAge')} (${userAge})`)}
      </div>

      {/* Country filter */}
      {type === 'country' && (
        <div className="mb-4">
          <CountrySelect
            value={country}
            onChange={setCountry}
            placeholder={t('leaderboard.selectCountry')}
          />
        </div>
      )}

      {/* Age info */}
      {type === 'age' && userAge && (
        <div className="text-center text-sm text-surface-500 mb-4">
          {t('leaderboard.sameAge', { age: String(userAge) })}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full"
          />
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-16 text-surface-500">
          <div className="text-4xl mb-3">🏆</div>
          <p>{t('leaderboard.noPlayers')}</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {players.map((player, index) => {
            const playerCountry = (COUNTRIES as readonly { code: string; name: string }[]).find(
              (c) => c.code === player.country,
            );
            return (
              <motion.div
                key={player.persistentId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => setProfileId(player.persistentId)}
                className={`flex items-center gap-3 py-2.5 px-3 rounded-lg border cursor-pointer hover:ring-2 hover:ring-primary-300 dark:hover:ring-primary-600 transition-shadow ${getRankBg(player.rank)}`}
              >
                <div className="w-8 text-center font-bold text-lg shrink-0">
                  {getMedalOrRank(player.rank)}
                </div>

                <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                  <img
                    src={getAvatarDataUri(player.avatar)}
                    alt={player.nickname}
                    className="w-full h-full"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {player.nickname}
                    {playerCountry && (
                      <span className="ml-1.5 text-[10px] text-surface-400 font-normal">{playerCountry.code}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-surface-500 flex gap-2">
                    <span>{player.totalGames} {t('leaderboard.games')}</span>
                    <span>{player.totalWins} {t('leaderboard.wins')}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-bold text-primary-600 dark:text-primary-400">
                    {player.eloRating ?? 1200}
                  </div>
                  <div className="text-[10px] text-surface-400">ELO</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      <ProfileModal persistentId={profileId} onClose={() => setProfileId(null)} />
    </div>
  );
}
