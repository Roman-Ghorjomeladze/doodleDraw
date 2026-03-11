import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '@/i18n';
import type { Player, GameMode } from '@doodledraw/shared';
import Avatar from '@/components/Avatar';

interface PlayerListProps {
  players: Player[];
  mode: GameMode;
  showScores?: boolean;
  teamAName?: string;
  teamBName?: string;
}

export default function PlayerList({ players, mode, showScores = false, teamAName, teamBName }: PlayerListProps) {
  const { t } = useTranslation();
  const teamA = mode === 'team' ? players.filter(p => p.team === 'A') : [];
  const teamB = mode === 'team' ? players.filter(p => p.team === 'B') : [];

  if (mode === 'team') {
    return (
      <div className="space-y-4">
        <div>
          <div className="text-xs font-bold text-team-a mb-2 uppercase tracking-wider">{teamAName || t('player.teamA')}</div>
          <PlayerGroup players={teamA} showScores={showScores} />
        </div>
        <div>
          <div className="text-xs font-bold text-team-b mb-2 uppercase tracking-wider">{teamBName || t('player.teamB')}</div>
          <PlayerGroup players={teamB} showScores={showScores} />
        </div>
      </div>
    );
  }

  return <PlayerGroup players={players} showScores={showScores} />;
}

function PlayerGroup({ players, showScores }: { players: Player[]; showScores: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <AnimatePresence>
        {players.map(player => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            layout
            className={`flex items-center gap-2.5 py-2 px-3 rounded-button ${
              player.isDrawing ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-surface-50 dark:bg-surface-800'
            } ${!player.isConnected ? 'opacity-50' : ''}`}
          >
            <Avatar seed={player.avatar} size={32} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium truncate">{player.nickname}</span>
                {player.isHost && (
                  <span className="text-xs" title={t('player.host')}>👑</span>
                )}
                {player.isDrawing && (
                  <span className="text-xs" title={t('player.drawing')}>✏️</span>
                )}
                {player.isSpectator && (
                  <span className="text-[10px] px-1 py-0.5 rounded bg-surface-200 dark:bg-surface-600 text-surface-500 dark:text-surface-400">{t('spectator.badge')}</span>
                )}
              </div>
            </div>
            {showScores && (
              <div className="font-bold text-primary-600 dark:text-primary-400">
                {player.score}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
