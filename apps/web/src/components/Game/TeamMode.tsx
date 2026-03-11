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

function TeamMobileChatInput({ onExpand }: { onExpand: () => void }) {
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

export default function TeamMode() {
  const { phase, players, drawerId, teamADrawerId, teamBDrawerId, wordHint, wordOptions, timeLeft, currentRound, teamAScore, teamBScore, currentWord, isRedrawRound, settings } = useGameStore();
  const teamAName = settings?.teamAName || 'Team A';
  const teamBName = settings?.teamBName || 'Team B';
  const { playerId, isSpectator } = usePlayerStore();
  const { selectWord } = useGame();
  const { t } = useTranslation();
  const [showMobileChat, setShowMobileChat] = useState(false);

  const currentPlayer = players.find(p => p.id === playerId);
  const myTeam = currentPlayer?.team;
  const isTeamADrawer = !isSpectator && teamADrawerId === playerId;
  const isTeamBDrawer = !isSpectator && teamBDrawerId === playerId;
  const isDrawer = isTeamADrawer || isTeamBDrawer;

  if (phase === 'game_end') {
    return <ScoreBoard />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Word Selection Modal */}
      <AnimatePresence>
        {phase === 'selecting_word' && isDrawer && wordOptions && (
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
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Team Scores Banner */}
      <div className="flex items-center justify-center gap-8 mb-4">
        <div className="text-center">
          <div className="text-xs font-bold text-team-a uppercase">{teamAName}</div>
          <div className="text-2xl font-bold text-team-a">{teamAScore}</div>
        </div>
        <div className="text-surface-400 font-bold">{t('game.vs')}</div>
        <div className="text-center">
          <div className="text-xs font-bold text-team-b uppercase">{teamBName}</div>
          <div className="text-2xl font-bold text-team-b">{teamBScore}</div>
        </div>
      </div>

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
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          <div className="space-y-3">
            {/* Top Bar */}
            <div className="flex items-center justify-between bg-white dark:bg-surface-800 rounded-card shadow-game px-4 py-2">
              <div className="text-sm text-surface-500">{t('game.round', { number: currentRound })}</div>
              <WordDisplay hint={wordHint} word={isDrawer ? (currentWord || '') : undefined} isDrawer={isDrawer} />
              <Timer timeLeft={timeLeft} />
            </div>

            {/* Dual Canvas View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-center text-sm font-bold text-team-a mb-2">{teamAName}</div>
                <DrawingCanvas
                  isDrawer={isTeamADrawer && phase === 'drawing'}
                  isBlurred={!isSpectator && myTeam === 'B'}
                />
              </div>
              <div>
                <div className="text-center text-sm font-bold text-team-b mb-2">{teamBName}</div>
                <DrawingCanvas
                  isDrawer={isTeamBDrawer && phase === 'drawing'}
                  isBlurred={!isSpectator && myTeam === 'A'}
                />
              </div>
            </div>

            {/* Drawing Tools */}
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
            {!isDrawer && phase === 'drawing' ? (
              <TeamMobileChatInput onExpand={() => setShowMobileChat(true)} />
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
