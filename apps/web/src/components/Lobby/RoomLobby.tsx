import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '@/stores/gameStore';
import { useGame } from '@/hooks/useGame';
import { useTranslation } from '@/i18n';
import PlayerList from './PlayerList';
import GuessingChat from '@/components/Game/GuessingChat';
import ConfirmModal from '@/components/UI/ConfirmModal';
import { DEFAULT_ROOM_SETTINGS, MIN_PLAYERS_CLASSIC, MIN_PLAYERS_TEAM } from '@doodledraw/shared';

export default function RoomLobby() {
  const { roomId, mode, players, isHost, settings, countdownSeconds } = useGameStore();
  const { startGame, cancelStartGame, leaveRoom, updateSettings } = useGame();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const minPlayers = mode === 'team' ? MIN_PLAYERS_TEAM : MIN_PLAYERS_CLASSIC;
  const canStart = players.length >= minPlayers;

  const currentSettings = settings || DEFAULT_ROOM_SETTINGS;

  const isCountingDown = countdownSeconds !== null && countdownSeconds > 0;

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-surface-800 rounded-card shadow-game-lg p-6 relative overflow-hidden"
      >
        {/* Countdown Overlay */}
        <AnimatePresence>
          {isCountingDown && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center"
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
        </AnimatePresence>

        {/* Room Info */}
        <div className="text-center mb-6">
          <p className="text-sm text-surface-500 mb-1">{t('lobby.roomCode')}</p>
          <button
            onClick={() => {
              if (!roomId) return;
              const url = `${window.location.origin}/game/${roomId}`;
              navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className={`text-3xl font-bold font-mono tracking-widest transition-colors ${
              copied
                ? 'text-success-600 dark:text-success-400'
                : 'text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300'
            }`}
          >
            {copied ? '✓ Copied!' : roomId}
          </button>
          <p className="text-xs text-surface-400 mt-1">{copied ? '\u00A0' : t('lobby.clickToCopy')}</p>
          <div className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
            {mode === 'classic' ? t('lobby.classicMode') : t('lobby.teamBattle')}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Players */}
          <div>
            <h3 className="font-semibold mb-3">
              {t('lobby.players')} ({players.length}/{currentSettings.maxPlayers})
            </h3>
            <PlayerList players={players} mode={mode || 'classic'} teamAName={currentSettings.teamAName} teamBName={currentSettings.teamBName} />
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
            </div>
          </div>
        </div>

        {/* Lobby Chat */}
        <div className="mt-6 h-48">
          <GuessingChat isDrawer={false} isLobby />
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowLeaveConfirm(true)}
            className="px-6 py-3 rounded-button bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 font-semibold transition-all"
          >
            {t('lobby.leave')}
          </motion.button>
          {isHost && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startGame}
              disabled={!canStart}
              className="flex-1 py-3 bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-600 text-white font-bold rounded-button shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {canStart ? t('lobby.startGame') : t('lobby.needMorePlayers', { count: minPlayers - players.length })}
            </motion.button>
          )}
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
    </div>
  );
}
