import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls } from 'motion/react';
import { useTranslation } from '@/i18n';

interface RulesModalProps {
  onClose: () => void;
}

function Section({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="text-2xl shrink-0 mt-0.5">{icon}</div>
      <div>
        <h4 className="font-bold text-surface-900 dark:text-surface-50 mb-1">{title}</h4>
        <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export default function RulesModal({ onClose }: RulesModalProps) {
  const { t } = useTranslation();
  const dragControls = useDragControls();

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
      onClick={onClose}
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
          if (info.offset.y > 150 || info.velocity.y > 600) {
            onClose();
          }
        }}
        className="max-w-lg w-full max-h-[100dvh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-card bg-white dark:bg-surface-800 relative overflow-hidden flex flex-col"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle + Header — this area initiates swipe-to-close */}
        <div
          className="touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => dragControls.start(e)}
        >
          {/* Drag handle */}
          <div className="sm:hidden flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-surface-300 dark:bg-surface-600" />
          </div>

          {/* Header */}
          <div className="px-5 py-3 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between">
            <h3 className="font-bold text-base text-surface-900 dark:text-surface-100">{t('rules.title')}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-600 dark:text-surface-300 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content — scrollable, does NOT trigger drag */}
        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-center text-sm text-surface-500 dark:text-surface-400 mb-5">
            {t('rules.overview')}
          </p>

          <div className="space-y-4">
            <Section icon="🎨" title={t('rules.classic.title')} description={t('rules.classic.desc')} />
            <Section icon="⚔️" title={t('rules.team.title')} description={t('rules.team.desc')} />
            <Section icon="✏️" title={t('rules.drawing.title')} description={t('rules.drawing.desc')} />
            <Section icon="🏆" title={t('rules.scoring.title')} description={t('rules.scoring.desc')} />
            <hr className="border-surface-200 dark:border-surface-700" />
            <Section icon="📊" title={t('rules.difficulty.title')} description={t('rules.difficulty.desc')} />
            <Section icon="🌍" title={t('rules.languages.title')} description={t('rules.languages.desc')} />
            <Section icon="👁️" title={t('rules.spectator.title')} description={t('rules.spectator.desc')} />
            <Section icon="⚙️" title={t('rules.settings.title')} description={t('rules.settings.desc')} />
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
