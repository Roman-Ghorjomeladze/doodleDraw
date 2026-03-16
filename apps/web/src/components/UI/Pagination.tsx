import { motion } from 'motion/react';
import { useTranslation } from '@/i18n';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const { t } = useTranslation();

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 mt-4">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="px-3 py-1.5 text-sm font-medium rounded-button bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {t('pagination.prev')}
      </motion.button>

      <span className="text-xs text-surface-500 dark:text-surface-400">
        {t('pagination.page', { current: String(currentPage), total: String(totalPages) })}
      </span>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="px-3 py-1.5 text-sm font-medium rounded-button bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {t('pagination.next')}
      </motion.button>
    </div>
  );
}
