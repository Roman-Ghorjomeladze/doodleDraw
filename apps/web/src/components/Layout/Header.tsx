import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { useGameStore } from '@/stores/gameStore';
import { useAuthStore } from '@/stores/authStore';
import { useFriendStore } from '@/stores/friendStore';
import { useGame } from '@/hooks/useGame';
import { useTranslation } from '@/i18n';
import SettingsPanel from './SettingsPanel';
import AnimatedLogo from '@/components/UI/AnimatedLogo';
import ConfirmModal from '@/components/UI/ConfirmModal';
import RulesModal from '@/components/RulesModal';

export default function Header() {
  const { roomId, phase } = useGameStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const incomingRequests = useFriendStore((s) => s.incomingRequests);
  const gameInvites = useFriendStore((s) => s.gameInvites);
  const { leaveRoom } = useGame();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-surface-900/80 border-b border-surface-200 dark:border-surface-700 px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 onClick={roomId ? () => setShowLeaveConfirm(true) : undefined} className="cursor-pointer">
              <AnimatedLogo text={t('app.title')} size="sm" animationKey={roomId ?? 'home'} />
            </h1>
            {roomId && (
              <button
                onClick={() => {
                  const url = `${window.location.origin}/game/${roomId}`;
                  navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className={`px-3 py-1 rounded-button text-sm font-mono font-bold transition-colors ${
                  copied
                    ? 'bg-success-500/20 text-success-600 dark:text-success-400'
                    : 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900/50'
                }`}
                title={t('lobby.clickToCopy')}
              >
                {copied ? '✓ Copied!' : roomId}
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* How to Play — only on home screen */}
            {!roomId && (
              <button
                onClick={() => setShowRules(true)}
                className="p-2 rounded-button hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-primary-600 dark:text-primary-400"
                aria-label={t('rules.howToPlay')}
                title={t('rules.howToPlay')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <path d="M12 17h.01" />
                </svg>
              </button>
            )}
            {isAuthenticated && (
              <button
                onClick={() => useFriendStore.getState().setSidebarOpen(true)}
                className="p-2 rounded-button hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors relative"
                aria-label={t('friends.title')}
                title={t('friends.title')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {(incomingRequests.length + gameInvites.length) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4.5 h-4.5 text-[10px] font-bold bg-danger-500 text-white rounded-full">
                    {incomingRequests.length + gameInvites.length}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-button hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              aria-label={t('settings.title')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AnimatePresence>
        {showRules && <RulesModal onClose={() => setShowRules(false)} />}
        {showLeaveConfirm && (
          <ConfirmModal
            title={t('lobby.leaveConfirmTitle')}
            message={t('lobby.leaveConfirmMessage')}
            confirmLabel={t('lobby.confirmLeave')}
            cancelLabel={t('lobby.cancel')}
            variant="danger"
            onConfirm={() => {
              setShowLeaveConfirm(false);
              leaveRoom();
            }}
            onCancel={() => setShowLeaveConfirm(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
