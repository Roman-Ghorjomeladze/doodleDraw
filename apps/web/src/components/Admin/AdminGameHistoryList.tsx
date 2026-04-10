import { useEffect, useState } from 'react';
import { useAdminStore } from '@/stores/adminStore';
import Pagination from '@/components/UI/Pagination';

const endReasonColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300',
  admin_ended: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300',
  cleaned_up: 'bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300',
  abandoned: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
};

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return iso;
  }
}

export default function AdminGameHistoryList() {
  const { games, gamePagination, fetchGames, setSelectedGameId } = useAdminStore();
  const [page, setPage] = useState(1);
  const [endReason, setEndReason] = useState('');
  const [playerPersistentId, setPlayerPersistentId] = useState('');

  // Reset page when filters change.
  useEffect(() => {
    setPage(1);
  }, [endReason, playerPersistentId]);

  useEffect(() => {
    fetchGames({
      page,
      endReason: endReason || undefined,
      playerPersistentId: playerPersistentId.trim() || undefined,
    });
  }, [page, endReason, playerPersistentId, fetchGames]);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-surface-900 dark:text-surface-50">Game history</h2>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={endReason}
          onChange={(e) => setEndReason(e.target.value)}
          className="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All end reasons</option>
          <option value="completed">Completed</option>
          <option value="admin_ended">Admin ended</option>
          <option value="cleaned_up">Cleaned up</option>
          <option value="abandoned">Abandoned</option>
        </select>
        <input
          type="text"
          value={playerPersistentId}
          onChange={(e) => setPlayerPersistentId(e.target.value)}
          placeholder="Filter by player persistentId"
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm overflow-hidden">
        {games.length === 0 ? (
          <div className="p-6 text-center text-surface-500">No games found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700 text-left">
                  <th className="py-2 px-3 text-surface-500 font-medium">Ended</th>
                  <th className="py-2 px-3 text-surface-500 font-medium">Room</th>
                  <th className="py-2 px-3 text-surface-500 font-medium">Mode</th>
                  <th className="py-2 px-3 text-surface-500 font-medium">Players</th>
                  <th className="py-2 px-3 text-surface-500 font-medium">Phase</th>
                  <th className="py-2 px-3 text-surface-500 font-medium">End reason</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g) => (
                  <tr
                    key={g._id}
                    onClick={() => setSelectedGameId(g._id)}
                    className="border-b border-surface-100 dark:border-surface-700/50 hover:bg-surface-50 dark:hover:bg-surface-700/30 cursor-pointer"
                  >
                    <td className="py-2 px-3 text-surface-700 dark:text-surface-300 whitespace-nowrap">
                      {formatDateTime(g.endedAt)}
                    </td>
                    <td className="py-2 px-3 font-mono text-xs">{g.roomId}</td>
                    <td className="py-2 px-3 capitalize">{g.mode}</td>
                    <td className="py-2 px-3 text-surface-700 dark:text-surface-300">
                      {g.players.length}
                    </td>
                    <td className="py-2 px-3 text-xs text-surface-500">{g.finalPhase}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-medium ${endReasonColors[g.endReason] || ''}`}
                      >
                        {g.endReason}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {gamePagination && (
        <Pagination
          currentPage={gamePagination.page}
          totalPages={gamePagination.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
