import { useCallback, useEffect, useState } from 'react';
import type { ThemeMode } from '../types/kana';

const THEME_STORAGE_KEY = 'kana-sho-theme';

function getInitialTheme(): ThemeMode {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'sumi' || attr === 'washi') return attr;
  }
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'sumi' || saved === 'washi') return saved;
  } catch {
    // ignore storage restrictions
  }
  return 'washi';
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'washi' ? 'sumi' : 'washi'));
  }, []);

  return { theme, setTheme, toggleTheme };
}
