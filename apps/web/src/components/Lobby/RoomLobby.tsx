import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { useGameStore } from '@/stores/gameStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useGame } from '@/hooks/useGame';
import { useTranslation } from '@/i18n';
import PlayerList from './PlayerList';
import GuessingChat from '@/components/Game/GuessingChat';
import ConfirmModal from '@/components/UI/ConfirmModal';
import { DEFAULT_ROOM_SETTINGS, MIN_PLAYERS_CLASSIC, MIN_PLAYERS_TEAM } from '@doodledraw/shared';

export default function RoomLobby() {
  const { roomId, mode, players, isHost, settings, countdownSeconds } = useGameStore();
  const { playerId } = usePlayerStore();
  const { startGame, cancelStartGame, leaveRoom, updateSettings, switchTeam, kickPlayer, addBot } = useGame();
  const { t } = useTranslation();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showExpandedChat, setShowExpandedChat] = useState(false);
  const chatDragControls = useDragControls();

  const minPlayers = mode === 'team' ? MIN_PLAYERS_TEAM : MIN_PLAYERS_CLASSIC;
  const canStart = players.length >= minPlayers;

  const currentSettings = settings || DEFAULT_ROOM_SETTINGS;

  const isCountingDown = countdownSeconds !== null && countdownSeconds > 0;

  // Lock body scroll when expanded chat is open
  useEffect(() => {
    if (showExpandedChat) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [showExpandedChat]);

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-surface-800 rounded-card shadow-game-lg p-6 relative overflow-hidden"
      >
        {/* Countdown Overlay — portalled to body so it's always visible */}
        {createPortal(
          <AnimatePresence>
            {isCountingDown && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center"
              >
                <p className="text-white/70 text-lg font-medium mb-2">
                  {t('lobby.starting')}
                </p>
                <motion.div
                  key={countdownSeconds}
                  initial={{ scale: 2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: 'spring', duration: 0.4 }}
                  className="text-8xl font-black text-white drop-shadow-lg"
                >
                  {countdownSeconds}
                </motion.div>
                {isHost && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={cancelStartGame}
                    className="mt-6 px-6 py-2 rounded-button bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors"
                  >
                    {t('lobby.cancelStart')}
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

        {/* Mode Badge */}
        <div className="text-center mb-6">
          <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
            {mode === 'classic' ? t('lobby.classicMode') : t('lobby.teamBattle')}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Players */}
          <div>
            <h3 className="font-semibold mb-3">
              {t('lobby.players')} ({players.length}/{currentSettings.maxPlayers})
            </h3>
            <PlayerList players={players} mode={mode || 'classic'} teamAName={currentSettings.teamAName} teamBName={currentSettings.teamBName} onSwitchTeam={mode === 'team' ? switchTeam : undefined} currentPlayerId={playerId || undefined} onKickPlayer={isHost ? kickPlayer : undefined} />
          </div>

          {/* Settings (host only) */}
          <div>
            <h3 className="font-semibold mb-3">{t('lobby.settings')}</h3>
            <div className="space-y-3">
              {/* Team Names (team mode only) */}
              {mode === 'team' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-team-a block mb-1">{t('lobby.teamAName')}</label>
                    <input
                      type="text"
                      value={currentSettings.teamAName}
                      onChange={e => isHost && updateSettings({ teamAName: e.target.value })}
                      disabled={!isHost}
                      maxLength={20}
                      placeholder="Team A"
                      className="w-full px-3 py-2 rounded-button bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-team-b block mb-1">{t('lobby.teamBName')}</label>
                    <input
                      type="text"
                      value={currentSettings.teamBName}
                      onChange={e => isHost && updateSettings({ teamBName: e.target.value })}
                      disabled={!isHost}
                      maxLength={20}
                      placeholder="Team B"
                      className="w-full px-3 py-2 rounded-button bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="text-xs text-surface-500 block mb-1">{t('lobby.language')}</label>
                <select
                  value={currentSettings.language}
                  onChange={e => isHost && updateSettings({ language: e.target.value })}
                  disabled={!isHost}
                  className="w-full px-3 py-2 rounded-button bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 disabled:opacity-50"
                >
                  <option value="en">{t('lang.en')}</option>
                  <option value="ka">{t('lang.ka')}</option>
                  <option value="tr">{t('lang.tr')}</option>
                  <option value="ru">{t('lang.ru')}</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-surface-500 block mb-1">{t('lobby.difficulty')}</label>
                <select
                  value={currentSettings.difficulty}
                  onChange={e => isHost && updateSettings({ difficulty: Number(e.target.value) as 1 | 2 | 3 })}
                  disabled={!isHost}
                  className="w-full px-3 py-2 rounded-button bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 disabled:opacity-50"
                >
                  <option value={1}>{t('lobby.easy')}</option>
                  <option value={2}>{t('lobby.medium')}</option>
                  <option value={3}>{t('lobby.hard')}</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-surface-500 block mb-1">{t('lobby.roundTime')}</label>
                <select
                  value={currentSettings.roundTime}
                  onChange={e => isHost && updateSettings({ roundTime: Number(e.target.value) })}
                  disabled={!isHost}
                  className="w-full px-3 py-2 rounded-button bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 disabled:opacity-50"
                >
                  <option value={60}>{t('lobby.seconds', { count: 60 })}</option>
                  <option value={80}>{t('lobby.seconds', { count: 80 })}</option>
                  <option value={100}>{t('lobby.seconds', { count: 100 })}</option>
                  <option value={120}>{t('lobby.seconds', { count: 120 })}</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-surface-500 block mb-1">{t('lobby.rounds')}</label>
                <select
                  value={currentSettings.totalRounds}
                  onChange={e => isHost && updateSettings({ totalRounds: Number(e.target.value) })}
                  disabled={!isHost}
                  className="w-full px-3 py-2 rounded-button bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 disabled:opacity-50"
                >
                  <option value={3}>{t('lobby.nRounds', { count: 3 })}</option>
                  <option value={5}>{t('lobby.nRounds', { count: 5 })}</option>
                  <option value={8}>{t('lobby.nRounds', { count: 8 })}</option>
                  <option value={13}>{t('lobby.nRounds', { count: 13 })}</option>
                </select>
              </div>
              <label className={`flex items-center gap-2 py-2 ${!isHost ? 'opacity-50' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={currentSettings.hintsEnabled}
                  onChange={e => isHost && updateSettings({ hintsEnabled: e.target.checked })}
                  disabled={!isHost}
                  className="w-4 h-4 rounded accent-primary-500"
                />
                <div>
                  <div className="text-sm font-medium">{t('lobby.hints')}</div>
                  <div className="text-xs text-surface-500">{t('lobby.hintsDesc')}</div>
                </div>
              </label>
              <label className={`flex items-center gap-2 py-2 ${!isHost ? 'opacity-50' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={currentSettings.redrawEnabled}
                  onChange={e => isHost && updateSettings({ redrawEnabled: e.target.checked })}
                  disabled={!isHost}
                  className="w-4 h-4 rounded accent-primary-500"
                />
                <div>
                  <div className="text-sm font-medium">{t('lobby.redrawRound')}</div>
                  <div className="text-xs text-surface-500">{t('lobby.redrawRoundDesc')}</div>
                </div>
              </label>
              <label className={`flex items-center gap-2 py-2 ${!isHost ? 'opacity-50' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={currentSettings.isPublic}
                  onChange={e => isHost && updateSettings({ isPublic: e.target.checked })}
                  disabled={!isHost}
                  className="w-4 h-4 rounded accent-primary-500"
                />
                <div>
                  <div className="text-sm font-medium">{t('publicRooms.publicRoom')}</div>
                  <div className="text-xs text-surface-500">{t('publicRooms.publicRoomDesc')}</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Lobby Chat */}
        <div className="mt-6 h-48">
          <GuessingChat isDrawer={false} isLobby onExpand={() => setShowExpandedChat(true)} />
        </div>

        {/* Actions */}
        <div className="mt-4 space-y-3">
          {isHost && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startGame}
              disabled={!canStart}
              className="w-full py-3 bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-600 text-white font-bold rounded-button shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {canStart ? t('lobby.startGame') : t('lobby.needMorePlayers', { count: minPlayers - players.length })}
            </motion.button>
          )}
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowLeaveConfirm(true)}
              className="flex-1 py-3 rounded-button bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 font-semibold transition-all"
            >
              {t('lobby.leave')}
            </motion.button>
            {isHost && players.length < (settings?.maxPlayers || 16) && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={addBot}
                className="flex-1 py-3 rounded-button bg-accent-500 hover:bg-accent-600 text-white font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                🤖 {t('lobby.addBot')}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Leave Confirmation Modal */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <ConfirmModal
            title={t('lobby.leaveConfirmTitle')}
            message={t('lobby.leaveConfirmMessage')}
            confirmLabel={t('lobby.confirmLeave')}
            cancelLabel={t('lobby.cancel')}
            variant="danger"
            onConfirm={() => {
              setShowLeaveConfirm(false);
              leaveRoom();
            }}
            onCancel={() => setShowLeaveConfirm(false)}
          />
        )}
      </AnimatePresence>

      {/* Expanded Chat Modal — portalled to body so it renders above the sticky header */}
      {createPortal(
        <AnimatePresence>
          {showExpandedChat && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
              onClick={() => setShowExpandedChat(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                drag="y"
                dragControls={chatDragControls}
                dragListener={false}
                dragConstraints={{ top: 0 }}
                dragElastic={0.2}
                onDragEnd={(_e, info) => {
                  if (info.offset.y > 150 || info.velocity.y > 600) {
                    setShowExpandedChat(false);
                  }
                }}
                className="max-w-lg w-full h-[100dvh] sm:h-[85vh] rounded-t-2xl sm:rounded-card bg-white dark:bg-surface-800 relative overflow-hidden"
                style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
                onClick={e => e.stopPropagation()}
              >
                {/* Drag handle */}
                <div
                  className="sm:hidden flex justify-center pt-2 pb-1 touch-none cursor-grab active:cursor-grabbing"
                  onPointerDown={(e) => chatDragControls.start(e)}
                >
                  <div className="w-10 h-1 rounded-full bg-surface-300 dark:bg-surface-600" />
                </div>
                <GuessingChat
                  isDrawer={false}
                  isLobby
                  bottomAligned
                  showAvatars
                  onClose={() => setShowExpandedChat(false)}
                  dragHandleProps={{ onPointerDown: (e) => chatDragControls.start(e) }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

    </div>
  );
}
