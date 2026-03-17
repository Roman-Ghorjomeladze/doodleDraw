import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '@/stores/gameStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useGame } from '@/hooks/useGame';
import { useTranslation } from '@/i18n';
import { getAvatarSvg } from '@/utils/avatars';

interface GuessingChatProps {
  isDrawer: boolean;
  isLobby?: boolean;
  /** Input on top, newest messages first (for mobile inline chat) */
  invertLayout?: boolean;
  /** Show expand button in header; called when user clicks it */
  onExpand?: () => void;
  /** Align messages to the bottom of the container (latest near input) */
  bottomAligned?: boolean;
  /** Show player avatars next to messages */
  showAvatars?: boolean;
  /** Show close button in header; called when user clicks it */
  onClose?: () => void;
  /** Props to spread on the header for drag-to-dismiss */
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export default function GuessingChat({ isDrawer, isLobby, invertLayout, onExpand, bottomAligned, showAvatars, onClose, dragHandleProps }: GuessingChatProps) {
  const { messages, players } = useGameStore();
  const { isSpectator } = usePlayerStore();
  const { sendGuess } = useGame();
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearEdgeRef = useRef(true);

  const disabled = !isLobby && isDrawer && !isSpectator;

  // Build avatar lookup map
  const avatarMap = useMemo(() => {
    if (!showAvatars) return null;
    const map = new Map<string, string>();
    for (const p of players) {
      map.set(p.id, p.avatar);
    }
    return map;
  }, [showAvatars, players]);

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
        className="w-full px-3 py-2.5 rounded-button bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm disabled:opacity-50 transition-all placeholder:text-surface-400 dark:placeholder:text-surface-500"
      />
    </form>
  );

  const messagesArea = (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className={`flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1 ${bottomAligned ? 'flex flex-col justify-end' : ''}`}
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {displayMessages.map(msg => {
          const avatarKey = avatarMap?.get(msg.playerId);
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: invertLayout ? -10 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-sm py-1 px-2 rounded flex items-center gap-2 ${
                msg.isCorrectGuess
                  ? 'bg-success-500/10 text-success-600 dark:text-success-400 font-semibold'
                  : msg.isCloseGuess
                    ? 'bg-warning-500/10 text-warning-500'
                    : msg.isSystemMessage
                      ? 'text-surface-500 italic text-xs'
                      : 'text-surface-800 dark:text-surface-200'
              }`}
            >
              {showAvatars && !msg.isSystemMessage && avatarKey && (
                <img
                  src={`data:image/svg+xml;utf8,${encodeURIComponent(getAvatarSvg(avatarKey))}`}
                  alt=""
                  className="w-7 h-7 rounded-full flex-shrink-0"
                />
              )}
              <span>
                {!msg.isSystemMessage && (
                  <span className="font-semibold mr-1">{msg.nickname}:</span>
                )}
                {msg.text}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  return (
    <div className={`h-full flex flex-col overflow-hidden ${onClose ? '' : 'bg-white dark:bg-surface-800 rounded-card shadow-game'}`}>
      <div {...dragHandleProps} className={`px-3 py-2.5 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between ${dragHandleProps ? 'touch-none cursor-grab active:cursor-grabbing' : ''}`}>
        <h3 className="font-bold text-base text-surface-900 dark:text-surface-100">{t('chat.title')}</h3>
        <div className="flex items-center gap-1">
          {onExpand && (
            <button
              onClick={onExpand}
              className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
              aria-label={t('chat.expand')}
              title={t('chat.expand')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-600 dark:text-surface-300 transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
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
