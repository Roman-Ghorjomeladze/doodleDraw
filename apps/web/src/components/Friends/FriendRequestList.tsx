import Avatar from '@/components/Avatar';
import { useFriendStore } from '@/stores/friendStore';
import { useTranslation } from '@/i18n';
import { friendsApi } from '@/utils/friendsApi';

export default function FriendRequestList() {
  const incomingRequests = useFriendStore((s) => s.incomingRequests);
  const outgoingRequests = useFriendStore((s) => s.outgoingRequests);
  const { t } = useTranslation();

  const handleRespond = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      await friendsApi.respondToRequest(requestId, action);
      // The server pushes socket events to update the store in real-time.
    } catch (err: any) {
      console.error('Failed to respond to request:', err.message);
    }
  };

  const hasAny = incomingRequests.length > 0 || outgoingRequests.length > 0;

  if (!hasAny) {
    return (
      <p className="text-sm text-surface-500 text-center py-8">
        {t('friends.noRequests')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {incomingRequests.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-surface-500 mb-2 px-1">
            {t('friends.incoming')} ({incomingRequests.length})
          </h4>
          <div className="flex flex-col gap-1">
            {incomingRequests.map((req) => (
              <div key={req.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-50 dark:bg-surface-700/50">
                <Avatar seed={req.from.avatar} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{req.from.nickname}</p>
                  <p className="text-xs text-surface-500 truncate">@{req.from.username}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleRespond(req.id, 'accept')}
                    className="px-2.5 py-1 text-xs font-medium rounded-button bg-success-500 text-white hover:bg-success-600 transition-colors"
                  >
                    {t('friends.accept')}
                  </button>
                  <button
                    onClick={() => handleRespond(req.id, 'reject')}
                    className="px-2.5 py-1 text-xs font-medium rounded-button bg-surface-200 dark:bg-surface-600 text-surface-700 dark:text-surface-300 hover:bg-surface-300 dark:hover:bg-surface-500 transition-colors"
                  >
                    {t('friends.reject')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {outgoingRequests.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-surface-500 mb-2 px-1">
            {t('friends.outgoing')} ({outgoingRequests.length})
          </h4>
          <div className="flex flex-col gap-1">
            {outgoingRequests.map((req) => (
              <div key={req.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-50 dark:bg-surface-700/50">
                <Avatar seed={req.to.avatar} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{req.to.nickname}</p>
                  <p className="text-xs text-surface-500 truncate">@{req.to.username}</p>
                </div>
                <span className="px-2.5 py-1 text-xs font-medium text-surface-500">
                  {t('friends.pending')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
