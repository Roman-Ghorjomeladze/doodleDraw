import { useEffect } from 'react';
import { useAdminStore } from '@/stores/adminStore';
import { getAvatarDataUri } from '@/utils/avatars';

const endReasonColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300',
  admin_ended: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300',
  cleaned_up: 'bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300',
  abandoned: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
};

export default function AdminGameDetail() {
  const { selectedGame, selectedGameId, fetchGame, setSelectedGameId } = useAdminStore();

  useEffect(() => {
    if (selectedGameId) fetchGame(selectedGameId);
  }, [selectedGameId, fetchGame]);

  if (!selectedGameId || !selectedGame) {
    return (
      <div className="text-surface-500 p-4">
        Loading game...
      </div>
    );
  }

  const g = selectedGame;
  const winner = g.winnerTeam
    ? `Team ${g.winnerTeam}`
    : g.winnerPersistentId
      ? g.players.find((p) => p.persistentId === g.winnerPersistentId)?.nickname ?? 'Unknown'
      : 'No winner';

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setSelectedGameId(null)}
          className="text-sm text-surface-500 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400"
        >
          ← Back to games
        </button>
      </div>

      <h2 className="text-xl font-bold mb-4 text-surface-900 dark:text-surface-50">
        Game {g.roomId}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-surface-500 uppercase mb-1">Mode</div>
          <div className="font-semibold capitalize">{g.mode}</div>
        </div>
        <div className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-surface-500 uppercase mb-1">Winner</div>
          <div className="font-semibold">{winner}</div>
        </div>
        <div className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-surface-500 uppercase mb-1">End reason</div>
          <span
            className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${endReasonColors[g.endReason] || ''}`}
          >
            {g.endReason}
          </span>
        </div>
        <div className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-surface-500 uppercase mb-1">Final phase</div>
          <div className="font-semibold">{g.finalPhase}</div>
        </div>
        <div className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-surface-500 uppercase mb-1">Rounds played</div>
          <div className="font-semibold">{g.roundsPlayed} / {g.totalRounds}</div>
        </div>
        <div className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-surface-500 uppercase mb-1">Language</div>
          <div className="font-semibold">{g.language}</div>
        </div>
      </div>

      {g.mode === 'team' && (
        <div className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-sm mb-4">
          <h3 className="text-sm font-semibold text-surface-500 mb-2">Team scores</h3>
          <div className="flex gap-4">
            <div>
              <span className="text-xs text-surface-500">Team A</span>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{g.teamAScore}</div>
            </div>
            <div>
              <span className="text-xs text-surface-500">Team B</span>
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{g.teamBScore}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-sm mb-4">
        <h3 className="text-sm font-semibold text-surface-500 mb-2">Players ({g.players.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-700 text-left">
                <th className="py-2 px-2 text-surface-500 font-medium"></th>
                <th className="py-2 px-2 text-surface-500 font-medium">Nickname</th>
                <th className="py-2 px-2 text-surface-500 font-medium">Score</th>
                <th className="py-2 px-2 text-surface-500 font-medium">Team</th>
                <th className="py-2 px-2 text-surface-500 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody>
              {g.players.map((p) => (
                <tr
                  key={p.persistentId}
                  className="border-b border-surface-100 dark:border-surface-700/50"
                >
                  <td className="py-2 px-2">
                    <img
                      src={getAvatarDataUri(p.avatar)}
                      alt={p.nickname}
                      className="w-7 h-7 rounded-full"
                    />
                  </td>
                  <td className="py-2 px-2 font-medium">
                    {p.nickname}
                    {p.persistentId === g.winnerPersistentId && (
                      <span className="ml-1">🥇</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-surface-700 dark:text-surface-300">
                    {p.finalScore}
                  </td>
                  <td className="py-2 px-2 text-surface-700 dark:text-surface-300">
                    {p.team ?? '—'}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex gap-1 flex-wrap">
                      {p.isHost && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">HOST</span>}
                      {p.isBot && <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-300">BOT</span>}
                      {!p.wasConnected && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">DC</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-surface-500 mb-2">Timestamps</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-xs text-surface-500">Started:</span>{' '}
            <span className="text-surface-700 dark:text-surface-300">{new Date(g.startedAt).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-xs text-surface-500">Ended:</span>{' '}
            <span className="text-surface-700 dark:text-surface-300">{new Date(g.endedAt).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
