import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';
export type FontSize = 'standard' | 'medium' | 'large';
export type FontFamily = 'sans' | 'serif' | 'display';
export type Language = 'en' | 'ka' | 'tr' | 'ru';
export type HomeLayout = 'tabs' | 'sidebar';

interface SettingsState {
  theme: Theme;
  fontSize: FontSize;
  fontFamily: FontFamily;
  soundEnabled: boolean;
  language: Language;
  homeLayout: HomeLayout;
}

interface SettingsActions {
  toggleTheme: () => void;
  setFontSize: (size: FontSize) => void;
  setFontFamily: (family: FontFamily) => void;
  toggleSound: () => void;
  setLanguage: (language: Language) => void;
  setHomeLayout: (layout: HomeLayout) => void;
}

export type SettingsStore = SettingsState & SettingsActions;

function getSystemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: getSystemTheme(),
      fontSize: 'standard',
      fontFamily: 'sans',
      soundEnabled: true,
      language: 'en',
      homeLayout: 'sidebar',

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
      setHomeLayout: (homeLayout) => set({ homeLayout }),
    }),
    {
      name: 'doodledraw-settings',
    },
  ),
);
