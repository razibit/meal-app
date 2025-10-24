import { useEffect, useState } from 'react';

type Theme = 'eggplant' | 'dark';

export function ThemeToggle() {
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
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Theme</h3>

      <div className="space-y-3">
        <p className="text-sm text-text-secondary mb-4">
          Choose your preferred color theme
        </p>

        <div className="flex gap-3">
          {/* Eggplant Theme Option */}
          <button
            onClick={() => handleThemeChange('eggplant')}
            className={`flex-1 p-4 rounded-lg border-2 transition-all ${
              theme === 'eggplant'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#5B4B8A] to-[#E8B4F0]" />
              <span className="font-medium text-sm">Eggplant</span>
              {theme === 'eggplant' && (
                <span className="text-xs text-primary">✓ Active</span>
              )}
            </div>
          </button>

          {/* Dark Theme Option */}
          <button
            onClick={() => handleThemeChange('dark')}
            className={`flex-1 p-4 rounded-lg border-2 transition-all ${
              theme === 'dark'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1A1A1A] to-[#3A3A3A]" />
              <span className="font-medium text-sm">Dark</span>
              {theme === 'dark' && (
                <span className="text-xs text-primary">✓ Active</span>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
