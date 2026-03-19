import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSocket } from '@/hooks/useSocket';
import { REACTION_EMOJIS } from '@doodledraw/shared';

const STORAGE_KEY = 'doodledraw_reaction_counts';
const VISIBLE_COUNT = 9;

function getUsageCounts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function incrementUsage(emoji: string) {
  const counts = getUsageCounts();
  counts[emoji] = (counts[emoji] || 0) + 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
}

function getSortedEmojis(): string[] {
  const counts = getUsageCounts();
  return [...REACTION_EMOJIS].sort((a, b) => (counts[b] || 0) - (counts[a] || 0));
}

export default function ReactionBar() {
  const { emit } = useSocket();
  const [cooldown, setCooldown] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sortKey, setSortKey] = useState(0);

  const sorted = useMemo(() => getSortedEmojis(), [sortKey]);
  const visible = expanded ? sorted : sorted.slice(0, VISIBLE_COUNT);
  const hasMore = REACTION_EMOJIS.length > VISIBLE_COUNT;

  const sendReaction = useCallback(
    (emoji: string) => {
      if (cooldown) return;
      emit('reaction:send', { emoji });
      incrementUsage(emoji);
      setSortKey((k) => k + 1);
      setCooldown(true);
      setTimeout(() => setCooldown(false), 1500);
    },
    [emit, cooldown],
  );

  return (
    <div className="py-1.5 px-2">
      <div className="flex justify-center gap-1 sm:gap-1.5">
        {visible.slice(0, VISIBLE_COUNT).map((emoji) => (
          <motion.button
            key={emoji}
            whileTap={{ scale: 1.4 }}
            onClick={() => sendReaction(emoji)}
            disabled={cooldown}
            className={`text-lg sm:text-xl p-1 sm:p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 active:bg-surface-200 dark:active:bg-surface-600 transition-colors ${
              cooldown ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
            }`}
            title={emoji}
          >
            {emoji}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex justify-center gap-1 sm:gap-1.5 mt-1">
              {sorted.slice(VISIBLE_COUNT).map((emoji) => (
                <motion.button
                  key={emoji}
                  whileTap={{ scale: 1.4 }}
                  onClick={() => sendReaction(emoji)}
                  disabled={cooldown}
                  className={`text-lg sm:text-xl p-1 sm:p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 active:bg-surface-200 dark:active:bg-surface-600 transition-colors ${
                    cooldown ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                  title={emoji}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-1 text-[10px] text-surface-400 hover:text-surface-300 transition-colors"
        >
          {expanded ? '▲' : '▼'}
        </button>
      )}
    </div>
  );
}
