import { motion, AnimatePresence } from 'motion/react';
import { useSocket } from '@/hooks/useSocket';
import { useGameStore } from '@/stores/gameStore';
import { useTranslation } from '@/i18n';

/**
 * Full-width banner that appears when the socket connection is lost.
 * Shows reconnection progress and a manual reconnect button.
 */
export default function ConnectionStatus() {
  const { connected, reconnecting, reconnectAttempt, reconnectFailed, manualReconnect } = useSocket();
  const roomId = useGameStore((s) => s.roomId);
  const { t } = useTranslation();

  // Only show when disconnected AND the user is in a room (or was in one)
  const show = !connected && roomId;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="bg-warning-500 dark:bg-warning-600 text-white px-4 py-2.5">
            <div className="container mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {/* Pulsing dot */}
                {reconnecting && (
                  <span className="relative flex h-3 w-3 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                  </span>
                )}
                {reconnectFailed && (
                  <span className="text-lg shrink-0">&#x26A0;</span>
                )}
                {!reconnecting && !reconnectFailed && (
                  <span className="relative flex h-3 w-3 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                  </span>
                )}

                <span className="text-sm font-semibold truncate">
                  {reconnectFailed
                    ? t('connection.failed')
                    : reconnecting
                      ? t('connection.reconnecting', { attempt: reconnectAttempt })
                      : t('connection.lost')}
                </span>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={manualReconnect}
                className="shrink-0 px-3 py-1 text-sm font-bold rounded-button bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors"
              >
                {t('connection.reconnect')}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
