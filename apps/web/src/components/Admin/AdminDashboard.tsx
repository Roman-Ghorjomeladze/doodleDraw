import { useEffect } from 'react';
import { useAdminStore } from '@/stores/adminStore';

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

  const stats = [
    { label: 'Active Rooms', value: dashboard.totalRooms, color: 'text-primary-600 dark:text-primary-400' },
    { label: 'Total Players', value: dashboard.totalPlayers, color: 'text-accent-600 dark:text-accent-400' },
    { label: 'Connected', value: dashboard.connectedPlayers, color: 'text-green-600 dark:text-green-400' },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-surface-900 dark:text-surface-50">Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-sm"
          >
            <div className="text-sm text-surface-500 dark:text-surface-400">{s.label}</div>
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    </div>
  );
}
