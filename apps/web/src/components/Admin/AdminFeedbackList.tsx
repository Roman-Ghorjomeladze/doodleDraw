import { useEffect, useState } from 'react';
import { useAdminStore } from '@/stores/adminStore';
import Pagination from '@/components/UI/Pagination';

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300',
  dismissed: 'bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300',
};

const categoryColors: Record<string, string> = {
  bug: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300',
  feedback: 'bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300',
  other: 'bg-surface-200 text-surface-700 dark:bg-surface-700 dark:text-surface-300',
};

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return iso;
  }
}

export default function AdminFeedbackList() {
  const { feedback, feedbackPagination, fetchFeedback, setSelectedFeedbackId, deleteFeedback } = useAdminStore();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    setPage(1);
  }, [status, category]);

  useEffect(() => {
    fetchFeedback({ page, status: status || undefined, category: category || undefined });
  }, [page, status, category, fetchFeedback]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this feedback?')) return;
    try {
      await deleteFeedback(id);
    } catch {}
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-surface-900 dark:text-surface-50">Feedback</h2>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All categories</option>
          <option value="bug">Bug</option>
          <option value="feedback">Feedback</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm overflow-hidden">
        {feedback.length === 0 ? (
          <div className="p-6 text-center text-surface-500">No feedback yet</div>
        ) : (
          <div className="divide-y divide-surface-100 dark:divide-surface-700/50">
            {feedback.map((f) => (
              <div
                key={f._id}
                onClick={() => setSelectedFeedbackId(f._id)}
                className="p-4 hover:bg-surface-50 dark:hover:bg-surface-700/30 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${categoryColors[f.category] || ''}`}>
                      {f.category}
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${statusColors[f.status] || ''}`}>
                      {f.status}
                    </span>
                    <span className="text-xs text-surface-500">{formatDateTime(f.createdAt)}</span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(f._id, e)}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline shrink-0"
                  >
                    Delete
                  </button>
                </div>
                <div className="text-sm text-surface-900 dark:text-surface-50 line-clamp-2 mb-1">
                  {f.message}
                </div>
                <div className="text-xs text-surface-500">
                  {f.submitterNickname ?? 'Anonymous'}
                  {f.submitterUsername && <span className="ml-1">(@{f.submitterUsername})</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {feedbackPagination && (
        <Pagination
          currentPage={feedbackPagination.page}
          totalPages={feedbackPagination.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
