import { useState } from 'react';
import { useAdminStore } from '@/stores/adminStore';

export default function AdminBroadcast() {
  const { broadcast } = useAdminStore();
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    try {
      const result = await broadcast(message.trim());
      setStatus(result);
      setMessage('');
    } catch (err: any) {
      setStatus(err.message || 'Failed to broadcast');
    }
    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-surface-900 dark:text-surface-50">
        Broadcast Message
      </h2>

      <div className="bg-white dark:bg-surface-800 rounded-xl p-5 shadow-sm">
        <p className="text-sm text-surface-500 dark:text-surface-400 mb-4">
          Send a system message to all active game rooms.
        </p>

        <form onSubmit={handleSend}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full px-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500 mb-3 resize-none"
            placeholder="Type your broadcast message..."
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-surface-400">{message.length}/500</span>
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Sending...' : 'Send Broadcast'}
            </button>
          </div>
        </form>

        {status && (
          <div className="mt-3 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
