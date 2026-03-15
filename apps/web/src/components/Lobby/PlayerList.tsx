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
}

export default function PlayerList({ players, mode, showScores = false, teamAName, teamBName, onSwitchTeam, currentPlayerId }: PlayerListProps) {
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
        />
      </div>
    );
  }

  return <PlayerGroup players={players} showScores={showScores} />;
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
      <PlayerGroup players={players} showScores={showScores} />
    </div>
  );
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
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
