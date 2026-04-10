import { useEffect, useState } from 'react';
import { useAdminStore } from '@/stores/adminStore';

const statuses = ['open', 'in_progress', 'resolved', 'dismissed'] as const;
const categories = ['bug', 'feedback', 'other'] as const;

export default function AdminFeedbackDetail() {
  const {
    selectedFeedback,
    selectedFeedbackId,
    fetchFeedbackById,
    updateFeedback,
    deleteFeedback,
    setSelectedFeedbackId,
  } = useAdminStore();

  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<typeof categories[number]>('feedback');
  const [status, setStatus] = useState<typeof statuses[number]>('open');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (selectedFeedbackId) fetchFeedbackById(selectedFeedbackId);
  }, [selectedFeedbackId, fetchFeedbackById]);

  useEffect(() => {
    if (selectedFeedback) {
      setMessage(selectedFeedback.message);
      setCategory(selectedFeedback.category);
      setStatus(selectedFeedback.status);
      setAdminNotes(selectedFeedback.adminNotes ?? '');
    }
  }, [selectedFeedback]);

  if (!selectedFeedbackId || !selectedFeedback) {
    return <div className="text-surface-500 p-4">Loading feedback...</div>;
  }

  const f = selectedFeedback;

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateFeedback(f._id, { message, category, status, adminNotes });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {}
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this feedback permanently?')) return;
    try {
      await deleteFeedback(f._id);
      setSelectedFeedbackId(null);
    } catch {}
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setSelectedFeedbackId(null)}
          className="text-sm text-surface-500 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400"
        >
          ← Back to feedback
        </button>
      </div>

      <h2 className="text-xl font-bold mb-4 text-surface-900 dark:text-surface-50">Feedback detail</h2>

      <div className="bg-white dark:bg-surface-800 rounded-xl p-5 shadow-sm mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-surface-500 uppercase mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-sm"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-surface-500 uppercase mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-sm"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-surface-500 uppercase mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-sm resize-y"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs text-surface-500 uppercase mb-1">Admin notes</label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={4}
            placeholder="Internal notes (only admins see these)..."
            className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-sm resize-y"
          />
        </div>

        <div className="flex gap-3 items-center">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-button bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 rounded-button bg-red-500 hover:bg-red-600 text-white font-semibold text-sm"
          >
            Delete
          </button>
          {saved && <span className="text-sm text-green-600 dark:text-green-400">Saved ✓</span>}
        </div>
      </div>

      <div className="bg-white dark:bg-surface-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-surface-500 mb-3">Submitter</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-xs text-surface-500">Username:</span>{' '}
            <span className="text-surface-900 dark:text-surface-50">{f.submitterUsername ?? '—'}</span>
          </div>
          <div>
            <span className="text-xs text-surface-500">Nickname:</span>{' '}
            <span className="text-surface-900 dark:text-surface-50">{f.submitterNickname ?? 'Anonymous'}</span>
          </div>
          <div>
            <span className="text-xs text-surface-500">Persistent ID:</span>{' '}
            <span className="font-mono text-xs">{f.submitterPersistentId ?? '—'}</span>
          </div>
          <div>
            <span className="text-xs text-surface-500">Page URL:</span>{' '}
            <span className="font-mono text-xs break-all">{f.pageUrl ?? '—'}</span>
          </div>
          <div className="sm:col-span-2">
            <span className="text-xs text-surface-500">User agent:</span>{' '}
            <span className="text-xs break-all">{f.userAgent ?? '—'}</span>
          </div>
          <div>
            <span className="text-xs text-surface-500">Created:</span>{' '}
            <span className="text-surface-700 dark:text-surface-300">{new Date(f.createdAt).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-xs text-surface-500">Updated:</span>{' '}
            <span className="text-surface-700 dark:text-surface-300">{new Date(f.updatedAt).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {f.trace && <TraceSection trace={f.trace} />}
    </div>
  );
}

function TraceSection({ trace }: { trace: Record<string, any> }) {
  const env = trace.env ?? {};
  const viewport = trace.viewport ?? {};
  const loc = trace.location ?? {};
  const app = trace.app ?? {};
  const logs: Array<{ level: string; timestamp: number; message: string }> = trace.consoleLogs ?? [];
  const net: Array<any> = trace.networkIssues ?? [];

  const levelColors: Record<string, string> = {
    error: 'text-red-600 dark:text-red-400',
    warn: 'text-yellow-600 dark:text-yellow-400',
    info: 'text-blue-600 dark:text-blue-400',
    log: 'text-surface-600 dark:text-surface-400',
  };

  const formatTime = (ts: number) => {
    try {
      return new Date(ts).toLocaleTimeString();
    } catch {
      return String(ts);
    }
  };

  return (
    <div className="bg-white dark:bg-surface-800 rounded-xl p-5 shadow-sm mt-4">
      <h3 className="text-sm font-semibold text-surface-500 mb-3">Diagnostic trace</h3>

      {/* Environment */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-surface-500 uppercase mb-2">Environment</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
          <div><span className="text-surface-500">Locale:</span> {env.locale ?? '—'}</div>
          <div><span className="text-surface-500">Timezone:</span> {env.timezone ?? '—'}</div>
          <div><span className="text-surface-500">Platform:</span> {env.platform ?? '—'}</div>
          <div><span className="text-surface-500">Online:</span> {env.onLine == null ? '—' : String(env.onLine)}</div>
          <div><span className="text-surface-500">CPU cores:</span> {env.hardwareConcurrency ?? '—'}</div>
          <div><span className="text-surface-500">Device memory:</span> {env.deviceMemory ?? '—'}</div>
          {env.connection && (
            <>
              <div><span className="text-surface-500">Connection:</span> {env.connection.effectiveType ?? '—'}</div>
              <div><span className="text-surface-500">Downlink:</span> {env.connection.downlink != null ? `${env.connection.downlink} Mbps` : '—'}</div>
            </>
          )}
        </div>
      </div>

      {/* Viewport */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-surface-500 uppercase mb-2">Viewport</div>
        <div className="text-xs">
          {viewport.innerWidth ?? '?'} × {viewport.innerHeight ?? '?'} @ {viewport.devicePixelRatio ?? '?'}x
          {viewport.orientation ? ` (${viewport.orientation})` : ''}
          {viewport.screenWidth && ` — screen ${viewport.screenWidth}×${viewport.screenHeight}`}
        </div>
      </div>

      {/* Location */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-surface-500 uppercase mb-2">Location</div>
        <div className="text-xs break-all">
          <div><span className="text-surface-500">URL:</span> {loc.href ?? '—'}</div>
          {loc.referrer && <div><span className="text-surface-500">Referrer:</span> {loc.referrer}</div>}
        </div>
      </div>

      {/* App / game state */}
      {app.gameState && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-surface-500 uppercase mb-2">Game state</div>
          <pre className="text-xs bg-surface-50 dark:bg-surface-900/50 rounded-lg p-3 overflow-x-auto">
            {JSON.stringify(app.gameState, null, 2)}
          </pre>
        </div>
      )}

      {/* Console logs */}
      {logs.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-surface-500 uppercase mb-2">
            Recent console logs ({logs.length})
          </div>
          <div className="bg-surface-50 dark:bg-surface-900/50 rounded-lg p-3 max-h-64 overflow-y-auto space-y-1">
            {logs.map((l, i) => (
              <div key={i} className="text-xs font-mono break-words">
                <span className="text-surface-400">{formatTime(l.timestamp)}</span>{' '}
                <span className={`font-semibold ${levelColors[l.level] ?? ''}`}>[{l.level}]</span>{' '}
                <span className="text-surface-700 dark:text-surface-300 whitespace-pre-wrap">{l.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Network issues */}
      {net.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-surface-500 uppercase mb-2">
            Network issues ({net.length})
          </div>
          <div className="bg-surface-50 dark:bg-surface-900/50 rounded-lg p-3 max-h-64 overflow-y-auto space-y-1">
            {net.map((n, i) => (
              <div key={i} className="text-xs font-mono break-words">
                <span className="text-surface-400">{formatTime(n.timestamp)}</span>{' '}
                <span className="text-red-600 dark:text-red-400 font-semibold">
                  {n.status ?? 'ERR'}
                </span>{' '}
                <span className="text-surface-500">{n.method}</span>{' '}
                <span className="text-surface-700 dark:text-surface-300">{n.url}</span>
                {n.durationMs != null && (
                  <span className="text-surface-400"> ({n.durationMs}ms)</span>
                )}
                {n.error && <div className="text-red-500 ml-4">{n.error}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Truncation hint */}
      {trace._truncated && (
        <div className="text-xs text-yellow-600 dark:text-yellow-400">
          ⚠ Trace was truncated by the server: {trace._hint}
        </div>
      )}

      {/* Raw fallback — collapsed */}
      <details className="mt-3">
        <summary className="text-xs text-surface-500 cursor-pointer">Raw trace JSON</summary>
        <pre className="text-[10px] bg-surface-50 dark:bg-surface-900/50 rounded-lg p-3 mt-2 overflow-x-auto max-h-80">
          {JSON.stringify(trace, null, 2)}
        </pre>
      </details>
    </div>
  );
}
