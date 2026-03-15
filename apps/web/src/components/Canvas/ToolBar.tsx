import { motion } from 'motion/react';
import { useDrawingStore } from '@/stores/drawingStore';
import { useSocket } from '@/hooks/useSocket';
import { useTranslation } from '@/i18n';
import { BRUSH_SIZES } from '@doodledraw/shared';
import { cn } from '@/utils/cn';

type ToolType = 'pen' | 'eraser' | 'fill';

const tools: { type: ToolType; key: string; icon: string }[] = [
  { type: 'pen', key: 'tool.pen', icon: '✏️' },
  { type: 'eraser', key: 'tool.eraser', icon: '🧹' },
  { type: 'fill', key: 'tool.fill', icon: '🪣' },
];

export default function ToolBar() {
  const { tool, brushSize, setTool, setBrushSize } = useDrawingStore();
  const { socket } = useSocket();
  const { t } = useTranslation();

  const handleClear = () => {
    // Dispatch a local clear event so the drawer's canvas clears immediately.
    window.dispatchEvent(new CustomEvent('doodledraw:localClear'));
    socket.current?.emit('draw:clear');
  };

  const handleUndo = () => {
    // Dispatch a local undo event so the drawer's canvas reverts immediately.
    window.dispatchEvent(new CustomEvent('doodledraw:localUndo'));
    socket.current?.emit('draw:undo');
  };

  return (
    <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-surface-800 rounded-card shadow-game px-3 py-2">
      {/* Tools */}
      {tools.map(tl => (
        <motion.button
          key={tl.type}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setTool(tl.type)}
          className={cn(
            'w-11 h-11 rounded-button flex items-center justify-center text-lg transition-all',
            tool === tl.type
              ? 'bg-primary-500 shadow-md'
              : 'bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600'
          )}
          title={t(tl.key)}
        >
          {tl.icon}
        </motion.button>
      ))}

      <div className="w-px h-8 bg-surface-200 dark:bg-surface-700 mx-1" />

      {/* Brush Sizes */}
      {BRUSH_SIZES.map(size => (
        <motion.button
          key={size}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setBrushSize(size)}
          className={cn(
            'w-11 h-11 rounded-button flex items-center justify-center transition-all',
            brushSize === size
              ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500'
              : 'bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600'
          )}
          title={t('tool.size', { size })}
        >
          <div
            className="rounded-full bg-surface-800 dark:bg-surface-200"
            style={{ width: Math.min(size, 24), height: Math.min(size, 24) }}
          />
        </motion.button>
      ))}

      <div className="w-px h-8 bg-surface-200 dark:bg-surface-700 mx-1" />

      {/* Undo */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleUndo}
        className="w-11 h-11 rounded-button bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 flex items-center justify-center transition-all"
        title={t('tool.undo')}
      >
        ↩️
      </motion.button>

      {/* Clear */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleClear}
        className="w-11 h-11 rounded-button bg-danger-500/10 hover:bg-danger-500/20 flex items-center justify-center transition-all"
        title={t('tool.clear')}
      >
        🗑️
      </motion.button>
    </div>
  );
}
