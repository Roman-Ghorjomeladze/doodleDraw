import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSocket } from '@/hooks/useSocket';
import { getAvatarDataUri } from '@/utils/avatars';
import { useTranslation } from '@/i18n';
import type { PlayerProfile } from '@doodledraw/shared';

interface ProfileModalProps {
  persistentId: string | null;
  onClose: () => void;
}

export default function ProfileModal({ persistentId, onClose }: ProfileModalProps) {
  const { emit, on } = useSocket();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!persistentId) return;

    setLoading(true);
    setProfile(null);

    const unsub = on('profile:data', ({ profile: data }) => {
      setProfile(data);
      setLoading(false);
    });

    emit('profile:get', { persistentId });

    // Timeout fallback
    const timeout = setTimeout(() => setLoading(false), 5000);

    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, [persistentId, emit, on]);

  if (!persistentId) return null;

  const winRate = profile && profile.totalGames > 0
    ? Math.round((profile.totalWins / profile.totalGames) * 100)
    : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (info.offset.y > 100 || info.velocity.y > 500) {
              onClose();
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-surface-800 rounded-t-2xl sm:rounded-card shadow-game-lg p-6 w-full sm:max-w-sm max-h-[80vh] overflow-y-auto"
        >
          {/* Drag handle */}
          <div className="flex justify-center mb-3 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-surface-300 dark:bg-surface-600" />
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full"
              />
            </div>
          ) : !profile ? (
            <div className="text-center py-8">
              <p className="text-surface-500">{t('profile.noData')}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-surface-100 dark:bg-surface-700 rounded-button text-sm font-semibold"
              >
                {t('common.close')}
              </button>
            </div>
          ) : (
            <>
              {/* Avatar + Name */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-primary-500/20 mb-3">
                  <img
                    src={getAvatarDataUri(profile.avatar)}
                    alt={profile.nickname}
                    className="w-full h-full"
                  />
                </div>
                <h3 className="text-xl font-bold">{profile.nickname}</h3>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <StatCard
                  label={t('profile.gamesPlayed')}
                  value={profile.totalGames}
                  icon="🎮"
                />
                <StatCard
                  label={t('profile.wins')}
                  value={profile.totalWins}
                  icon="🏆"
                />
                <StatCard
                  label={t('profile.winRate')}
                  value={`${winRate}%`}
                  icon="📊"
                />
                <StatCard
                  label="ELO"
                  value={profile.eloRating ?? 1200}
                  icon="⭐"
                />
                <StatCard
                  label={t('profile.correctGuesses')}
                  value={profile.correctGuesses}
                  icon="✅"
                />
                <StatCard
                  label={t('profile.drawings')}
                  value={profile.totalDrawings}
                  icon="🎨"
                />
              </div>

              {/* Favorite Word */}
              {profile.favoriteWord && (
                <div className="text-center py-3 bg-surface-50 dark:bg-surface-700/50 rounded-lg mb-4">
                  <span className="text-xs text-surface-500 block">{t('profile.favoriteWord')}</span>
                  <span className="font-bold text-primary-600 dark:text-primary-400 text-lg">
                    {profile.favoriteWord}
                  </span>
                </div>
              )}

              {/* Close */}
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-button text-sm font-semibold transition-colors"
              >
                {t('common.close')}
              </button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="bg-surface-50 dark:bg-surface-700/50 rounded-lg p-3 text-center">
      <div className="text-lg mb-0.5">{icon}</div>
      <div className="font-bold text-lg">{value}</div>
      <div className="text-[11px] text-surface-500 leading-tight">{label}</div>
    </div>
  );
}
