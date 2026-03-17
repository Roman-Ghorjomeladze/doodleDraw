import { motion } from 'motion/react';
import { useTranslation } from '@/i18n';

interface WordDisplayProps {
  hint: string;
  word?: string;
  isDrawer: boolean;
}

export default function WordDisplay({ hint, word, isDrawer }: WordDisplayProps) {
  const { t } = useTranslation();

  if (isDrawer && word) {
    return (
      <div className="text-center min-w-0 flex-1 px-2">
        <div className="text-xs text-surface-500 mb-0.5">{t('game.yourWord')}</div>
        <div className="text-base sm:text-lg font-bold text-primary-600 dark:text-primary-400 break-words">{word}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 sm:gap-1.5 justify-center min-w-0 flex-1 px-2">
      {hint.split('').map((char, i) => (
        <motion.span
          key={`${i}-${char}`}
          initial={char !== '_' && char !== ' ' ? { scale: 0, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          className={`inline-block w-4 sm:w-5 text-center font-bold text-base sm:text-lg ${
            char === '_'
              ? 'border-b-2 border-surface-400 dark:border-surface-500'
              : char === ' '
                ? 'w-2 sm:w-3'
                : 'text-primary-600 dark:text-primary-400'
          }`}
        >
          {char === '_' ? '\u00A0' : char === ' ' ? '' : char}
        </motion.span>
      ))}
    </div>
  );
}
