import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';
export type FontSize = 'standard' | 'medium' | 'large';
export type FontFamily = 'sans' | 'serif' | 'display';
export type Language = 'en' | 'ka' | 'tr' | 'ru';

interface SettingsState {
  theme: Theme;
  fontSize: FontSize;
  fontFamily: FontFamily;
  soundEnabled: boolean;
  language: Language;
}

interface SettingsActions {
  toggleTheme: () => void;
  setFontSize: (size: FontSize) => void;
  setFontFamily: (family: FontFamily) => void;
  toggleSound: () => void;
  setLanguage: (language: Language) => void;
}

export type SettingsStore = SettingsState & SettingsActions;

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: 'light',
      fontSize: 'standard',
      fontFamily: 'sans',
      soundEnabled: true,
      language: 'en',

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light',
        })),

      setFontSize: (fontSize) => set({ fontSize }),

      setFontFamily: (fontFamily) => set({ fontFamily }),

      toggleSound: () =>
        set((state) => ({
          soundEnabled: !state.soundEnabled,
        })),

      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'doodledraw-settings',
    },
  ),
);
