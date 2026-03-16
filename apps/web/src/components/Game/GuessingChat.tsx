import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '@/stores/gameStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useGame } from '@/hooks/useGame';
import { useTranslation } from '@/i18n';

interface GuessingChatProps {
  isDrawer: boolean;
  isLobby?: boolean;
  /** Input on top, newest messages first (for mobile inline chat) */
  invertLayout?: boolean;
}

export default function GuessingChat({ isDrawer, isLobby, invertLayout }: GuessingChatProps) {
  const { messages } = useGameStore();
  const { isSpectator } = usePlayerStore();
  const { sendGuess } = useGame();
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearEdgeRef = useRef(true);

  const disabled = !isLobby && isDrawer && !isSpectator;

  // For inverted layout, show newest messages first (top)
  const displayMessages = useMemo(
    () => (invertLayout ? [...messages].reverse() : messages),
    [messages, invertLayout],
  );

  // Track whether user is near the "latest messages" edge
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (invertLayout) {
      // Inverted: newest at top, so "near edge" = scrolled near the top
      isNearEdgeRef.current = el.scrollTop < 60;
    } else {
      isNearEdgeRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    }
  }, [invertLayout]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    // If user is the drawer (not lobby, not spectator), don't auto-scroll at all
    if (!isLobby && isDrawer && !isSpectator) return;

    // Only auto-scroll if user is near the latest messages
    if (!isNearEdgeRef.current) return;

    if (invertLayout) {
      // Inverted: newest at top, scroll to top
      el.scrollTop = 0;
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isDrawer, isLobby, isSpectator, invertLayout]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    sendGuess(input.trim());
    setInput('');
  };

  const inputForm = (
    <form onSubmit={handleSubmit} className={`p-2 ${invertLayout ? 'border-b' : 'border-t'} border-surface-200 dark:border-surface-700`}>
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={isLobby ? t('chat.lobbyPlaceholder') : isSpectator ? t('chat.spectatorPlaceholder') : isDrawer ? t('chat.youreDrawing') : t('chat.guessPlaceholder')}
        disabled={disabled}
        maxLength={100}
        className="w-full px-3 py-2 rounded-button bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm disabled:opacity-50 transition-all"
      />
    </form>
  );

  const messagesArea = (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-3 space-y-1"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {displayMessages.map(msg => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: invertLayout ? -10 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-sm py-1 px-2 rounded ${
              msg.isCorrectGuess
                ? 'bg-success-500/10 text-success-600 dark:text-success-400 font-semibold'
                : msg.isCloseGuess
                  ? 'bg-warning-500/10 text-warning-500'
                  : msg.isSystemMessage
                    ? 'text-surface-500 italic text-xs'
                    : ''
            }`}
          >
            {!msg.isSystemMessage && (
              <span className="font-semibold mr-1">{msg.nickname}:</span>
            )}
            {msg.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white dark:bg-surface-800 rounded-card shadow-game overflow-hidden">
      <div className="px-3 py-2 border-b border-surface-200 dark:border-surface-700">
        <h3 className="font-semibold text-sm">{t('chat.title')}</h3>
      </div>

      {invertLayout ? (
        <>
          {inputForm}
          {messagesArea}
        </>
      ) : (
        <>
          {messagesArea}
          {inputForm}
        </>
      )}
    </div>
  );
}
