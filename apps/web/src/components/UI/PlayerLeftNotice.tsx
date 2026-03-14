import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '@/stores/gameStore';
import { useTranslation } from '@/i18n';

/**
 * Global popup that shows when a player leaves mid-game and the game
 * is cancelled. Mounted once in App.tsx so it works from any screen.
 */
export default function PlayerLeftNotice() {
  const playerLeftNotice = useGameStore((s) => s.playerLeftNotice);
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {playerLeftNotice && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="bg-white dark:bg-surface-800 rounded-card shadow-game-lg p-6 max-w-sm w-full text-center"
          >
            <div className="text-4xl mb-3">👋</div>
            <h3 className="text-lg font-bold text-surface-900 dark:text-surface-50 mb-2">
              {t('game.playerLeft', { name: playerLeftNotice })}
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400 mb-5">
              {t('game.returnedToLobby')}
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => useGameStore.getState().setPlayerLeftNotice(null)}
              className="px-8 py-2.5 rounded-button bg-primary-500 hover:bg-primary-600 text-white font-semibold transition-colors"
            >
              {t('game.playerLeftOk')}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
