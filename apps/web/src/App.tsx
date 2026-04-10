import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useGameStore } from '@/stores/gameStore';
import { useAuthStore } from '@/stores/authStore';
import { useGameEvents } from '@/hooks/useGameEvents';
import { useConfetti } from '@/hooks/useConfetti';
import { useFriendEvents } from '@/hooks/useFriendEvents';
import { useUrlSync } from '@/hooks/useUrlSync';
import HomePage from '@/components/Lobby/HomePage';
import RoomLobby from '@/components/Lobby/RoomLobby';
import GameRoom from '@/components/Game/GameRoom';
import Header from '@/components/Layout/Header';
import ConnectionStatus from '@/components/UI/ConnectionStatus';
import PlayerLeftNotice from '@/components/UI/PlayerLeftNotice';
import FriendsSidebar from '@/components/Friends/FriendsSidebar';
import GameInviteToast from '@/components/Friends/GameInviteToast';
import FeedbackModal from '@/components/Feedback/FeedbackModal';
import AdminPanel from '@/components/Admin/AdminPanel';

function NotAuthorized() {
  return (
    <div className="h-dvh flex flex-col items-center justify-center bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-50 p-6 text-center">
      <div className="text-5xl mb-3">🚫</div>
      <h1 className="text-2xl font-bold mb-2">Not authorized</h1>
      <p className="text-surface-500 mb-6 max-w-md">
        This page is only available to admins. If you believe you should have access, contact the
        administrator.
      </p>
      <button
        onClick={() => { window.location.hash = ''; }}
        className="px-5 py-2.5 rounded-button bg-primary-500 hover:bg-primary-600 text-white font-semibold transition-colors"
      >
        Go home
      </button>
    </div>
  );
}

export default function App() {
  const { theme, fontSize, fontFamily } = useSettingsStore();
  const { roomId, phase } = useGameStore();
  const isAdminUser = useAuthStore((s) => s.user?.isAdmin ?? false);
  const [isAdminRoute, setIsAdminRoute] = useState(window.location.hash === '#admin');

  // Register socket event listeners once at the top level
  useGameEvents();
  useFriendEvents();
  useConfetti();

  // Sync URL with game room state
  useUrlSync();

  useEffect(() => {
    const onHashChange = () => setIsAdminRoute(window.location.hash === '#admin');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.fontSize = fontSize;
    document.documentElement.dataset.fontFamily = fontFamily;
  }, [theme, fontSize, fontFamily]);

  if (isAdminRoute) {
    if (!isAdminUser) {
      return <NotAuthorized />;
    }
    return <AdminPanel />;
  }

  return (
    <div className="h-dvh flex flex-col bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-50 transition-colors duration-300 overflow-hidden">
      <Header />
      <ConnectionStatus />
      <main className="flex-1 flex flex-col overflow-y-auto container mx-auto px-2 sm:px-4 py-2 sm:py-6 w-full">
        {!roomId && <HomePage />}
        {roomId && phase === 'lobby' && <RoomLobby />}
        {roomId && phase !== 'lobby' && <GameRoom />}
      </main>
      <PlayerLeftNotice />
      <FriendsSidebar />
      <GameInviteToast />
      <FeedbackModal />
    </div>
  );
}
