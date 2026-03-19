import { useState, useRef, useEffect } from 'react';
import { COUNTRIES } from '@doodledraw/shared';

interface CountrySelectProps {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  className?: string;
}

export default function CountrySelect({ value, onChange, placeholder = 'Search country...', className = '' }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCountry = (COUNTRIES as readonly { code: string; name: string }[]).find(
    (c) => c.code === value,
  );

  const filtered = search
    ? (COUNTRIES as readonly { code: string; name: string }[]).filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase()),
      )
    : (COUNTRIES as readonly { code: string; name: string }[]);

  // Close dropdown on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (code: string) => {
    onChange(code);
    setSearch('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        onClick={() => {
          setOpen(!open);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="w-full px-3 py-2 rounded-button bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 text-sm cursor-pointer flex items-center justify-between"
      >
        <span className={selectedCountry ? '' : 'text-surface-400'}>
          {selectedCountry ? selectedCountry.name : placeholder}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-surface-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-600 rounded-lg shadow-game-lg overflow-hidden">
          <div className="p-2 border-b border-surface-200 dark:border-surface-700">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full px-2.5 py-1.5 rounded bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 text-sm focus:border-primary-500 focus:outline-none"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-surface-400">No results</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelect(c.code)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors ${
                    value === c.code ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-semibold' : ''
                  }`}
                >
                  {c.name}
                  <span className="ml-1.5 text-[10px] text-surface-400">{c.code}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
