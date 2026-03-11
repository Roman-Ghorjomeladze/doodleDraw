import { useAdminStore } from '@/stores/adminStore';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import AdminRoomList from './AdminRoomList';
import AdminRoomDetail from './AdminRoomDetail';
import AdminBroadcast from './AdminBroadcast';
import AdminWordStats from './AdminWordStats';

const tabs = [
  { key: 'dashboard' as const, label: 'Dashboard' },
  { key: 'rooms' as const, label: 'Rooms' },
  { key: 'broadcast' as const, label: 'Broadcast' },
  { key: 'words' as const, label: 'Words' },
];

export default function AdminPanel() {
  const { isAuthenticated, activeTab, setActiveTab, logout } = useAdminStore();

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return (
    <div className="min-h-screen bg-surface-100 dark:bg-surface-950">
      {/* Header */}
      <header className="bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-surface-900 dark:text-surface-50">
            DoodleDraw Admin
          </h1>
          <button
            onClick={logout}
            className="text-sm text-surface-500 hover:text-red-600 dark:text-surface-400 dark:hover:text-red-400 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 px-4">
        <div className="max-w-5xl mx-auto flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key || (activeTab === 'room-detail' && tab.key === 'rooms')
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-5xl mx-auto p-4">
        {activeTab === 'dashboard' && <AdminDashboard />}
        {activeTab === 'rooms' && <AdminRoomList />}
        {activeTab === 'room-detail' && <AdminRoomDetail />}
        {activeTab === 'broadcast' && <AdminBroadcast />}
        {activeTab === 'words' && <AdminWordStats />}
      </main>
    </div>
  );
}
