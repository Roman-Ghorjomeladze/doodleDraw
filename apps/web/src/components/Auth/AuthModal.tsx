import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { usePlayerStore } from '@/stores/playerStore';
import { authApi } from '@/utils/authApi';
import { reconnectWithAuth } from '@/hooks/useSocket';
import { getAvatarDataUri } from '@/utils/avatars';
import { AVATAR_SEEDS, EXTRA_AVATAR_SEEDS } from '@doodledraw/shared';

type Tab = 'login' | 'register';

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('login');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-surface-800 rounded-t-2xl sm:rounded-card shadow-game-lg w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
        >
          {/* Tabs */}
          <div className="flex border-b border-surface-200 dark:border-surface-700">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${
                tab === 'login'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
              }`}
            >
              {t('auth.login')}
              {tab === 'login' && (
                <motion.div layoutId="auth-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
              )}
            </button>
            <button
              onClick={() => setTab('register')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${
                tab === 'register'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
              }`}
            >
              {t('auth.register')}
              {tab === 'register' && (
                <motion.div layoutId="auth-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
              )}
            </button>
          </div>

          <div className="p-6">
            {tab === 'login' ? (
              <LoginForm onSuccess={onClose} />
            ) : (
              <RegisterForm onSuccess={onClose} />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const persistentId = usePlayerStore.getState().persistentId;
      const result = await authApi.login({ username, password, persistentId });
      useAuthStore.getState().setAuth(result.token, result.user);
      usePlayerStore.getState().syncFromAuth(result.user);
      reconnectWithAuth();
      onSuccess();
    } catch (err: any) {
      setError(err.message || t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-1">{t('auth.username')}</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-3 py-2.5 rounded-button bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 focus:border-primary-500 focus:outline-none transition-colors"
          placeholder={t('auth.username')}
          autoComplete="username"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">{t('auth.password')}</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2.5 rounded-button bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 focus:border-primary-500 focus:outline-none transition-colors"
          placeholder={t('auth.password')}
          autoComplete="current-password"
          required
        />
      </div>

      {error && (
        <p className="text-sm text-danger-500 bg-danger-50 dark:bg-danger-900/20 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold rounded-button shadow-md transition-all disabled:opacity-50"
      >
        {loading ? '...' : t('auth.login')}
      </button>
    </form>
  );
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useTranslation();
  const playerStore = usePlayerStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState(playerStore.nickname);
  const [avatar, setAvatar] = useState(playerStore.avatar);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authApi.register({
        username,
        password,
        nickname,
        avatar,
        country: '',
        birthYear: 0,
        persistentId: playerStore.persistentId,
      });
      useAuthStore.getState().setAuth(result.token, result.user);
      usePlayerStore.getState().syncFromAuth(result.user);
      reconnectWithAuth();
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-semibold mb-1">{t('auth.username')}</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.@+%-]/g, ''))}
          className="w-full px-3 py-2 rounded-button bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 focus:border-primary-500 focus:outline-none transition-colors text-sm"
          placeholder="Username or email"
          autoComplete="username"
          maxLength={100}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">{t('auth.password')}</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-button bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 focus:border-primary-500 focus:outline-none transition-colors text-sm"
          placeholder="Min 6 characters"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">{t('create.nickname')}</label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full px-3 py-2 rounded-button bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 focus:border-primary-500 focus:outline-none transition-colors text-sm"
          maxLength={20}
          required
        />
      </div>

      {/* Avatar */}
      <div>
        <label className="block text-sm font-semibold mb-1">{t('create.avatar')}</label>
        <div className="grid grid-cols-8 gap-1.5">
          {AVATAR_SEEDS.map((seed) => (
            <button
              key={seed}
              type="button"
              onClick={() => setAvatar(seed)}
              className={`w-9 h-9 rounded-full overflow-hidden ${avatar === seed ? 'ring-2 ring-offset-2 ring-primary-500' : ''}`}
            >
              <img src={getAvatarDataUri(seed)} alt={seed} className="w-full h-full" />
            </button>
          ))}
        </div>
        {showMore && (
          <div className="grid grid-cols-8 gap-1.5 mt-1.5">
            {EXTRA_AVATAR_SEEDS.map((seed) => (
              <button
                key={seed}
                type="button"
                onClick={() => setAvatar(seed)}
                className={`w-9 h-9 rounded-full overflow-hidden ${avatar === seed ? 'ring-2 ring-offset-2 ring-primary-500' : ''}`}
              >
                <img src={getAvatarDataUri(seed)} alt={seed} className="w-full h-full" />
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className="mt-1.5 text-xs font-medium text-primary-500 hover:text-primary-600 dark:text-primary-400 transition-colors"
        >
          {showMore ? t('create.showLess') : t('create.showMore')}
        </button>
      </div>

      {error && (
        <p className="text-sm text-danger-500 bg-danger-50 dark:bg-danger-900/20 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold rounded-button shadow-md transition-all disabled:opacity-50"
      >
        {loading ? '...' : t('auth.register')}
      </button>
    </form>
  );
}
