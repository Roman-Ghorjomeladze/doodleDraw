import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSocket } from '@/hooks/useSocket';

interface FloatingEmoji {
  id: string;
  emoji: string;
  nickname: string;
  x: number; // percentage from left (0-100)
}

export default function FloatingReactions() {
  const { on } = useSocket();
  const [emojis, setEmojis] = useState<FloatingEmoji[]>([]);

  const addEmoji = useCallback((emoji: string, nickname: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    // Random x position between 10% and 90%
    const x = 10 + Math.random() * 80;

    setEmojis((prev) => {
      // Cap at 15 simultaneous emojis to avoid performance issues
      const next = prev.length >= 15 ? prev.slice(1) : prev;
      return [...next, { id, emoji, nickname, x }];
    });

    // Auto-remove after animation completes
    setTimeout(() => {
      setEmojis((prev) => prev.filter((e) => e.id !== id));
    }, 2200);
  }, []);

  useEffect(() => {
    const unsub = on('reaction:received', ({ emoji, nickname }) => {
      addEmoji(emoji, nickname);
    });
    return unsub;
  }, [on, addEmoji]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      <AnimatePresence>
        {emojis.map((e) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -200, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            className="absolute bottom-4 flex flex-col items-center"
            style={{ left: `${e.x}%` }}
          >
            <span className="text-3xl sm:text-4xl drop-shadow-lg">{e.emoji}</span>
            <span className="text-[10px] font-semibold text-surface-700 dark:text-surface-200 bg-white/70 dark:bg-surface-800/70 rounded px-1 mt-0.5 whitespace-nowrap backdrop-blur-sm">
              {e.nickname}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
