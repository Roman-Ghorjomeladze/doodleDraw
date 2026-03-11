import { motion } from 'motion/react';
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', duration: 0.4 }}
        className="bg-white dark:bg-surface-800 rounded-card shadow-game-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-center text-surface-900 dark:text-surface-50 mb-2">
          {t('rules.title')}
        </h3>
        <p className="text-center text-sm text-surface-500 dark:text-surface-400 mb-5">
          {t('rules.overview')}
        </p>

        <div className="space-y-4">
          <Section
            icon="🎨"
            title={t('rules.classic.title')}
            description={t('rules.classic.desc')}
          />
          <Section
            icon="⚔️"
            title={t('rules.team.title')}
            description={t('rules.team.desc')}
          />
          <Section
            icon="✏️"
            title={t('rules.drawing.title')}
            description={t('rules.drawing.desc')}
          />
          <Section
            icon="🏆"
            title={t('rules.scoring.title')}
            description={t('rules.scoring.desc')}
          />
          <hr className="border-surface-200 dark:border-surface-700" />
          <Section
            icon="📊"
            title={t('rules.difficulty.title')}
            description={t('rules.difficulty.desc')}
          />
          <Section
            icon="🌍"
            title={t('rules.languages.title')}
            description={t('rules.languages.desc')}
          />
          <Section
            icon="👁️"
            title={t('rules.spectator.title')}
            description={t('rules.spectator.desc')}
          />
          <Section
            icon="⚙️"
            title={t('rules.settings.title')}
            description={t('rules.settings.desc')}
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-button bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm transition-colors"
        >
          {t('rules.close')}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
