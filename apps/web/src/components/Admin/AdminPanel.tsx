import { useAdminStore, type AdminTab } from '@/stores/adminStore';
import AdminDashboard from './AdminDashboard';
import AdminRoomList from './AdminRoomList';
import AdminRoomDetail from './AdminRoomDetail';
import AdminBroadcast from './AdminBroadcast';
import AdminWordStats from './AdminWordStats';
import AdminUsersList from './AdminUsersList';
import AdminGameHistoryList from './AdminGameHistoryList';
import AdminGameDetail from './AdminGameDetail';
import AdminFeedbackList from './AdminFeedbackList';
import AdminFeedbackDetail from './AdminFeedbackDetail';

const tabs: Array<{ key: AdminTab; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'rooms', label: 'Rooms' },
  { key: 'users', label: 'Users' },
  { key: 'games', label: 'Games' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'broadcast', label: 'Broadcast' },
  { key: 'words', label: 'Words' },
];

export default function AdminPanel() {
  const { activeTab, setActiveTab, exit, error } = useAdminStore();

  /** Which primary tab should highlight for the current view. */
  const activeKey: AdminTab =
    activeTab === 'room-detail'
      ? 'rooms'
      : activeTab === 'game-detail'
        ? 'games'
        : activeTab === 'feedback-detail'
          ? 'feedback'
          : activeTab;

  return (
    <div className="h-dvh flex flex-col bg-surface-100 dark:bg-surface-950 text-surface-900 dark:text-surface-50">
      {/* Header */}
      <header className="shrink-0 bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">DoodleDraw Admin</h1>
          <button
            onClick={exit}
            className="text-sm text-surface-500 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 transition-colors"
          >
            Exit
          </button>
        </div>
      </header>

      {/* Nav */}
      <nav className="shrink-0 bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 px-4 overflow-x-auto">
        <div className="max-w-5xl mx-auto flex gap-1 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeKey === tab.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Error banner */}
      {error && (
        <div className="shrink-0 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-2">
          <div className="max-w-5xl mx-auto text-sm text-red-700 dark:text-red-300">{error}</div>
        </div>
      )}

      {/* Content — this is the scroll container. Fixes the Words-tab scroll bug. */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4">
          {activeTab === 'dashboard' && <AdminDashboard />}
          {activeTab === 'rooms' && <AdminRoomList />}
          {activeTab === 'room-detail' && <AdminRoomDetail />}
          {activeTab === 'users' && <AdminUsersList />}
          {activeTab === 'games' && <AdminGameHistoryList />}
          {activeTab === 'game-detail' && <AdminGameDetail />}
          {activeTab === 'feedback' && <AdminFeedbackList />}
          {activeTab === 'feedback-detail' && <AdminFeedbackDetail />}
          {activeTab === 'broadcast' && <AdminBroadcast />}
          {activeTab === 'words' && <AdminWordStats />}
        </div>
      </main>
    </div>
  );
}
