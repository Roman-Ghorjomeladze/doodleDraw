import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AVATAR_SEEDS } from '@doodledraw/shared';

interface PlayerState {
  nickname: string;
  avatar: string;
  playerId: string | null;
  isSpectator: boolean;
}

interface PlayerActions {
  setNickname: (nickname: string) => void;
  setAvatar: (avatar: string) => void;
  setPlayerId: (id: string | null) => void;
  setIsSpectator: (isSpectator: boolean) => void;
}

export type PlayerStore = PlayerState & PlayerActions;

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set) => ({
      nickname: '',
      avatar: AVATAR_SEEDS[Math.floor(Math.random() * AVATAR_SEEDS.length)],
      playerId: null,
      isSpectator: false,

      setNickname: (nickname) => set({ nickname }),

      setAvatar: (avatar) => set({ avatar }),

      setPlayerId: (playerId) => set({ playerId }),

      setIsSpectator: (isSpectator) => set({ isSpectator }),
    }),
    {
      name: 'doodledraw-player',
      version: 1,
      migrate: (persisted: any, version: number) => {
        if (version === 0) {
          // Migrate from avatarColor to avatar
          const state = persisted as any;
          if (state.avatarColor && !state.avatar) {
            state.avatar = AVATAR_SEEDS[Math.floor(Math.random() * AVATAR_SEEDS.length)];
          }
          delete state.avatarColor;
        }
        return persisted;
      },
    },
  ),
);
