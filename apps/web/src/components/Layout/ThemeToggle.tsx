import { useSettingsStore } from '@/stores/settingsStore';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useSettingsStore();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="relative w-[4.2rem] h-[2.1rem] rounded-full bg-surface-200 dark:bg-surface-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-surface-800"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      role="switch"
      aria-checked={isDark}
    >
      {/* Track icons */}
      <span className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
        {/* Sun icon (left side, visible in dark mode as target) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-opacity duration-300 ${isDark ? 'opacity-40 text-surface-400' : 'opacity-0'}`}
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
        {/* Moon icon (right side, visible in light mode as target) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-opacity duration-300 ${isDark ? 'opacity-0' : 'opacity-40 text-surface-500'}`}
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      </span>

      {/* Sliding knob */}
      <div
        className={`absolute top-0.5 left-0.5 w-7 h-7 rounded-full bg-white dark:bg-surface-300 shadow-md flex items-center justify-center transition-transform duration-300 ease-in-out ${isDark ? 'translate-x-[1.95rem]' : 'translate-x-0'}`}
      >
        {/* Moon icon */}
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`absolute text-indigo-500 transition-all duration-300 ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-30 scale-50'}`}>
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
        {/* Sun icon */}
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`absolute text-amber-500 transition-all duration-300 ${isDark ? 'opacity-0 rotate-30 scale-50' : 'opacity-100 rotate-0 scale-100'}`}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      </div>
    </button>
  );
}
