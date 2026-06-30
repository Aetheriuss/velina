'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'rbx_theme_v2';
/** Legacy key from the 2016 frontend; `obc2016` maps to dark, anything else to light. */
const LEGACY_KEY = 'rbx_theme_v1';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Inline script run before first paint to set `data-theme` and avoid a
 * light/dark flash. Mirrors the resolution logic in resolveInitialTheme().
 * Injected via dangerouslySetInnerHTML in app/layout.tsx.
 */
export const themeInitScript = `
(function(){try{
  var t = localStorage.getItem('${STORAGE_KEY}');
  if(t!=='light'&&t!=='dark'){
    var legacy = localStorage.getItem('${LEGACY_KEY}');
    t = legacy==='obc2016' ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', t);
}catch(e){document.documentElement.setAttribute('data-theme','light');}})();
`;

const resolveInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t === 'light' || t === 'dark') return t;
    const legacy = localStorage.getItem(LEGACY_KEY);
    return legacy === 'obc2016' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light');

  // Sync React state with whatever the FOUC-guard script already applied.
  useEffect(() => {
    setThemeState(resolveInitialTheme());
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', t);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
