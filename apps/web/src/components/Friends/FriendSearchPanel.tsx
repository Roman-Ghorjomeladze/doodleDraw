import { useState, useEffect, useRef } from 'react';
import Avatar from '@/components/Avatar';
import { useFriendStore } from '@/stores/friendStore';
import { useTranslation } from '@/i18n';
import { friendsApi } from '@/utils/friendsApi';

export default function FriendSearchPanel() {
  const searchResults = useFriendStore((s) => s.searchResults);
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      useFriendStore.getState().setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const data = await friendsApi.search(query.trim(), controller.signal);
        useFriendStore.getState().setSearchResults(data.users);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          useFriendStore.getState().setSearchResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleAddFriend = async (targetPersistentId: string) => {
    try {
      await friendsApi.sendRequest(targetPersistentId);
      // Re-run search to update button states.
      if (query.trim().length >= 2) {
        const data = await friendsApi.search(query.trim());
        useFriendStore.getState().setSearchResults(data.users);
      }
    } catch (err: any) {
      console.error('Failed to send friend request:', err.message);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('friends.search')}
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 text-sm border border-surface-200 dark:border-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
        />
      </div>

      {query.trim().length > 0 && query.trim().length < 2 && (
        <p className="text-xs text-surface-500 text-center">{t('friends.searchMinChars')}</p>
      )}

      {query.trim().length >= 2 && !loading && searchResults.length === 0 && (
        <p className="text-xs text-surface-500 text-center py-4">{t('friends.noResults')}</p>
      )}

      <div className="flex flex-col gap-1">
        {searchResults.map((user) => (
          <div key={user.persistentId} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700/50">
            <Avatar seed={user.avatar} size={32} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.nickname}</p>
              <p className="text-xs text-surface-500 truncate">@{user.username}</p>
            </div>
            {user.isFriend ? (
              <span className="px-2.5 py-1 text-xs font-medium text-success-600 dark:text-success-400">
                {t('friends.alreadyFriends')}
              </span>
            ) : user.hasPendingRequest ? (
              <span className="px-2.5 py-1 text-xs font-medium text-surface-500">
                {t('friends.pending')}
              </span>
            ) : (
              <button
                onClick={() => handleAddFriend(user.persistentId)}
                className="px-2.5 py-1 text-xs font-medium rounded-button bg-primary-500 text-white hover:bg-primary-600 transition-colors"
              >
                {t('friends.addFriend')}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
