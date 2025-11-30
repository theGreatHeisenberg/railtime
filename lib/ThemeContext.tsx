'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeName, Theme, themes } from './themes';

interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>('dark');
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme-preference') as ThemeName | null;
    if (saved && themes[saved]) {
      setThemeName(saved);
    }
    setMounted(true);
  }, []);

  // Save theme to localStorage when it changes
  const handleSetTheme = (name: ThemeName) => {
    setThemeName(name);
    localStorage.setItem('theme-preference', name);
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme: themes[themeName], themeName, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Return default dark theme when context is not available (e.g., during static generation)
    return { theme: themes.dark, themeName: 'dark' as ThemeName, setTheme: () => {} };
  }
  return context;
}
