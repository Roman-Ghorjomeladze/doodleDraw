import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '@/stores/gameStore';
import { useTranslation } from '@/i18n';
import CreateRoom from './CreateRoom';
import JoinRoom from './JoinRoom';
import AnimatedLogo from '@/components/UI/AnimatedLogo';
import RulesModal from '@/components/RulesModal';

type Tab = 'create' | 'join';

/** Check synchronously if URL contains a room code. */
function hasRoomCodeInUrl(): boolean {
  return /^\/game\/[A-Z0-9]{4,8}$/i.test(window.location.pathname);
}

export default function HomePage() {
  const [tab, setTab] = useState<Tab>(() => hasRoomCodeInUrl() ? 'join' : 'create');
  const [showRules, setShowRules] = useState(false);
  const { roomId } = useGameStore();
  const { t } = useTranslation();

  return (
    <div className="max-w-md mx-auto mt-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="mb-2">
          <AnimatedLogo text={t('app.title')} size="lg" animationKey={roomId ?? 'home'} />
        </h2>
        <p className="text-surface-500 dark:text-surface-400">
          {t('app.subtitle')}
        </p>
        <button
          onClick={() => setShowRules(true)}
          className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
          {t('rules.howToPlay')}
        </button>
      </motion.div>

      <AnimatePresence>
        {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      </AnimatePresence>

      <div className="bg-white dark:bg-surface-800 rounded-card shadow-game-lg overflow-hidden">
        <div className="flex border-b border-surface-200 dark:border-surface-700">
          {(['create', 'join'] as Tab[]).map(tabKey => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors relative ${
                tab === tabKey
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
              }`}
            >
              {tabKey === 'create' ? t('home.createRoom') : t('home.joinRoom')}
              {tab === tabKey && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
                />
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {tab === 'create' ? (
              <motion.div
                key="create"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <CreateRoom />
              </motion.div>
            ) : (
              <motion.div
                key="join"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <JoinRoom />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
