import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { usePlayerStore } from '@/stores/playerStore';
import type { FontSize, FontFamily, Language, HomeLayout } from '@/stores/settingsStore';
import { useTranslation } from '@/i18n';
import ThemeToggle from './ThemeToggle';
import AuthModal from '@/components/Auth/AuthModal';
import { getAvatarDataUri } from '@/utils/avatars';
import { authApi } from '@/utils/authApi';
import { reconnectWithAuth } from '@/hooks/useSocket';
import { COUNTRIES } from '@doodledraw/shared';
import CountrySelect from '@/components/UI/CountrySelect';

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
  const { isAuthenticated, user } = useAuthStore();
  const { t } = useTranslation();
  const [showAuthModal, setShowAuthModal] = useState(false);

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
            drag="x"
            dragConstraints={{ left: 0 }}
            dragElastic={0.2}
            onDragEnd={(_e, info) => {
              if (info.offset.x > 80 || info.velocity.x > 400) {
                onClose();
              }
            }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-80 bg-white dark:bg-surface-900 shadow-game-lg z-50 p-6 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{t('settings.title')}</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-600 dark:text-surface-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Account */}
              <div>
                {isAuthenticated && user ? (
                  <AccountSection />
                ) : (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold rounded-button shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    {t('auth.login')} / {t('auth.register')}
                  </button>
                )}
              </div>

              <div className="border-t border-surface-200 dark:border-surface-700" />

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

          {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
        </>
      )}
    </AnimatePresence>
  );
}

function AccountSection() {
  const { user, clearAuth } = useAuthStore();
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [editCountry, setEditCountry] = useState(user?.country || '');
  const [editBirthYear, setEditBirthYear] = useState(user?.birthYear?.toString() || '');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const countryName = (COUNTRIES as readonly { code: string; name: string }[]).find(
    (c) => c.code === user.country,
  )?.name;

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    clearAuth();
    reconnectWithAuth();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await authApi.updateProfile({
        country: editCountry,
        birthYear: parseInt(editBirthYear, 10),
      });
      useAuthStore.getState().updateUser(updated);
      setEditing(false);
    } catch {}
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-primary-500/30">
          <img src={getAvatarDataUri(user.avatar)} alt={user.nickname} className="w-full h-full" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">{user.nickname}</div>
          <div className="text-xs text-surface-500">@{user.username}</div>
        </div>
      </div>

      {!editing ? (
        <div className="space-y-1.5 text-sm mb-3">
          {countryName && (
            <div className="flex justify-between">
              <span className="text-surface-500">{t('auth.country')}</span>
              <span className="font-medium">{countryName}</span>
            </div>
          )}
          {user.birthYear > 0 && (
            <div className="flex justify-between">
              <span className="text-surface-500">{t('auth.birthYear')}</span>
              <span className="font-medium">{user.birthYear}</span>
            </div>
          )}
          <button
            onClick={() => setEditing(true)}
            className="w-full mt-2 py-2 text-sm font-semibold bg-surface-100 dark:bg-surface-800 rounded-button hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
          >
            {t('auth.editProfile')}
          </button>
        </div>
      ) : (
        <div className="space-y-2 mb-3">
          <CountrySelect
            value={editCountry}
            onChange={setEditCountry}
            placeholder={t('leaderboard.selectCountry')}
          />
          <input
            type="number"
            value={editBirthYear}
            onChange={(e) => setEditBirthYear(e.target.value)}
            className="w-full px-3 py-2 rounded-button bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 text-sm"
            min={1930}
            max={new Date().getFullYear() - 5}
            placeholder={t('auth.birthYear')}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 text-sm font-semibold bg-primary-500 text-white rounded-button"
            >
              {t('auth.saveProfile')}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex-1 py-2 text-sm font-semibold bg-surface-100 dark:bg-surface-800 rounded-button"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={handleLogout}
        className="w-full py-2 text-sm font-semibold text-danger-500 bg-danger-50 dark:bg-danger-900/20 rounded-button hover:bg-danger-100 dark:hover:bg-danger-900/40 transition-colors"
      >
        {t('auth.logout')}
      </button>
    </div>
  );
}
