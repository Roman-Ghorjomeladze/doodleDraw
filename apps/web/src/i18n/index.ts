import { useSettingsStore } from '@/stores/settingsStore';
import type { Language } from '@/stores/settingsStore';
import type { Translations } from './types';
import { en } from './en';
import { ka } from './ka';
import { tr } from './tr';
import { ru } from './ru';

export type { Translations };

const translations: Record<Language, Translations> = { en, ka, tr, ru };

/** Standalone translate function for use outside React components */
export function translate(key: string, params?: Record<string, string | number>): string {
  const language = useSettingsStore.getState().language;
  let text = translations[language]?.[key as keyof Translations] ?? translations.en[key as keyof Translations] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{{${k}}}`, String(v));
    }
  }
  return text;
}

export function useTranslation() {
  const language = useSettingsStore(s => s.language);

  const t = (key: string, params?: Record<string, string | number>) => {
    let text = translations[language]?.[key as keyof Translations] ?? translations.en[key as keyof Translations] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{{${k}}}`, String(v));
      }
    }
    return text;
  };

  return { t, language };
}
