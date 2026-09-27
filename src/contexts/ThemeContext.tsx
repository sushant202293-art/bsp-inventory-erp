import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { themes, defaultTheme, type ThemeConfig } from '@/config/theme.config';

interface ThemeContextType {
  theme: ThemeConfig;
  themeId: string;
  themes: ThemeConfig[];
  setTheme: (themeId: string) => void;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolvedMode: 'dark' | 'light';
  isDark: boolean;
}

export type ThemeMode = 'dark' | 'light' | 'system';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyThemeToDOM(theme: ThemeConfig) {
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssVar = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVar, value);
  });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeConfig>(() => {
    const stored = localStorage.getItem('bsp_theme');
    if (stored) {
      const found = themes.find((t) => t.id === stored);
      if (found) return found;
    }
    return defaultTheme;
  });

  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('bsp_theme_mode');
    return stored === 'light' || stored === 'system' ? stored : 'dark';
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolvedMode: 'dark' | 'light' = mode === 'system'
    ? (systemPrefersDark ? 'dark' : 'light')
    : mode;

  const setTheme = useCallback((themeId: string) => {
    const found = themes.find((t) => t.id === themeId);
    if (found) {
      setThemeState(found);
      localStorage.setItem('bsp_theme', themeId);
    }
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    localStorage.setItem('bsp_theme_mode', next);
  }, []);

  useEffect(() => {
    applyThemeToDOM(theme);
    document.documentElement.classList.toggle('dark', resolvedMode === 'dark');
  }, [theme, resolvedMode]);

  const isDark = resolvedMode === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, themeId: theme.id, themes, setTheme, mode, setMode, resolvedMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
