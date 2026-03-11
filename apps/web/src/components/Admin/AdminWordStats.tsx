import { useEffect, useState } from 'react';
import { useAdminStore } from '@/stores/adminStore';

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

export default function AdminWordStats() {
  const {
    wordStats,
    wordList,
    availableLanguages,
    fetchWordStats,
    fetchWords,
    fetchLanguages,
    addWord,
    deleteWord,
  } = useAdminStore();

  const [filterLang, setFilterLang] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [newWord, setNewWord] = useState('');
  const [newLang, setNewLang] = useState('');
  const [newDifficulty, setNewDifficulty] = useState(1);
  const [addStatus, setAddStatus] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchWordStats();
    fetchLanguages();
  }, [fetchWordStats, fetchLanguages]);

  useEffect(() => {
    fetchWords(filterLang || undefined, filterDifficulty || undefined);
  }, [filterLang, filterDifficulty, fetchWords]);

  // Set default newLang when languages load
  useEffect(() => {
    if (availableLanguages.length > 0 && !newLang) {
      setNewLang(availableLanguages[0].code);
    }
  }, [availableLanguages, newLang]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || !newLang) return;
    setAddLoading(true);
    setAddStatus(null);
    try {
      await addWord(newLang, newWord.trim(), newDifficulty);
      setAddStatus(`Added "${newWord.trim()}"`);
      setNewWord('');
      fetchWords(filterLang || undefined, filterDifficulty || undefined);
      fetchWordStats();
    } catch (err: any) {
      setAddStatus(err.message || 'Failed to add word');
    }
    setAddLoading(false);
  };

  const handleDelete = async (id: number, word: string) => {
    try {
      await deleteWord(id);
      fetchWords(filterLang || undefined, filterDifficulty || undefined);
      fetchWordStats();
    } catch {
      // silently fail
    }
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
        </div>

        {filteredWords.length === 0 ? (
          <div className="text-surface-400 text-sm text-center py-4">No words found</div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-surface-800">
                <tr className="border-b border-surface-200 dark:border-surface-700 text-left">
                  <th className="py-2 pr-3 text-surface-500 dark:text-surface-400 font-medium">Word</th>
                  <th className="py-2 pr-3 text-surface-500 dark:text-surface-400 font-medium">Language</th>
                  <th className="py-2 pr-3 text-surface-500 dark:text-surface-400 font-medium">Difficulty</th>
                  <th className="py-2 text-surface-500 dark:text-surface-400 font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {filteredWords.map((w) => (
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
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColors[w.difficulty] || ''}`}>
                        {difficultyLabels[w.difficulty]}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => handleDelete(w.id, w.word)}
                        className="text-xs px-2 py-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
