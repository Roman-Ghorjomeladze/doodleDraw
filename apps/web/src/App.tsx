import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useGameStore } from '@/stores/gameStore';
import { useGameEvents } from '@/hooks/useGameEvents';
import { useUrlSync } from '@/hooks/useUrlSync';
import HomePage from '@/components/Lobby/HomePage';
import RoomLobby from '@/components/Lobby/RoomLobby';
import GameRoom from '@/components/Game/GameRoom';
import Header from '@/components/Layout/Header';
import ConnectionStatus from '@/components/UI/ConnectionStatus';
import PlayerLeftNotice from '@/components/UI/PlayerLeftNotice';
import AdminPanel from '@/components/Admin/AdminPanel';

export default function App() {
  const { theme, fontSize, fontFamily } = useSettingsStore();
  const { roomId, phase } = useGameStore();
  const [isAdmin, setIsAdmin] = useState(window.location.hash === '#admin');

  // Register socket event listeners once at the top level
  useGameEvents();

  // Sync URL with game room state
  useUrlSync();

  useEffect(() => {
    const onHashChange = () => setIsAdmin(window.location.hash === '#admin');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.fontSize = fontSize;
    document.documentElement.dataset.fontFamily = fontFamily;
  }, [theme, fontSize, fontFamily]);

  if (isAdmin) {
    return <AdminPanel />;
  }

  return (
    <div className="h-dvh flex flex-col bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-50 transition-colors duration-300 overflow-hidden">
      <Header />
      <ConnectionStatus />
      <main className="flex-1 overflow-y-auto container mx-auto px-2 sm:px-4 py-2 sm:py-6 w-full">
        {!roomId && <HomePage />}
        {roomId && phase === 'lobby' && <RoomLobby />}
        {roomId && phase !== 'lobby' && <GameRoom />}
      </main>
      <PlayerLeftNotice />
    </div>
  );
}
