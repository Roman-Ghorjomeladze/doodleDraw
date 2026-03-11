import { useEffect, useState } from 'react';
import { useAdminStore } from '@/stores/adminStore';

export default function AdminRoomDetail() {
  const {
    selectedRoomId,
    selectedRoom,
    fetchRoom,
    endGame,
    kickPlayer,
    setSelectedRoomId,
    setActiveTab,
  } = useAdminStore();
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRoomId) return;
    fetchRoom(selectedRoomId);
    const interval = setInterval(() => fetchRoom(selectedRoomId), 5000);
    return () => clearInterval(interval);
  }, [selectedRoomId, fetchRoom]);

  const handleBack = () => {
    setSelectedRoomId(null);
    setActiveTab('rooms');
  };

  const handleEndGame = async () => {
    if (!selectedRoomId) return;
    try {
      const msg = await endGame(selectedRoomId);
      setActionMsg(msg);
      fetchRoom(selectedRoomId);
    } catch (err: any) {
      setActionMsg(err.message);
    }
  };

  const handleKick = async (playerId: string) => {
    if (!selectedRoomId) return;
    try {
      const msg = await kickPlayer(selectedRoomId, playerId);
      setActionMsg(msg);
      fetchRoom(selectedRoomId);
    } catch (err: any) {
      setActionMsg(err.message);
    }
  };

  if (!selectedRoom) {
    return <div className="text-surface-500 p-4">Loading...</div>;
  }

  const isGameActive = !['lobby', 'game_end'].includes(selectedRoom.phase);

  return (
    <div>
      <button
        onClick={handleBack}
        className="text-sm text-primary-600 dark:text-primary-400 hover:underline mb-4 inline-block"
      >
        &larr; Back to rooms
      </button>

      <div className="bg-white dark:bg-surface-800 rounded-xl p-5 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50">
            Room {selectedRoom.id}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300">
              {selectedRoom.mode}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
              {selectedRoom.phase}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-surface-500 dark:text-surface-400">Round:</span>{' '}
            <span className="font-medium text-surface-900 dark:text-surface-50">
              {selectedRoom.currentRound}
            </span>
          </div>
          {selectedRoom.mode === 'team' && (
            <>
              <div>
                <span className="text-surface-500 dark:text-surface-400">Team A:</span>{' '}
                <span className="font-medium text-surface-900 dark:text-surface-50">
                  {selectedRoom.teamAScore}
                </span>
              </div>
              <div>
                <span className="text-surface-500 dark:text-surface-400">Team B:</span>{' '}
                <span className="font-medium text-surface-900 dark:text-surface-50">
                  {selectedRoom.teamBScore}
                </span>
              </div>
            </>
          )}
          {selectedRoom.isRedrawRound && (
            <div className="text-orange-600 dark:text-orange-400 font-medium">Redraw Round</div>
          )}
        </div>

        {isGameActive && (
          <button
            onClick={handleEndGame}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Force End Game
          </button>
        )}
      </div>

      {actionMsg && (
        <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-lg text-sm">
          {actionMsg}
        </div>
      )}

      <div className="bg-white dark:bg-surface-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-surface-500 dark:text-surface-400 mb-3">
          Players ({selectedRoom.players.length})
        </h3>
        <div className="space-y-2">
          {selectedRoom.players.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-50 dark:bg-surface-700/50"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${p.isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                />
                <span className="font-medium text-surface-900 dark:text-surface-50">
                  {p.nickname}
                </span>
                {p.isHost && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                    Host
                  </span>
                )}
                {p.team && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-surface-200 dark:bg-surface-600 text-surface-600 dark:text-surface-300">
                    Team {p.team}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-surface-500 dark:text-surface-400">
                  {p.score} pts
                </span>
                <button
                  onClick={() => handleKick(p.id)}
                  className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded transition-colors"
                >
                  Kick
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
