import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useGameStore } from '@/stores/gameStore';
import { useGameEvents } from '@/hooks/useGameEvents';
import HomePage from '@/components/Lobby/HomePage';
import RoomLobby from '@/components/Lobby/RoomLobby';
import GameRoom from '@/components/Game/GameRoom';
import Header from '@/components/Layout/Header';
import AdminPanel from '@/components/Admin/AdminPanel';

export default function App() {
  const { theme, fontSize, fontFamily } = useSettingsStore();
  const { roomId, phase } = useGameStore();
  const [isAdmin, setIsAdmin] = useState(window.location.hash === '#admin');

  // Register socket event listeners once at the top level
  useGameEvents();

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
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-50 transition-colors duration-300">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {!roomId && <HomePage />}
        {roomId && phase === 'lobby' && <RoomLobby />}
        {roomId && phase !== 'lobby' && <GameRoom />}
      </main>
    </div>
  );
}
