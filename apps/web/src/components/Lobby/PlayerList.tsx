import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '@/i18n';
import type { Player, GameMode, Team } from '@doodledraw/shared';
import Avatar from '@/components/Avatar';

interface PlayerListProps {
  players: Player[];
  mode: GameMode;
  showScores?: boolean;
  teamAName?: string;
  teamBName?: string;
  onSwitchTeam?: (team: Team) => void;
  currentPlayerId?: string;
  onKickPlayer?: (playerId: string) => void;
  onPlayerClick?: (persistentId: string) => void;
}

export default function PlayerList({ players, mode, showScores = false, teamAName, teamBName, onSwitchTeam, currentPlayerId, onKickPlayer, onPlayerClick }: PlayerListProps) {
  const { t } = useTranslation();
  const teamA = mode === 'team' ? players.filter(p => p.team === 'A') : [];
  const teamB = mode === 'team' ? players.filter(p => p.team === 'B') : [];
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const myTeam = currentPlayer?.team;

  if (mode === 'team') {
    return (
      <div className="space-y-4">
        <TeamSection
          team="A"
          teamName={teamAName || t('player.teamA')}
          players={teamA}
          showScores={showScores}
          colorClass="text-team-a"
          borderClass="border-team-a/30"
          bgClass="bg-team-a/5 dark:bg-team-a/10"
          btnClass="bg-team-a/20 hover:bg-team-a/30 text-team-a"
          isMyTeam={myTeam === 'A'}
          onSwitchTeam={onSwitchTeam}
          currentPlayerId={currentPlayerId}
          onKickPlayer={onKickPlayer}
          onPlayerClick={onPlayerClick}
        />
        <TeamSection
          team="B"
          teamName={teamBName || t('player.teamB')}
          players={teamB}
          showScores={showScores}
          colorClass="text-team-b"
          borderClass="border-team-b/30"
          bgClass="bg-team-b/5 dark:bg-team-b/10"
          btnClass="bg-team-b/20 hover:bg-team-b/30 text-team-b"
          isMyTeam={myTeam === 'B'}
          onSwitchTeam={onSwitchTeam}
          currentPlayerId={currentPlayerId}
          onKickPlayer={onKickPlayer}
          onPlayerClick={onPlayerClick}
        />
      </div>
    );
  }

  return <PlayerGroup players={players} showScores={showScores} currentPlayerId={currentPlayerId} onKickPlayer={onKickPlayer} onPlayerClick={onPlayerClick} />;
}

function TeamSection({
  team,
  teamName,
  players,
  showScores,
  colorClass,
  borderClass,
  bgClass,
  btnClass,
  isMyTeam,
  onSwitchTeam,
  currentPlayerId,
  onKickPlayer,
  onPlayerClick,
}: {
  team: Team;
  teamName: string;
  players: Player[];
  showScores: boolean;
  colorClass: string;
  borderClass: string;
  bgClass: string;
  btnClass: string;
  isMyTeam: boolean;
  onSwitchTeam?: (team: Team) => void;
  currentPlayerId?: string;
  onKickPlayer?: (playerId: string) => void;
  onPlayerClick?: (persistentId: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className={`rounded-lg border ${borderClass} ${bgClass} p-3`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`text-xs font-bold ${colorClass} uppercase tracking-wider`}>
          {teamName} ({players.length})
        </div>
        {onSwitchTeam && !isMyTeam && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSwitchTeam(team)}
            className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${btnClass}`}
          >
            {t('player.joinTeam')}
          </motion.button>
        )}
      </div>
      <PlayerGroup players={players} showScores={showScores} currentPlayerId={currentPlayerId} onKickPlayer={onKickPlayer} onPlayerClick={onPlayerClick} />
    </div>
  );
}

function PlayerGroup({ players, showScores, currentPlayerId, onKickPlayer, onPlayerClick }: { players: Player[]; showScores: boolean; currentPlayerId?: string; onKickPlayer?: (playerId: string) => void; onPlayerClick?: (persistentId: string) => void }) {
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
            onClick={() => onPlayerClick?.(player.persistentId)}
            className={`flex items-center gap-2.5 py-2 px-3 rounded-button ${
              player.isDrawing ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-surface-50 dark:bg-surface-800'
            } ${!player.isConnected ? 'opacity-50' : ''} ${onPlayerClick ? 'cursor-pointer hover:ring-2 hover:ring-primary-300 dark:hover:ring-primary-600 transition-shadow' : ''}`}
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
                {player.isBot && (
                  <span className="text-[10px] px-1 py-0.5 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400" title="Bot">🤖</span>
                )}
                {player.isSpectator && (
                  <span className="text-[10px] px-1 py-0.5 rounded bg-surface-200 dark:bg-surface-600 text-surface-500 dark:text-surface-400">{t('spectator.badge')}</span>
                )}
                {!player.isConnected && (
                  <span className="text-[10px] px-1 py-0.5 rounded bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400">{t('connection.disconnected')}</span>
                )}
              </div>
            </div>
            {showScores && (
              <div className="font-bold text-primary-600 dark:text-primary-400">
                {player.score}
              </div>
            )}
            {onKickPlayer && !player.isHost && player.id !== currentPlayerId && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onKickPlayer(player.id)}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                title="Kick player"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </motion.button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
