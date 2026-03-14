import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { useGame } from '@/hooks/useGame';
import { useTranslation } from '@/i18n';
import ConfirmModal from './ConfirmModal';

/**
 * Reusable "Leave" button + confirmation modal for use during any game phase.
 */
export default function GameLeaveButton({ className }: { className?: string }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { leaveRoom } = useGame();
  const { t } = useTranslation();

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className={className ?? 'px-5 py-2 rounded-button text-sm font-semibold text-surface-500 hover:text-red-500 dark:text-surface-400 dark:hover:text-red-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors'}
      >
        {t('lobby.leave')}
      </button>

      <AnimatePresence>
        {showConfirm && (
          <ConfirmModal
            title={t('lobby.leaveConfirmTitle')}
            message={t('lobby.leaveConfirmMessage')}
            confirmLabel={t('lobby.confirmLeave')}
            cancelLabel={t('lobby.cancel')}
            variant="danger"
            onConfirm={leaveRoom}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
