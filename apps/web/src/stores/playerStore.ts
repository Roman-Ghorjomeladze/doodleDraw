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
      version: 2,
      migrate: (persisted: any, version: number) => {
        const state = persisted as any;
        if (version === 0) {
          // Migrate from avatarColor to avatar
          if (state.avatarColor && !state.avatar) {
            state.avatar = AVATAR_SEEDS[Math.floor(Math.random() * AVATAR_SEEDS.length)];
          }
          delete state.avatarColor;
        }
        if (version < 2) {
          // Migrate from funEmoji avatars to adventurer avatars
          if (state.avatar && !state.avatar.startsWith('adventurer:')) {
            state.avatar = AVATAR_SEEDS[Math.floor(Math.random() * AVATAR_SEEDS.length)];
          }
        }
        return persisted;
      },
    },
  ),
);
