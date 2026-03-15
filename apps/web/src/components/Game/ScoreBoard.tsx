import { motion } from 'motion/react';
import { useGameStore } from '@/stores/gameStore';
import { useGame } from '@/hooks/useGame';
import { useTranslation } from '@/i18n';
import type { GameScore } from '@doodledraw/shared';

function TeamPlayerList({
  players,
  teamColor,
  animationOffset = 0,
}: {
  players: GameScore[];
  teamColor: 'team-a' | 'team-b';
  animationOffset?: number;
}) {
  const maxScore = players[0]?.score || 1;
  const scoreTextClass = teamColor === 'team-a' ? 'text-team-a' : 'text-team-b';
  const gradientClass =
    teamColor === 'team-a'
      ? 'from-team-a/80 to-team-a'
      : 'from-team-b/80 to-team-b';

  return (
    <div className="space-y-2.5">
      {players.map((score, index) => (
        <motion.div
          key={score.playerId}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: (animationOffset + index) * 0.1 }}
          className="flex items-center gap-2.5"
        >
          <div className="w-6 text-center font-bold text-sm text-surface-400">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-sm truncate">{score.nickname}</span>
              <span className={`font-bold text-sm ${scoreTextClass} ml-2 shrink-0`}>{score.score}</span>
            </div>
            <div className="h-1.5 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(score.score / maxScore) * 100}%` }}
                transition={{ delay: (animationOffset + index) * 0.1 + 0.2, duration: 0.5, ease: 'easeOut' }}
                className={`h-full bg-gradient-to-r ${gradientClass} rounded-full`}
              />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function ScoreBoard() {
  const { scores, mode, teamAScore, teamBScore, settings } = useGameStore();
  const { leaveRoom } = useGame();
  const { t } = useTranslation();
  const teamAName = settings?.teamAName || 'Team A';
  const teamBName = settings?.teamBName || 'Team B';

  const isTeamMode = mode === 'team';

  // Classic mode: flat ranked list
  const sortedScores = [...scores].sort((a, b) => b.score - a.score);
  const maxScore = sortedScores[0]?.score || 1;

  // Team mode: group by team
  const teamAPlayers = scores
    .filter((s) => s.team === 'A')
    .sort((a, b) => b.score - a.score);
  const teamBPlayers = scores
    .filter((s) => s.team === 'B')
    .sort((a, b) => b.score - a.score);

  const teamAIsWinner = teamAScore > teamBScore;
  const teamBIsWinner = teamBScore > teamAScore;
  const isDraw = teamAScore === teamBScore;

  return (
    <div className={`${isTeamMode ? 'max-w-2xl' : 'max-w-lg'} mx-auto`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-surface-800 rounded-card shadow-game-lg p-6"
      >
        <h2 className="text-2xl font-bold text-center mb-6">{t('score.gameOver')}</h2>

        {isTeamMode && (
          <div className="flex items-center justify-center gap-8 mb-6">
            <div className={`text-center ${teamAIsWinner ? 'scale-110' : ''}`}>
              <div className="text-xs font-bold text-team-a uppercase">{teamAName}</div>
              <div className="text-3xl font-bold text-team-a">{teamAScore}</div>
              {teamAIsWinner && <div className="text-xs">{t('score.winner')}</div>}
            </div>
            <div className="text-surface-400 font-bold">{t('game.vs')}</div>
            <div className={`text-center ${teamBIsWinner ? 'scale-110' : ''}`}>
              <div className="text-xs font-bold text-team-b uppercase">{teamBName}</div>
              <div className="text-3xl font-bold text-team-b">{teamBScore}</div>
              {teamBIsWinner && <div className="text-xs">{t('score.winner')}</div>}
            </div>
          </div>
        )}

        {isTeamMode ? (
          /* Team mode: two columns with players grouped by team */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Team A */}
            <div className={`rounded-lg border-2 p-4 ${teamAIsWinner ? 'border-team-a/40 bg-team-a/5' : isDraw ? 'border-surface-200 dark:border-surface-600' : 'border-surface-200 dark:border-surface-600'}`}>
              <div className="text-sm font-bold text-team-a uppercase text-center mb-3">
                {teamAName}
              </div>
              {teamAPlayers.length > 0 ? (
                <TeamPlayerList players={teamAPlayers} teamColor="team-a" animationOffset={0} />
              ) : (
                <div className="text-center text-sm text-surface-400 py-2">{t('score.noPlayers')}</div>
              )}
            </div>

            {/* Team B */}
            <div className={`rounded-lg border-2 p-4 ${teamBIsWinner ? 'border-team-b/40 bg-team-b/5' : isDraw ? 'border-surface-200 dark:border-surface-600' : 'border-surface-200 dark:border-surface-600'}`}>
              <div className="text-sm font-bold text-team-b uppercase text-center mb-3">
                {teamBName}
              </div>
              {teamBPlayers.length > 0 ? (
                <TeamPlayerList players={teamBPlayers} teamColor="team-b" animationOffset={teamAPlayers.length} />
              ) : (
                <div className="text-center text-sm text-surface-400 py-2">{t('score.noPlayers')}</div>
              )}
            </div>
          </div>
        ) : (
          /* Classic mode: flat ranked list */
          <div className="space-y-3 mb-6">
            {sortedScores.map((score, index) => (
              <motion.div
                key={score.playerId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 text-center font-bold text-lg">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold">{score.nickname}</span>
                    <span className="font-bold text-primary-600 dark:text-primary-400">{score.score}</span>
                  </div>
                  <div className="h-2 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(score.score / maxScore) * 100}%` }}
                      transition={{ delay: index * 0.1 + 0.2, duration: 0.5, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={leaveRoom}
          className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold rounded-button shadow-md transition-all"
        >
          {t('score.backToHome')}
        </motion.button>
      </motion.div>
    </div>
  );
}
