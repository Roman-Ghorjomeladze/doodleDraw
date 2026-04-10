import { useEffect } from 'react';
import { useAdminStore } from '@/stores/adminStore';

const reasonLabels: Record<string, string> = {
  admin_ended: 'Admin ended',
  cleaned_up: 'Cleaned up',
  abandoned: 'Abandoned',
};

const reasonColors: Record<string, string> = {
  admin_ended: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300',
  cleaned_up: 'bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300',
  abandoned: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
};

const phaseLabels: Record<string, string> = {
  lobby: 'Lobby',
  selecting_word: 'Selecting word',
  drawing: 'Drawing',
  round_end: 'Round end',
  game_end: 'Game end',
};

export default function AdminDashboard() {
  const { dashboard, fetchDashboard } = useAdminStore();

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 5000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  if (!dashboard) {
    return <div className="text-surface-500 p-4">Loading...</div>;
  }

  const liveStats = [
    { label: 'Active Rooms', value: dashboard.totalRooms, color: 'text-primary-600 dark:text-primary-400' },
    { label: 'Total Players', value: dashboard.totalPlayers, color: 'text-accent-600 dark:text-accent-400' },
    { label: 'Connected', value: dashboard.connectedPlayers, color: 'text-green-600 dark:text-green-400' },
  ];

  const historicalStats = [
    { label: 'Games last week', value: dashboard.gamesLastWeek },
    { label: 'Games last month', value: dashboard.gamesLastMonth },
    { label: 'Games last year', value: dashboard.gamesLastYear },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-surface-900 dark:text-surface-50">Dashboard</h2>

      {/* Live stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {liveStats.map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-sm"
          >
            <div className="text-sm text-surface-500 dark:text-surface-400">{s.label}</div>
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Phase + mode breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-surface-500 dark:text-surface-400 mb-2">
            Rooms by Phase
          </h3>
          {Object.keys(dashboard.roomsByPhase).length === 0 ? (
            <div className="text-surface-400 text-sm">No active rooms</div>
          ) : (
            <div className="space-y-1">
              {Object.entries(dashboard.roomsByPhase).map(([phase, count]) => (
                <div key={phase} className="flex justify-between text-sm">
                  <span className="text-surface-700 dark:text-surface-300">{phase}</span>
                  <span className="font-semibold text-surface-900 dark:text-surface-50">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-surface-500 dark:text-surface-400 mb-2">
            Rooms by Mode
          </h3>
          {Object.keys(dashboard.roomsByMode).length === 0 ? (
            <div className="text-surface-400 text-sm">No active rooms</div>
          ) : (
            <div className="space-y-1">
              {Object.entries(dashboard.roomsByMode).map(([mode, count]) => (
                <div key={mode} className="flex justify-between text-sm">
                  <span className="text-surface-700 dark:text-surface-300">{mode}</span>
                  <span className="font-semibold text-surface-900 dark:text-surface-50">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Historical totals */}
      <h3 className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase mb-2">
        Historical stats
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {historicalStats.map((s) => (
          <div key={s.label} className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-sm">
            <div className="text-sm text-surface-500 dark:text-surface-400">{s.label}</div>
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Unfinished games breakdown */}
      <h3 className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase mb-2">
        Unfinished games
      </h3>
      <div className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold text-red-500 dark:text-red-400">
            {dashboard.unfinishedTotal}
          </span>
          <span className="text-sm text-surface-500">games never completed</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase mb-2">
              By reason
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(dashboard.unfinishedByReason).map(([reason, count]) => (
                <span
                  key={reason}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium ${reasonColors[reason] || ''}`}
                >
                  {reasonLabels[reason] || reason}: {count}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase mb-2">
              Stopped at phase
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(dashboard.unfinishedByPhase)
                .filter(([phase]) => phase !== 'game_end')
                .map(([phase, count]) => (
                  <span
                    key={phase}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300"
                  >
                    {phaseLabels[phase] || phase}: {count}
                  </span>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
