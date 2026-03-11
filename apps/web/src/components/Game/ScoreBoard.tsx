import { motion } from 'motion/react';
import { useGameStore } from '@/stores/gameStore';
import { useGame } from '@/hooks/useGame';
import { useTranslation } from '@/i18n';

export default function ScoreBoard() {
  const { scores, mode, teamAScore, teamBScore, settings } = useGameStore();
  const { leaveRoom } = useGame();
  const { t } = useTranslation();
  const teamAName = settings?.teamAName || 'Team A';
  const teamBName = settings?.teamBName || 'Team B';

  const sortedScores = [...scores].sort((a, b) => b.score - a.score);
  const maxScore = sortedScores[0]?.score || 1;

  return (
    <div className="max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-surface-800 rounded-card shadow-game-lg p-6"
      >
        <h2 className="text-2xl font-bold text-center mb-6">{t('score.gameOver')}</h2>

        {mode === 'team' && (
          <div className="flex items-center justify-center gap-8 mb-6">
            <div className={`text-center ${teamAScore > teamBScore ? 'scale-110' : ''}`}>
              <div className="text-xs font-bold text-team-a uppercase">{teamAName}</div>
              <div className="text-3xl font-bold text-team-a">{teamAScore}</div>
              {teamAScore > teamBScore && <div className="text-xs">{t('score.winner')}</div>}
            </div>
            <div className="text-surface-400 font-bold">{t('game.vs')}</div>
            <div className={`text-center ${teamBScore > teamAScore ? 'scale-110' : ''}`}>
              <div className="text-xs font-bold text-team-b uppercase">{teamBName}</div>
              <div className="text-3xl font-bold text-team-b">{teamBScore}</div>
              {teamBScore > teamAScore && <div className="text-xs">{t('score.winner')}</div>}
            </div>
          </div>
        )}

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
