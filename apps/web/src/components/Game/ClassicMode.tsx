import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '@/stores/gameStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useGame } from '@/hooks/useGame';
import { useTranslation } from '@/i18n';
import DrawingCanvas from '@/components/Canvas/DrawingCanvas';
import ToolBar from '@/components/Canvas/ToolBar';
import ColorPalette from '@/components/Canvas/ColorPalette';
import GuessingChat from './GuessingChat';
import Timer from './Timer';
import WordDisplay from './WordDisplay';
import ScoreBoard from './ScoreBoard';
import PlayerList from '@/components/Lobby/PlayerList';
import GameLeaveButton from '@/components/UI/GameLeaveButton';

function MobileChatInput({ onExpand }: { onExpand: () => void }) {
  const { sendGuess } = useGame();
  const { t } = useTranslation();
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendGuess(input.trim());
    setInput('');
  };

  return (
    <>
      <button
        onClick={onExpand}
        className="w-11 h-11 rounded-button bg-primary-500 text-white flex items-center justify-center text-lg shrink-0"
      >
        💬
      </button>
      <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t('chat.guessPlaceholder')}
          maxLength={100}
          className="flex-1 px-3 py-2 rounded-button bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm transition-all"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-button bg-primary-500 text-white text-sm font-semibold shrink-0"
        >
          ➤
        </button>
      </form>
    </>
  );
}

export default function ClassicMode() {
  const { phase, players, drawerId, wordHint, wordOptions, timeLeft, currentRound, scores, currentWord, isRedrawRound } = useGameStore();
  const { playerId, isSpectator } = usePlayerStore();
  const { selectWord } = useGame();
  const { t } = useTranslation();

  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showMobilePlayers, setShowMobilePlayers] = useState(false);
  const isDrawer = !isSpectator && drawerId === playerId;

  if (phase === 'game_end') {
    return <ScoreBoard />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Word Selection Modal */}
      <AnimatePresence>
        {phase === 'selecting_word' && isDrawer && wordOptions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white dark:bg-surface-800 rounded-card shadow-game-lg p-6 max-w-md w-full"
            >
              <h3 className="text-lg font-bold text-center mb-4">{t('game.chooseWord')}</h3>
              <div className="space-y-2">
                {wordOptions.map((option, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => selectWord(index)}
                    className="w-full py-3 px-4 rounded-button bg-surface-50 dark:bg-surface-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 border-2 border-surface-200 dark:border-surface-600 hover:border-primary-500 transition-all text-left"
                  >
                    <span className="font-bold text-lg">{option.word}</span>
                    <span className="ml-2 text-xs text-surface-500">
                      {option.difficulty === 1 ? t('lobby.easy') : option.difficulty === 2 ? t('lobby.medium') : t('lobby.hard')}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Waiting for word selection */}
      {phase === 'selecting_word' && !isDrawer && (
        <div className="text-center py-8">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-xl font-bold text-primary-600 dark:text-primary-400"
          >
            {t('game.choosingWord', { name: players.find(p => p.id === drawerId)?.nickname || '' })}
          </motion.div>
          <div className="mt-6">
            <GameLeaveButton />
          </div>
        </div>
      )}

      {/* Redraw Round Banner */}
      {isRedrawRound && (phase === 'drawing' || phase === 'selecting_word') && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-4 py-2 px-4 bg-accent-500/10 rounded-card border border-accent-500/30"
        >
          <span className="font-bold text-accent-600 dark:text-accent-400">{t('game.redrawRound')}</span>
        </motion.div>
      )}

      {/* Spectator Badge */}
      {isSpectator && (phase === 'drawing' || phase === 'round_end' || phase === 'selecting_word') && (
        <div className="text-center mb-3">
          <span className="inline-block px-3 py-1 rounded-full bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 text-sm font-semibold">
            {t('spectator.badge')}
          </span>
        </div>
      )}

      {/* Main Game Layout */}
      {(phase === 'drawing' || phase === 'round_end') && (
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_280px] gap-4">
          {/* Left Sidebar - Players */}
          <div className="hidden lg:block">
            <div className="bg-white dark:bg-surface-800 rounded-card shadow-game p-3">
              <h3 className="font-semibold text-sm mb-2">{t('lobby.players')}</h3>
              <PlayerList players={players} mode="classic" showScores />
            </div>
          </div>

          {/* Center - Canvas */}
          <div className="space-y-3">
            {/* Top Bar */}
            <div className="flex items-center justify-between bg-white dark:bg-surface-800 rounded-card shadow-game px-4 py-2">
              <div className="text-sm text-surface-500">{t('game.round', { number: currentRound })}</div>
              <WordDisplay hint={wordHint} word={isDrawer ? (currentWord || '') : undefined} isDrawer={isDrawer} />
              <Timer timeLeft={timeLeft} />
            </div>

            {/* Round End Overlay */}
            {phase === 'round_end' && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-surface-800 rounded-card shadow-game p-4 text-center"
              >
                <p className="text-lg font-bold">{t('game.wordWas')} <span className="text-primary-600 dark:text-primary-400">{currentWord}</span></p>
              </motion.div>
            )}

            {/* Canvas */}
            <DrawingCanvas isDrawer={isDrawer && phase === 'drawing'} isBlurred={false} />

            {/* Drawing Tools (only for drawer) */}
            {isDrawer && phase === 'drawing' && (
              <div className="flex flex-col sm:flex-row gap-3">
                <ToolBar />
                <ColorPalette />
              </div>
            )}
          </div>

          {/* Right Sidebar - Chat (desktop) */}
          <div className="hidden lg:block h-[calc(100vh-200px)] min-h-[400px]">
            <GuessingChat isDrawer={isDrawer} />
          </div>
        </div>
      )}

      {/* Mobile Overlays */}
      {(phase === 'drawing' || phase === 'round_end') && (
        <>
          {/* Mobile player list overlay */}
          {showMobilePlayers && (
            <div className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm flex items-end p-4" onClick={() => setShowMobilePlayers(false)}>
              <div className="w-full max-h-[50vh] bg-white dark:bg-surface-800 rounded-card shadow-game-lg overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-semibold text-sm mb-2">{t('lobby.players')}</h3>
                <PlayerList players={players} mode="classic" showScores />
              </div>
            </div>
          )}

          {/* Full chat overlay */}
          {showMobileChat && (
            <div className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm flex items-end p-4" onClick={() => setShowMobileChat(false)}>
              <div className="w-full h-[60vh] rounded-card overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <GuessingChat isDrawer={isDrawer} />
              </div>
            </div>
          )}

          {/* Mobile bottom bar */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-surface-800 border-t border-surface-200 dark:border-surface-700 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center gap-2">
            {/* Player count button */}
            <button
              onClick={() => setShowMobilePlayers(!showMobilePlayers)}
              className="w-11 h-11 rounded-button bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 flex items-center justify-center text-xs font-bold shrink-0"
            >
              {players.length}P
            </button>

            {!isDrawer && phase === 'drawing' ? (
              <MobileChatInput onExpand={() => setShowMobileChat(true)} />
            ) : (
              <button
                onClick={() => setShowMobileChat(!showMobileChat)}
                className="flex-1 py-2.5 px-4 rounded-button bg-surface-50 dark:bg-surface-700 text-sm text-surface-500 text-center"
              >
                💬 {t('chat.title')}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
