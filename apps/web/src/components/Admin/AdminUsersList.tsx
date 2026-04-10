import { useEffect, useRef, useState } from 'react';
import { useAdminStore } from '@/stores/adminStore';
import { useAuthStore } from '@/stores/authStore';
import Pagination from '@/components/UI/Pagination';
import { getAvatarDataUri } from '@/utils/avatars';
import type { AdminUserRow } from '@/utils/adminApi';

export default function AdminUsersList() {
  const {
    users,
    userPagination,
    fetchUsers,
    resetUserPassword,
    deleteUser,
    restoreUser,
  } = useAdminStore();
  const myPersistentId = useAuthStore((s) => s.user?.persistentId ?? null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [resetTarget, setResetTarget] = useState<AdminUserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);

  // Reset page when search changes.
  useEffect(() => {
    setPage(1);
  }, [search]);

  const reload = async () => {
    setLoading(true);
    await fetchUsers({ page, search: search.trim() || undefined });
    setLoading(false);
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(reload, search ? 300 : 0);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, fetchUsers]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget.persistentId);
    } catch {
      // handleApiError already set the store error
    }
    setDeleteTarget(null);
  };

  const handleRestore = async (u: AdminUserRow) => {
    try {
      await restoreUser(u.persistentId);
    } catch {
      // handleApiError already set the store error
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-surface-900 dark:text-surface-50">Users</h2>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username or nickname..."
          className="w-full sm:w-72 px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="p-6 text-center text-surface-500">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-center text-surface-500">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700 text-left">
                  <th className="py-2 px-3 text-surface-500 font-medium"></th>
                  <th className="py-2 px-3 text-surface-500 font-medium">Username</th>
                  <th className="py-2 px-3 text-surface-500 font-medium">Nickname</th>
                  <th className="py-2 px-3 text-surface-500 font-medium">Games</th>
                  <th className="py-2 px-3 text-surface-500 font-medium">Wins</th>
                  <th className="py-2 px-3 text-surface-500 font-medium">Elo</th>
                  <th className="py-2 px-3 text-surface-500 font-medium">Country</th>
                  <th className="py-2 px-3 text-surface-500 font-medium">Flags</th>
                  <th className="py-2 px-3 text-surface-500 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.persistentId === myPersistentId;
                  const isDeleted = Boolean(u.deletedAt);
                  return (
                    <tr
                      key={u.persistentId}
                      className={`border-b border-surface-100 dark:border-surface-700/50 hover:bg-surface-50 dark:hover:bg-surface-700/30 ${
                        isDeleted
                          ? 'bg-red-50/60 dark:bg-red-900/10 opacity-70'
                          : u.isAdmin
                            ? 'bg-primary-50/50 dark:bg-primary-900/10'
                            : ''
                      }`}
                    >
                      <td className="py-2 px-3">
                        <img
                          src={getAvatarDataUri(u.avatar)}
                          alt={u.nickname}
                          className={`w-8 h-8 rounded-full ${isDeleted ? 'grayscale' : ''}`}
                        />
                      </td>
                      <td className="py-2 px-3 font-mono text-xs text-surface-700 dark:text-surface-300">
                        {u.username ?? <span className="text-surface-400 italic">anonymous</span>}
                      </td>
                      <td
                        className={`py-2 px-3 font-medium ${
                          isDeleted
                            ? 'text-surface-500 dark:text-surface-400 line-through'
                            : 'text-surface-900 dark:text-surface-50'
                        }`}
                      >
                        {u.nickname}
                      </td>
                      <td className="py-2 px-3 text-surface-700 dark:text-surface-300">{u.totalGames}</td>
                      <td className="py-2 px-3 text-surface-700 dark:text-surface-300">{u.totalWins}</td>
                      <td className="py-2 px-3 text-surface-700 dark:text-surface-300">{u.eloRating}</td>
                      <td className="py-2 px-3 text-surface-700 dark:text-surface-300">
                        {u.country ?? '—'}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex gap-1 flex-wrap">
                          {isDeleted && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white font-semibold"
                              title={`Deleted ${new Date(u.deletedAt!).toLocaleString()}`}
                            >
                              DELETED
                            </span>
                          )}
                          {u.isAdmin && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-500 text-white font-semibold">
                              ADMIN
                            </span>
                          )}
                          {u.isRegistered ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                              registered
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-400">
                              anon
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => setResetTarget(u)}
                            disabled={!u.isRegistered || isDeleted}
                            title={
                              isDeleted
                                ? 'Restore the user first'
                                : u.isRegistered
                                  ? 'Reset password'
                                  : 'Anonymous user has no password'
                            }
                            className="text-[11px] px-2 py-1 rounded bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            Reset PW
                          </button>
                          {isDeleted ? (
                            <button
                              onClick={() => handleRestore(u)}
                              title="Restore user"
                              className="text-[11px] px-2 py-1 rounded bg-green-500 hover:bg-green-600 text-white transition-colors"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => setDeleteTarget(u)}
                              disabled={isSelf}
                              title={isSelf ? "You can't delete your own admin account" : 'Delete user'}
                              className="text-[11px] px-2 py-1 rounded bg-red-500 hover:bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {userPagination && (
        <Pagination
          currentPage={userPagination.page}
          totalPages={userPagination.totalPages}
          onPageChange={setPage}
        />
      )}

      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onReset={async (password) => {
            try {
              return await resetUserPassword(resetTarget.persistentId, password);
            } catch (err: any) {
              throw err;
            }
          }}
        />
      )}

      {deleteTarget && (
        <DeleteUserConfirm
          user={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------

function ResetPasswordModal({
  user,
  onClose,
  onReset,
}: {
  user: AdminUserRow;
  onClose: () => void;
  onReset: (password?: string) => Promise<{ message: string; password: string; isDefault: boolean }>;
}) {
  const [mode, setMode] = useState<'default' | 'custom'>('default');
  const [custom, setCustom] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ password: string; isDefault: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit =
    !submitting && (mode === 'default' || (custom.trim().length >= 6 && custom.trim().length <= 100));

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await onReset(mode === 'custom' ? custom.trim() : undefined);
      setResult({ password: res.password, isDefault: res.isDefault });
    } catch (err: any) {
      setError(err?.message ?? 'Failed to reset password');
    }
    setSubmitting(false);
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-surface-800 rounded-xl shadow-xl max-w-md w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-1 text-surface-900 dark:text-surface-50">
          Reset password
        </h3>
        <p className="text-sm text-surface-500 mb-4">
          For <span className="font-mono">{user.username}</span> ({user.nickname}). This will also
          invalidate all existing sessions for this user.
        </p>

        {result ? (
          <div className="space-y-3">
            <div className="px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-sm text-green-700 dark:text-green-300">
              Password reset {result.isDefault ? 'to the default' : 'successfully'}.
            </div>
            <div>
              <label className="block text-xs text-surface-500 uppercase mb-1">New password</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 font-mono text-sm break-all">
                  {result.password}
                </code>
                <button
                  onClick={copy}
                  className="px-3 py-2 text-xs rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-semibold whitespace-nowrap"
                >
                  {copied ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-surface-400 mt-2">
                Share this password with the user securely. It won't be shown again.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2 rounded-button bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-sm font-semibold"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'default'}
                  onChange={() => setMode('default')}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium">Use default password</div>
                  <div className="text-xs text-surface-500">
                    Sets the password to <code className="font-mono">DoodleDraw!</code>
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'custom'}
                  onChange={() => setMode('custom')}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">Set a custom password</div>
                  <input
                    type="text"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    disabled={mode !== 'custom'}
                    placeholder="6-100 characters"
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-sm disabled:opacity-50"
                  />
                </div>
              </label>
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-button bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={!canSubmit}
                className="flex-1 py-2 rounded-button bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold"
              >
                {submitting ? 'Resetting...' : 'Reset password'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DeleteUserConfirm({
  user,
  onCancel,
  onConfirm,
}: {
  user: AdminUserRow;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-surface-800 rounded-xl shadow-xl max-w-md w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-2 text-surface-900 dark:text-surface-50">
          Delete user?
        </h3>
        <p className="text-sm text-surface-600 dark:text-surface-300 mb-4">
          This will mark <strong>{user.nickname}</strong>
          {user.username ? <> (<span className="font-mono">{user.username}</span>)</> : ''}
          {' '}as deleted. They will be signed out immediately and can no longer log in, appear in
          leaderboards, friend search, or the friends list.
        </p>
        <p className="text-xs text-surface-400 mb-4">
          The profile, friendships, friend requests, and game history are preserved. You can restore
          the user later from this same list.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-button bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-button bg-red-500 hover:bg-red-600 text-white text-sm font-semibold"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
