import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFriendStore } from '@/stores/friendStore';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from '@/i18n';
import { friendsApi } from '@/utils/friendsApi';
import FriendListItem from './FriendListItem';
import FriendSearchPanel from './FriendSearchPanel';
import FriendRequestList from './FriendRequestList';
import ConfirmModal from '@/components/UI/ConfirmModal';

type Tab = 'friends' | 'search' | 'requests';

export default function FriendsSidebar() {
  const { sidebarOpen, friends, incomingRequests } = useFriendStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const onlineFriends = friends.filter((f) => f.isOnline);
  const offlineFriends = friends.filter((f) => !f.isOnline);

  const handleRemoveFriend = (persistentId: string) => {
    setRemoveTarget(persistentId);
  };

  const confirmRemove = async () => {
    if (removeTarget) {
      try {
        await friendsApi.removeFriend(removeTarget);
      } catch (err: any) {
        console.error('Failed to remove friend:', err.message);
      }
      setRemoveTarget(null);
    }
  };

  const removeName = removeTarget
    ? friends.find((f) => f.persistentId === removeTarget)?.nickname ?? ''
    : '';

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => useFriendStore.getState().setSidebarOpen(false)}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-surface-800 shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-700">
              <h2 className="text-lg font-bold">{t('friends.title')}</h2>
              <button
                onClick={() => useFriendStore.getState().setSidebarOpen(false)}
                className="p-1.5 rounded-button hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {!isAuthenticated ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <p className="text-sm text-surface-500 text-center">
                  {t('friends.loginRequired')}
                </p>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="flex border-b border-surface-200 dark:border-surface-700">
                  {(['friends', 'search', 'requests'] as Tab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${
                        activeTab === tab
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                      }`}
                    >
                      {t(`friends.${tab === 'friends' ? 'title' : tab}`)}
                      {tab === 'requests' && incomingRequests.length > 0 && (
                        <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-danger-500 text-white rounded-full">
                          {incomingRequests.length}
                        </span>
                      )}
                      {activeTab === tab && (
                        <motion.div
                          layoutId="friendsTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
                        />
                      )}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-3">
                  {activeTab === 'friends' && (
                    <div className="flex flex-col gap-2">
                      {friends.length === 0 ? (
                        <p className="text-sm text-surface-500 text-center py-8">
                          {t('friends.noFriends')}
                        </p>
                      ) : (
                        <>
                          {onlineFriends.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold uppercase text-surface-500 mb-1 px-1">
                                {t('friends.online')} ({onlineFriends.length})
                              </h4>
                              {onlineFriends.map((f) => (
                                <FriendListItem key={f.persistentId} friend={f} onRemove={handleRemoveFriend} />
                              ))}
                            </div>
                          )}
                          {offlineFriends.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold uppercase text-surface-500 mb-1 px-1">
                                {t('friends.offline')} ({offlineFriends.length})
                              </h4>
                              {offlineFriends.map((f) => (
                                <FriendListItem key={f.persistentId} friend={f} onRemove={handleRemoveFriend} />
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {activeTab === 'search' && <FriendSearchPanel />}
                  {activeTab === 'requests' && <FriendRequestList />}
                </div>
              </>
            )}
          </motion.div>

          <AnimatePresence>
            {removeTarget && (
              <ConfirmModal
                title={t('friends.removeFriend')}
                message={t('friends.removeConfirm').replace('{name}', removeName)}
                confirmLabel={t('friends.removeFriend')}
                cancelLabel={t('friends.cancel')}
                variant="danger"
                onConfirm={confirmRemove}
                onCancel={() => setRemoveTarget(null)}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
