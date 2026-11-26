import { useEffect, useState } from 'react';

export type ThemePreference = 'dark' | 'light' | 'system';

const THEME_STORAGE_KEY = 'dropp_theme_v1';

function getInitialTheme(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      return saved;
    }
  } catch {
    // Ignore storage read errors in restricted frames
  }
  return 'dark';
}

export function useTheme() {
  const [themePref, setThemePref] = useState<ThemePreference>(getInitialTheme);
  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme: 'dark' | 'light' =
    themePref === 'system' ? (systemDark ? 'dark' : 'light') : themePref;

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', resolvedTheme === 'dark' ? '#000000' : '#FFFFFF');
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, themePref);
    } catch {
      // Ignore storage write errors
    }
  }, [themePref, resolvedTheme]);

  return {
    themePref,
    resolvedTheme,
    setThemePref,
  };
}
