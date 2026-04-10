import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { useFeedbackUiStore } from '@/stores/feedbackUiStore';
import { useGameStore } from '@/stores/gameStore';
import { usePlayerStore } from '@/stores/playerStore';
import { feedbackApi, type FeedbackCategory } from '@/utils/feedbackApi';
import { collectTrace } from '@/utils/traceBuffer';
import { useTranslation } from '@/i18n';

const MAX_LEN = 2000;

export default function FeedbackModal() {
  const isOpen = useFeedbackUiStore((s) => s.isOpen);
  const close = useFeedbackUiStore((s) => s.close);
  const dragControls = useDragControls();
  const { t } = useTranslation();

  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state whenever the modal opens.
  useEffect(() => {
    if (isOpen) {
      setMessage('');
      setCategory('bug');
      setSubmitting(false);
      setSuccess(false);
      setError(null);
    }
  }, [isOpen]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Auto-close 1.5s after success.
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(close, 1500);
    return () => clearTimeout(t);
  }, [success, close]);

  const trimmedLen = message.trim().length;
  const canSubmit = trimmedLen >= 1 && trimmedLen <= MAX_LEN && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    // Snapshot game + player state at submit time so admins see where the
    // user was when the bug happened.
    let trace: Record<string, any> | null = null;
    try {
      const g = useGameStore.getState();
      const p = usePlayerStore.getState();
      trace = collectTrace({
        appVersion: (import.meta as any).env?.VITE_APP_VERSION ?? null,
        gameState: {
          roomId: g.roomId,
          mode: g.mode,
          phase: g.phase,
          currentRound: g.currentRound,
          totalRounds: g.totalRounds,
          drawerId: g.drawerId,
          teamADrawerId: g.teamADrawerId,
          teamBDrawerId: g.teamBDrawerId,
          teamAScore: g.teamAScore,
          teamBScore: g.teamBScore,
          playerCount: g.players?.length ?? 0,
          isHost: g.isHost,
          myPlayerId: p.playerId,
          myPersistentId: p.persistentId,
          myNickname: p.nickname,
          isSpectator: p.isSpectator,
        },
      });
    } catch {
      // Never block submission on tracing failures.
    }

    try {
      await feedbackApi.submitFeedback({
        message: message.trim(),
        category,
        trace,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || t('feedback.errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
        onClick={close}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          drag="y"
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0 }}
          dragElastic={0.2}
          onDragEnd={(_e, info) => {
            if (info.offset.y > 100 || info.velocity.y > 500) close();
          }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-surface-800 rounded-t-2xl sm:rounded-card shadow-game-lg w-full sm:max-w-md max-h-[100dvh] sm:max-h-[85vh] relative overflow-hidden flex flex-col"
          style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
        >
          {/* Drag handle */}
          <div
            className="sm:hidden flex justify-center pt-2 pb-1 touch-none cursor-grab active:cursor-grabbing shrink-0"
            onPointerDown={(e) => dragControls.start(e)}
          >
            <div className="w-10 h-1 rounded-full bg-surface-300 dark:bg-surface-600" />
          </div>

          {/* Header */}
          <div className="shrink-0 px-5 pt-3 sm:pt-5 pb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold text-surface-900 dark:text-surface-50">
              {t('feedback.title')}
            </h2>
            <button
              onClick={close}
              className="p-1.5 rounded-button hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500"
              aria-label={t('feedback.close')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5 flex flex-col gap-4">
            {success ? (
              <div className="text-center py-10">
                <div className="text-5xl mb-3">✅</div>
                <p className="text-lg font-semibold mb-1">{t('feedback.successTitle')}</p>
                <p className="text-sm text-surface-500">{t('feedback.successBody')}</p>
              </div>
            ) : (
              <>
                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase mb-2">
                    {t('feedback.category')}
                  </label>
                  <div className="flex gap-2">
                    {(['bug', 'feedback', 'other'] as const).map((cat) => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`flex-1 px-3 py-2 rounded-button text-sm font-medium transition-colors ${
                          category === cat
                            ? 'bg-primary-500 text-white'
                            : 'bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-600'
                        }`}
                      >
                        {t(`feedback.category.${cat}` as any)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase mb-2">
                    {t('feedback.message')}
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
                    placeholder={t('feedback.placeholder')}
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                  <div className="flex justify-end mt-1">
                    <span className={`text-xs ${trimmedLen > MAX_LEN ? 'text-red-500' : 'text-surface-400'}`}>
                      {trimmedLen}/{MAX_LEN}
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full py-2.5 rounded-button bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
                >
                  {submitting ? t('feedback.submitting') : t('feedback.submit')}
                </button>
              </>
            )}
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
