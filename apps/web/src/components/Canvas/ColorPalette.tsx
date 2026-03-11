import { motion } from 'motion/react';
import { useDrawingStore } from '@/stores/drawingStore';
import { DRAWING_COLORS } from '@doodledraw/shared';
import { cn } from '@/utils/cn';

export default function ColorPalette() {
  const { color, handicap, setColor } = useDrawingStore();

  const availableColors = handicap?.limitedColors ? handicap.availableColors : [...DRAWING_COLORS];

  return (
    <div className="flex flex-wrap gap-1.5 bg-white dark:bg-surface-800 rounded-card shadow-game px-3 py-2">
      {DRAWING_COLORS.map(c => {
        const isAvailable = availableColors.includes(c);
        return (
          <motion.button
            key={c}
            whileHover={isAvailable ? { scale: 1.2 } : {}}
            whileTap={isAvailable ? { scale: 0.9 } : {}}
            onClick={() => isAvailable && setColor(c)}
            disabled={!isAvailable}
            className={cn(
              'w-8 h-8 rounded-full transition-all',
              color === c && 'ring-2 ring-offset-2 ring-primary-500',
              !isAvailable && 'opacity-20 cursor-not-allowed'
            )}
            style={{ backgroundColor: c }}
          />
        );
      })}
    </div>
  );
}
