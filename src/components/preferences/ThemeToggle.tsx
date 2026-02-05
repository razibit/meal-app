import { useEffect, useId, useState } from 'react';

type Theme = 'eggplant' | 'dark';

export function ThemeToggle() {
  const labelId = useId();
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved === 'dark' ? 'dark' : 'eggplant') as Theme;
  });

  useEffect(() => {
    // Apply theme to document root
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className="inline-flex items-center rounded-lg border border-border bg-bg-secondary p-1"
    >
      <span id={labelId} className="sr-only">
        Theme
      </span>

      <button
        type="button"
        onClick={() => handleThemeChange('eggplant')}
        aria-pressed={theme === 'eggplant'}
        className={
          `min-h-touch min-w-touch rounded-md px-3 text-sm font-medium transition-colors ` +
          `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary ` +
          (theme === 'eggplant'
            ? 'bg-bg-primary text-text-primary'
            : 'text-text-secondary hover:text-text-primary')
        }
      >
        Light
      </button>

      <button
        type="button"
        onClick={() => handleThemeChange('dark')}
        aria-pressed={theme === 'dark'}
        className={
          `min-h-touch min-w-touch rounded-md px-3 text-sm font-medium transition-colors ` +
          `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary ` +
          (theme === 'dark'
            ? 'bg-bg-primary text-text-primary'
            : 'text-text-secondary hover:text-text-primary')
        }
      >
        Dark
      </button>
    </div>
  );
}
