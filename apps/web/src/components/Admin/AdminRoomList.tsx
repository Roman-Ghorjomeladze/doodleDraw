import { useEffect } from 'react';
import { useAdminStore } from '@/stores/adminStore';

const phaseColors: Record<string, string> = {
  lobby: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  selecting_word: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  drawing: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  round_end: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  game_end: 'bg-surface-100 text-surface-800 dark:bg-surface-700 dark:text-surface-300',
};

export default function AdminRoomList() {
  const { rooms, fetchRooms, setSelectedRoomId } = useAdminStore();

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-surface-900 dark:text-surface-50">
        Rooms ({rooms.length})
      </h2>

      {rooms.length === 0 ? (
        <div className="text-surface-500 dark:text-surface-400 bg-white dark:bg-surface-800 rounded-xl p-6 text-center">
          No active rooms
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => setSelectedRoomId(room.id)}
              className="w-full text-left bg-white dark:bg-surface-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-primary-600 dark:text-primary-400">
                    {room.id}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${phaseColors[room.phase] || ''}`}>
                    {room.phase}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300">
                    {room.mode}
                  </span>
                </div>
                <div className="text-sm text-surface-500 dark:text-surface-400">
                  {room.connectedCount}/{room.playerCount} players
                  {room.phase !== 'lobby' && (
                    <span className="ml-2">
                      Round {room.currentRound}/{room.totalRounds}
                    </span>
                  )}
                </div>
              </div>
              {room.mode === 'team' && (
                <div className="mt-1 text-xs text-surface-400">
                  Team A: {room.teamAScore} — Team B: {room.teamBScore}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
