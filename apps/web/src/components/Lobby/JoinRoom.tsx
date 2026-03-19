import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useGame } from '@/hooks/useGame';
import { usePlayerStore } from '@/stores/playerStore';
import { useAuthStore } from '@/stores/authStore';
import { useGameStore } from '@/stores/gameStore';
import { useTranslation } from '@/i18n';
import { AVATAR_SEEDS, EXTRA_AVATAR_SEEDS, ROOM_CODE_LENGTH } from '@doodledraw/shared';
import Avatar from '@/components/Avatar';

/** Extract room code from URL synchronously at component init. */
function getRoomCodeFromUrl(): string[] {
  const match = window.location.pathname.match(/^\/game\/([A-Z0-9]{4,8})$/i);
  if (match) {
    const chars = match[1].toUpperCase().split('').slice(0, ROOM_CODE_LENGTH);
    while (chars.length < ROOM_CODE_LENGTH) chars.push('');
    useGameStore.getState().setPendingRoomId(null);
    return chars;
  }
  const pending = useGameStore.getState().pendingRoomId;
  if (pending) {
    const chars = pending.toUpperCase().split('').slice(0, ROOM_CODE_LENGTH);
    while (chars.length < ROOM_CODE_LENGTH) chars.push('');
    useGameStore.getState().setPendingRoomId(null);
    return chars;
  }
  return Array(ROOM_CODE_LENGTH).fill('');
}

export default function JoinRoom() {
  const { nickname, avatar, setNickname, setAvatar } = usePlayerStore();
  const { isAuthenticated } = useAuthStore();
  const { joinRoom, spectateRoom } = useGame();
  const { t } = useTranslation();

  const [code, setCode] = useState<string[]>(() => getRoomCodeFromUrl());
  const [showMore, setShowMore] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleCodeChange = (index: number, value: string) => {
    const char = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!char && value) return;

    const newCode = [...code];
    newCode[index] = char;
    setCode(newCode);

    if (char && index < ROOM_CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    let raw = e.clipboardData.getData('text').trim();

    const urlMatch = raw.match(/\/game\/([A-Z0-9]{4,8})$/i);
    if (urlMatch) {
      raw = urlMatch[1];
    }

    const pasted = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LENGTH);
    const newCode = [...code];
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);
    inputRefs.current[Math.min(pasted.length, ROOM_CODE_LENGTH - 1)]?.focus();
  };

  const roomCode = code.join('');
  const isCodeComplete = roomCode.length === ROOM_CODE_LENGTH;

  const handleJoin = () => {
    if (!nickname.trim() || !isCodeComplete) return;
    joinRoom(roomCode);
  };

  const handleSpectate = () => {
    if (!nickname.trim() || !isCodeComplete) return;
    spectateRoom(roomCode);
  };

  if (isAuthenticated) {
    return (
      <div className="flex flex-col justify-between h-full min-h-[300px] w-full">
        {/* Room Code at top */}
        <div>
          <label className="text-sm font-semibold text-surface-600 dark:text-surface-400 mb-3 block">
            {t('join.roomCode')}
          </label>
          <div className="flex gap-2 justify-center" onPaste={handlePaste}>
            {code.map((char, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                maxLength={1}
                value={char}
                onChange={e => handleCodeChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="w-11 h-13 text-center text-xl font-bold rounded-button bg-surface-50 dark:bg-surface-700 border-2 border-surface-200 dark:border-surface-600 focus:border-primary-500 focus:outline-none transition-all uppercase"
              />
            ))}
          </div>
        </div>

        {/* Buttons pinned at bottom */}
        <div className="flex gap-2 pt-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleJoin}
            disabled={!nickname.trim() || !isCodeComplete}
            className="flex-1 py-3 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-600 text-white font-bold rounded-button shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {t('home.joinRoom')}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSpectate}
            disabled={!nickname.trim() || !isCodeComplete}
            className="py-3 px-4 bg-surface-200 dark:bg-surface-700 hover:bg-surface-300 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-200 font-bold rounded-button shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
          >
            {t('spectator.spectate')}
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full">
      {/* Room Code */}
      <div>
        <label className="text-sm font-semibold text-surface-600 dark:text-surface-400 mb-2 block">
          {t('join.roomCode')}
        </label>
        <div className="flex gap-1.5 min-[380px]:gap-2 justify-center" onPaste={handlePaste}>
          {code.map((char, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              type="text"
              maxLength={1}
              value={char}
              onChange={e => handleCodeChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className="w-9 h-11 min-[380px]:w-11 min-[380px]:h-13 text-center text-lg min-[380px]:text-xl font-bold rounded-button bg-surface-50 dark:bg-surface-700 border-2 border-surface-200 dark:border-surface-600 focus:border-primary-500 focus:outline-none transition-all uppercase"
            />
          ))}
        </div>
      </div>

      {/* Nickname + Avatar (hidden when authenticated) */}
      {!isAuthenticated && (
        <>
          <div>
            <label className="text-sm font-semibold text-surface-600 dark:text-surface-400 mb-2 block">
              {t('create.nickname')}
            </label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder={t('create.nicknamePlaceholder')}
              maxLength={20}
              className="w-full px-4 py-2.5 rounded-button bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-surface-600 dark:text-surface-400 mb-2 block">
              {t('create.avatar')}
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 justify-items-center">
              {AVATAR_SEEDS.map(seed => (
                <motion.button
                  key={seed}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setAvatar(seed)}
                  className={`w-9 h-9 rounded-full transition-all p-0.5 ${
                    avatar === seed ? 'ring-2 ring-offset-2 ring-primary-500 bg-primary-100 dark:bg-primary-900/30' : ''
                  }`}
                >
                  <Avatar seed={seed} size={32} className="w-full h-full" />
                </motion.button>
              ))}
            </div>
            {showMore && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="grid grid-cols-4 sm:grid-cols-8 gap-2 justify-items-center mt-2"
              >
                {EXTRA_AVATAR_SEEDS.map(seed => (
                  <motion.button
                    key={seed}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setAvatar(seed)}
                    className={`w-9 h-9 rounded-full transition-all p-0.5 ${
                      avatar === seed ? 'ring-2 ring-offset-2 ring-primary-500 bg-primary-100 dark:bg-primary-900/30' : ''
                    }`}
                  >
                    <Avatar seed={seed} size={32} className="w-full h-full" />
                  </motion.button>
                ))}
              </motion.div>
            )}
            <button
              onClick={() => setShowMore(!showMore)}
              className="mt-2 text-xs font-medium text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              {showMore ? t('create.showLess') : t('create.showMore')}
            </button>
          </div>
        </>
      )}

      {/* Join / Spectate Buttons */}
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleJoin}
          disabled={!nickname.trim() || !isCodeComplete}
          className="flex-1 py-3 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-600 text-white font-bold rounded-button shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {t('home.joinRoom')}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSpectate}
          disabled={!nickname.trim() || !isCodeComplete}
          className="py-3 px-4 bg-surface-200 dark:bg-surface-700 hover:bg-surface-300 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-200 font-bold rounded-button shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
        >
          {t('spectator.spectate')}
        </motion.button>
      </div>
    </div>
  );
}
