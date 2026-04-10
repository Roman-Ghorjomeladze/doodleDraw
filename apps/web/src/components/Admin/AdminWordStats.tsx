import { useEffect, useState } from 'react';
import { useAdminStore } from '@/stores/adminStore';

/**
 * Controlled boolean toggle that looks like the bot icon button used in the
 * filter bar. On = solid primary fill, off = muted outline. Replaces the
 * previous checkbox inputs in the add form and inline edit row.
 */
function BotToggle({
  value,
  onChange,
  title,
  disabled = false,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      disabled={disabled}
      title={title}
      aria-label="Toggle bot compatible"
      aria-pressed={value}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        value
          ? 'border-primary-500 bg-primary-500 text-white hover:bg-primary-600'
          : 'border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-400 dark:text-surface-500 hover:bg-surface-50 dark:hover:bg-surface-600'
      }`}
    >
      <BotIcon />
    </button>
  );
}

/** Small robot icon used for the bot-compatible filter and row badge. */
function BotIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 8V4H8" />
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}

const difficultyLabels: Record<number, string> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
};

const difficultyColors: Record<number, string> = {
  1: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  2: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  3: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

type BotFilter = '' | 'true' | 'false';

interface EditDraft {
  word: string;
  difficulty: number;
  languageCode: string;
  botCompatible: boolean;
}

interface DeleteTarget {
  id: number;
  word: string;
  languageCode: string;
  difficulty: number;
}

export default function AdminWordStats() {
  const {
    wordStats,
    wordList,
    availableLanguages,
    fetchWordStats,
    fetchWords,
    fetchLanguages,
    addWord,
    updateWord,
    deleteWord,
  } = useAdminStore();

  const [filterLang, setFilterLang] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterBot, setFilterBot] = useState<BotFilter>('');
  const [newWord, setNewWord] = useState('');
  const [newLang, setNewLang] = useState('');
  const [newDifficulty, setNewDifficulty] = useState(1);
  const [newBotCompatible, setNewBotCompatible] = useState(false);
  const [addStatus, setAddStatus] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    fetchWordStats();
    fetchLanguages();
  }, [fetchWordStats, fetchLanguages]);

  useEffect(() => {
    fetchWords(filterLang || undefined, filterDifficulty || undefined, filterBot || undefined);
  }, [filterLang, filterDifficulty, filterBot, fetchWords]);

  // Set default newLang when languages load
  useEffect(() => {
    if (availableLanguages.length > 0 && !newLang) {
      setNewLang(availableLanguages[0].code);
    }
  }, [availableLanguages, newLang]);

  const reload = () => {
    fetchWords(filterLang || undefined, filterDifficulty || undefined, filterBot || undefined);
    fetchWordStats();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || !newLang) return;
    setAddLoading(true);
    setAddStatus(null);
    try {
      await addWord(newLang, newWord.trim(), newDifficulty, newBotCompatible);
      setAddStatus(`Added "${newWord.trim()}"`);
      setNewWord('');
      setNewBotCompatible(false);
      reload();
    } catch (err: any) {
      setAddStatus(err.message || 'Failed to add word');
    }
    setAddLoading(false);
  };

  const startEdit = (w: typeof wordList[number]) => {
    setEditingId(w.id);
    setEditDraft({
      word: w.word,
      difficulty: w.difficulty,
      languageCode: w.languageCode,
      botCompatible: w.botCompatible,
    });
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
    setEditError(null);
  };

  const saveEdit = async () => {
    if (editingId == null || !editDraft) return;
    const trimmed = editDraft.word.trim();
    if (trimmed.length === 0) {
      setEditError('Word cannot be empty');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      await updateWord(editingId, {
        word: trimmed,
        difficulty: editDraft.difficulty,
        languageCode: editDraft.languageCode,
        botCompatible: editDraft.botCompatible,
      });
      cancelEdit();
      fetchWordStats();
    } catch (err: any) {
      setEditError(err?.message ?? 'Failed to update word');
    }
    setEditSaving(false);
  };

  const askDelete = (w: typeof wordList[number]) => {
    setDeleteTarget({
      id: w.id,
      word: w.word,
      languageCode: w.languageCode,
      difficulty: w.difficulty,
    });
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteWord(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (err: any) {
      setDeleteError(err?.message ?? 'Failed to delete word');
    }
    setDeleteLoading(false);
  };

  // Group stats by language
  const grouped = wordStats.reduce(
    (acc, stat) => {
      const key = stat.languageCode;
      if (!acc[key]) acc[key] = { name: stat.languageName, items: [] };
      acc[key].items.push(stat);
      return acc;
    },
    {} as Record<string, { name: string; items: typeof wordStats }>,
  );

  const filteredWords = search
    ? wordList.filter((w) => w.word.toLowerCase().includes(search.toLowerCase()))
    : wordList;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-surface-900 dark:text-surface-50">
        Word Management
      </h2>

      {/* Stats overview */}
      {wordStats.length > 0 && (
        <div className="space-y-3 mb-6">
          {Object.entries(grouped).map(([code, { name, items }]) => {
            const total = items.reduce((sum, i) => sum + i.count, 0);
            return (
              <div key={code} className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-surface-900 dark:text-surface-50">
                    {name} ({code})
                  </h3>
                  <span className="text-sm text-surface-500 dark:text-surface-400">
                    {total} total
                  </span>
                </div>
                <div className="flex gap-3">
                  {items.map((item) => (
                    <div
                      key={item.difficulty}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${difficultyColors[item.difficulty] || ''}`}
                    >
                      {difficultyLabels[item.difficulty] || `Lvl ${item.difficulty}`}: {item.count}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add word form */}
      <div className="bg-white dark:bg-surface-800 rounded-xl p-5 shadow-sm mb-6">
        <h3 className="text-sm font-semibold text-surface-500 dark:text-surface-400 mb-3">
          Add New Word
        </h3>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-surface-500 dark:text-surface-400 mb-1">Word</label>
            <input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter word..."
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-xs text-surface-500 dark:text-surface-400 mb-1">Language</label>
            <select
              value={newLang}
              onChange={(e) => setNewLang(e.target.value)}
              className="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {availableLanguages.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-surface-500 dark:text-surface-400 mb-1">Difficulty</label>
            <select
              value={newDifficulty}
              onChange={(e) => setNewDifficulty(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={1}>Easy</option>
              <option value={2}>Medium</option>
              <option value={3}>Hard</option>
            </select>
          </div>
          <div className="pb-[2px]">
            <label className="block text-xs text-surface-500 dark:text-surface-400 mb-1">
              Bot
            </label>
            <BotToggle
              value={newBotCompatible}
              onChange={setNewBotCompatible}
              title={
                newBotCompatible
                  ? 'Bot compatible — click to disable'
                  : 'Not bot compatible — click to enable'
              }
            />
          </div>
          <button
            type="submit"
            disabled={addLoading || !newWord.trim()}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {addLoading ? 'Adding...' : 'Add Word'}
          </button>
        </form>
        {addStatus && (
          <div className="mt-2 text-sm text-surface-600 dark:text-surface-300">{addStatus}</div>
        )}
      </div>

      {/* Word browser */}
      <div className="bg-white dark:bg-surface-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <h3 className="text-sm font-semibold text-surface-500 dark:text-surface-400">
            Browse Words ({filteredWords.length})
          </h3>
          <div className="flex-1" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-48"
            placeholder="Search words..."
          />
          <select
            value={filterLang}
            onChange={(e) => setFilterLang(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All languages</option>
            {availableLanguages.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All difficulties</option>
            <option value="1">Easy</option>
            <option value="2">Medium</option>
            <option value="3">Hard</option>
          </select>
          <button
            type="button"
            onClick={() =>
              setFilterBot((prev) => (prev === '' ? 'true' : prev === 'true' ? 'false' : ''))
            }
            title={
              filterBot === ''
                ? 'Showing all words — click to filter bot-compatible only'
                : filterBot === 'true'
                  ? 'Showing bot-compatible only — click to filter non-bot-compatible'
                  : 'Showing non-bot-compatible only — click to clear filter'
            }
            aria-label="Filter by bot compatibility"
            aria-pressed={filterBot !== ''}
            className={`relative inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors ${
              filterBot === 'true'
                ? 'border-primary-500 bg-primary-500 text-white'
                : filterBot === 'false'
                  ? 'border-red-400 bg-red-50 text-red-600 dark:border-red-500 dark:bg-red-900/20 dark:text-red-300'
                  : 'border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-500 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-600'
            }`}
          >
            <BotIcon />
            {filterBot === 'false' && (
              <>
                {/* Diagonal strike overlay indicating "exclude bot". */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none flex items-center justify-center"
                >
                  <span className="block w-5 h-0.5 bg-current rotate-45" />
                </span>
                <span className="sr-only">Filtered to non-bot-compatible</span>
              </>
            )}
          </button>
        </div>

        {filteredWords.length === 0 ? (
          <div className="text-surface-400 text-sm text-center py-4">No words found</div>
        ) : (
          <div className="max-h-[28rem] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-surface-800 z-10">
                <tr className="border-b border-surface-200 dark:border-surface-700 text-left">
                  <th className="py-2 pr-3 text-surface-500 dark:text-surface-400 font-medium">Word</th>
                  <th className="py-2 pr-3 text-surface-500 dark:text-surface-400 font-medium">Language</th>
                  <th className="py-2 pr-3 text-surface-500 dark:text-surface-400 font-medium">Difficulty</th>
                  <th className="py-2 pr-3 text-surface-500 dark:text-surface-400 font-medium">
                    <span className="inline-flex items-center" title="Bot compatible">
                      <BotIcon />
                      <span className="sr-only">Bot compatible</span>
                    </span>
                  </th>
                  <th className="py-2 text-surface-500 dark:text-surface-400 font-medium text-right w-40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWords.map((w) => {
                  const isEditing = editingId === w.id;
                  if (isEditing && editDraft) {
                    return (
                      <tr
                        key={w.id}
                        className="border-b border-surface-100 dark:border-surface-700/50 bg-primary-50/40 dark:bg-primary-900/10"
                      >
                        <td className="py-2 pr-3">
                          <input
                            type="text"
                            value={editDraft.word}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, word: e.target.value })
                            }
                            maxLength={100}
                            className="w-full px-2 py-1 rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                            autoFocus
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <select
                            value={editDraft.languageCode}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, languageCode: e.target.value })
                            }
                            className="px-2 py-1 rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                          >
                            {availableLanguages.map((l) => (
                              <option key={l.code} value={l.code}>
                                {l.code}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 pr-3">
                          <select
                            value={editDraft.difficulty}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, difficulty: Number(e.target.value) })
                            }
                            className="px-2 py-1 rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                          >
                            <option value={1}>Easy</option>
                            <option value={2}>Medium</option>
                            <option value={3}>Hard</option>
                          </select>
                        </td>
                        <td className="py-2 pr-3">
                          <BotToggle
                            value={editDraft.botCompatible}
                            onChange={(v) => setEditDraft({ ...editDraft, botCompatible: v })}
                            title={
                              editDraft.botCompatible
                                ? 'Bot compatible — click to disable'
                                : 'Not bot compatible — click to enable'
                            }
                          />
                        </td>
                        <td className="py-2 text-right whitespace-nowrap">
                          <div className="inline-flex gap-1.5">
                            <button
                              onClick={saveEdit}
                              disabled={editSaving}
                              className="text-[11px] px-2 py-1 rounded bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-semibold"
                            >
                              {editSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={editSaving}
                              className="text-[11px] px-2 py-1 rounded bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                          {editError && (
                            <div className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                              {editError}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={w.id}
                      className="border-b border-surface-100 dark:border-surface-700/50 hover:bg-surface-50 dark:hover:bg-surface-700/30"
                    >
                      <td className="py-2 pr-3 text-surface-900 dark:text-surface-50 font-medium">
                        {w.word}
                      </td>
                      <td className="py-2 pr-3 text-surface-600 dark:text-surface-400">
                        {w.languageCode}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColors[w.difficulty] || ''}`}
                        >
                          {difficultyLabels[w.difficulty]}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        {w.botCompatible ? (
                          <span
                            className="inline-flex items-center justify-center w-6 h-6 rounded bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                            title="Bot compatible"
                            aria-label="Bot compatible"
                          >
                            <BotIcon />
                          </span>
                        ) : (
                          <span className="text-[10px] text-surface-400" aria-hidden="true">—</span>
                        )}
                      </td>
                      <td className="py-2 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => startEdit(w)}
                            disabled={editingId !== null}
                            className="text-[11px] px-2 py-1 rounded bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => askDelete(w)}
                            disabled={editingId !== null}
                            className="text-[11px] px-2 py-1 rounded bg-red-500 hover:bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Delete
                          </button>
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

      {deleteTarget && (
        <DeleteWordConfirm
          target={deleteTarget}
          loading={deleteLoading}
          error={deleteError}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteError(null);
          }}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation modal
// ---------------------------------------------------------------------------

function DeleteWordConfirm({
  target,
  loading,
  error,
  onCancel,
  onConfirm,
}: {
  target: DeleteTarget;
  loading: boolean;
  error: string | null;
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
          Delete word?
        </h3>
        <p className="text-sm text-surface-600 dark:text-surface-300 mb-4">
          This will permanently delete the word{' '}
          <strong className="font-mono">"{target.word}"</strong>{' '}
          ({target.languageCode.toUpperCase()}, {difficultyLabels[target.difficulty]}) from the word list.{' '}
          <span className="text-red-600 dark:text-red-400 font-medium">
            This cannot be undone.
          </span>
        </p>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 rounded-button bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-sm font-semibold disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 rounded-button bg-red-500 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
