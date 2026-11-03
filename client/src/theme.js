import { useEffect, useState } from 'react';

// Light or dark, remembered per browser. With no choice saved, it follows the device setting.
// index.html applies the same rule before React loads, so the page doesn't flash light first.
const THEME_KEY = 'surgd.theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');

function saved() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

const current = () => saved() ?? (media.matches ? 'dark' : 'light');
const apply = (theme) => document.documentElement.classList.toggle('dark', theme === 'dark');

export function useTheme() {
  const [theme, setTheme] = useState(current);

  useEffect(() => {
    apply(theme);
  }, [theme]);

  useEffect(() => {
    const follow = () => !saved() && setTheme(current());
    media.addEventListener('change', follow);
    return () => media.removeEventListener('change', follow);
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private mode: the choice lasts until the page is reloaded.
    }
    setTheme(next);
  };

  return { theme, toggle };
}
