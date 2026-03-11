import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '@/stores/gameStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useGame } from '@/hooks/useGame';
import { useTranslation } from '@/i18n';

interface GuessingChatProps {
  isDrawer: boolean;
  isLobby?: boolean;
}

export default function GuessingChat({ isDrawer, isLobby }: GuessingChatProps) {
  const { messages } = useGameStore();
  const { isSpectator } = usePlayerStore();
  const { sendGuess } = useGame();
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const disabled = !isLobby && isDrawer && !isSpectator;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    sendGuess(input.trim());
    setInput('');
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-surface-800 rounded-card shadow-game overflow-hidden">
      <div className="px-3 py-2 border-b border-surface-200 dark:border-surface-700">
        <h3 className="font-semibold text-sm">{t('chat.title')}</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1" aria-live="polite">
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
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
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-2 border-t border-surface-200 dark:border-surface-700">
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
    </div>
  );
}
