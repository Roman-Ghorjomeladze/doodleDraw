import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useSocket } from '@/hooks/useSocket';
import { usePlayerStore } from '@/stores/playerStore';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTranslation } from '@/i18n';
import type { LobbyInfo } from '@doodledraw/shared';

export default function PublicLobbies() {
  const [lobbies, setLobbies] = useState<LobbyInfo[]>([]);
  const { socket, emit, on } = useSocket();
  const { nickname, avatar, persistentId } = usePlayerStore();
  const { isAuthenticated, user } = useAuthStore();
  const { language } = useSettingsStore();
  const { t } = useTranslation();

  useEffect(() => {
    // Register listener BEFORE emitting to avoid race condition.
    const unsub = on('lobbies:state', (data: { lobbies: LobbyInfo[] }) => {
      setLobbies(data.lobbies);
    });

    // Request current lobby state (also subscribes to updates).
    emit('lobbies:list');

    return unsub;
  }, [emit, on]);

  const handleJoin = (lobbyId: string) => {
    const nick = isAuthenticated ? user?.nickname || nickname : nickname;
    const av = isAuthenticated ? user?.avatar || avatar : avatar;
    const pid = isAuthenticated ? user?.persistentId || persistentId : persistentId;

    if (!nick) return;

    emit('lobbies:join', {
      lobbyId,
      nickname: nick,
      avatar: av,
      persistentId: pid,
      language,
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-surface-500">
        {t('lobbies.description')}
      </p>

      <div className="space-y-3">
        {lobbies.map((lobby) => (
          <motion.div
            key={lobby.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-surface-800 rounded-card shadow-game p-4 flex items-center justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">{lobby.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  lobby.status === 'in_progress'
                    ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                    : 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400'
                }`}>
                  {lobby.status === 'in_progress' ? t('lobbies.inProgress') : t('lobbies.waiting')}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-surface-500">
                <span className="capitalize">{lobby.mode}</span>
                <span>
                  <span className="font-medium text-surface-700 dark:text-surface-300">
                    {lobby.realPlayers}
                  </span>
                  /{lobby.maxPlayers} {t('lobbies.players')}
                </span>
                {lobby.realPlayers < lobby.maxPlayers && (
                  <span className="text-xs text-surface-400">
                    + {lobby.maxPlayers - lobby.realPlayers} {t('lobbies.bots')}
                  </span>
                )}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleJoin(lobby.id)}
              className="px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-button shadow-game transition-colors whitespace-nowrap"
            >
              {t('lobbies.join')}
            </motion.button>
          </motion.div>
        ))}

        {lobbies.length === 0 && (
          <div className="text-center py-8 text-surface-500">
            {t('lobbies.loading')}
          </div>
        )}
      </div>
    </div>
  );
}
