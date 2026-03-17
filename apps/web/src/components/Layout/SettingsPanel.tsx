import { motion, AnimatePresence } from 'motion/react';
import { useSettingsStore } from '@/stores/settingsStore';
import type { FontSize, FontFamily, Language, HomeLayout } from '@/stores/settingsStore';
import { useTranslation } from '@/i18n';
import ThemeToggle from './ThemeToggle';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const fontSizeOptions: { value: FontSize; key: string }[] = [
  { value: 'standard', key: 'settings.standard' },
  { value: 'medium', key: 'settings.medium' },
  { value: 'large', key: 'settings.large' },
];

const languageOptions: { value: Language; key: string }[] = [
  { value: 'en', key: 'lang.en' },
  { value: 'ka', key: 'lang.ka' },
  { value: 'tr', key: 'lang.tr' },
  { value: 'ru', key: 'lang.ru' },
];

const fontFamilyOptions: { value: FontFamily; label: string; sample: string }[] = [
  { value: 'sans', label: 'Noto Sans', sample: 'Clean & Modern' },
  { value: 'serif', label: 'Noto Serif', sample: 'Elegant & Classic' },
  { value: 'display', label: 'FiraGO', sample: 'Rounded & Playful' },
];

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { fontSize, fontFamily, soundEnabled, language, homeLayout, setFontSize, setFontFamily, toggleSound, setLanguage, setHomeLayout } = useSettingsStore();
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-80 bg-white dark:bg-surface-900 shadow-game-lg z-50 p-6 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{t('settings.title')}</h2>
              <button
                onClick={onClose}
                className="p-1 rounded-button hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Language */}
              <div>
                <label className="text-sm font-semibold text-surface-600 dark:text-surface-400 mb-2 block">
                  {t('settings.language')}
                </label>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value as Language)}
                  className="w-full px-3 py-2 rounded-button bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                >
                  {languageOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{t(opt.key)}</option>
                  ))}
                </select>
              </div>

              {/* Font Size */}
              <div>
                <label className="text-sm font-semibold text-surface-600 dark:text-surface-400 mb-2 block">
                  {t('settings.fontSize')}
                </label>
                <div className="flex gap-2">
                  {fontSizeOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFontSize(opt.value)}
                      className={`flex-1 py-2 px-3 rounded-button text-sm font-medium transition-all ${
                        fontSize === opt.value
                          ? 'bg-primary-500 text-white shadow-md'
                          : 'bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700'
                      }`}
                    >
                      {t(opt.key)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Family */}
              <div>
                <label className="text-sm font-semibold text-surface-600 dark:text-surface-400 mb-2 block">
                  {t('settings.fontStyle')}
                </label>
                <div className="space-y-2">
                  {fontFamilyOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFontFamily(opt.value)}
                      className={`w-full py-3 px-4 rounded-button text-left transition-all ${
                        fontFamily === opt.value
                          ? 'bg-primary-500 text-white shadow-md'
                          : 'bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700'
                      }`}
                    >
                      <div className="font-semibold">{opt.label}</div>
                      <div className={`text-xs mt-0.5 ${fontFamily === opt.value ? 'text-primary-100' : 'text-surface-500'}`} style={{ fontFamily: opt.value === 'sans' ? 'var(--font-sans)' : opt.value === 'serif' ? 'var(--font-serif)' : 'var(--font-display)' }}>
                        {opt.sample} - ქართული Русский Türkçe
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-surface-600 dark:text-surface-400">
                  {t('settings.theme')}
                </label>
                <ThemeToggle />
              </div>

              {/* Sound Toggle */}
              <div>
                <label className="text-sm font-semibold text-surface-600 dark:text-surface-400 mb-2 block">
                  {t('settings.soundEffects')}
                </label>
                <button
                  onClick={toggleSound}
                  className={`w-full py-2 px-4 rounded-button flex items-center justify-between transition-all ${
                    soundEnabled
                      ? 'bg-success-500 text-white'
                      : 'bg-surface-100 dark:bg-surface-800'
                  }`}
                >
                  <span>{soundEnabled ? t('settings.soundOn') : t('settings.soundOff')}</span>
                  <span className="text-lg">{soundEnabled ? '🔊' : '🔇'}</span>
                </button>
              </div>

              {/* Home Layout */}
              <div>
                <label className="text-sm font-semibold text-surface-600 dark:text-surface-400 mb-2 block">
                  {t('settings.homeLayout')}
                </label>
                <div className="flex gap-2">
                  {([
                    { value: 'tabs' as HomeLayout, key: 'home.layoutTabs', icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <line x1="3" y1="9" x2="21" y2="9" />
                      </svg>
                    )},
                    { value: 'sidebar' as HomeLayout, key: 'home.layoutSidebar', icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <line x1="9" y1="3" x2="9" y2="21" />
                      </svg>
                    )},
                  ]).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setHomeLayout(opt.value)}
                      className={`flex-1 py-2 px-3 rounded-button text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        homeLayout === opt.value
                          ? 'bg-primary-500 text-white shadow-md'
                          : 'bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700'
                      }`}
                    >
                      {opt.icon}
                      {t(opt.key as any)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
