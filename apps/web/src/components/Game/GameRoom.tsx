import { useGameStore } from '@/stores/gameStore';
import ClassicMode from './ClassicMode';
import TeamMode from './TeamMode';

export default function GameRoom() {
  const { mode } = useGameStore();

  if (mode === 'team') {
    return <TeamMode />;
  }

  return <ClassicMode />;
}
