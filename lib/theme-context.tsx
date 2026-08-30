'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ============================================================
// Types
// ============================================================

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;           // User's chosen mode (light | dark | system)
  resolvedTheme: ResolvedTheme; // The actually applied theme
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;    // Toggles between light ↔ dark
}

const ThemeContext = createContext<ThemeContextType | null>(null);
const STORAGE_KEY = 'venue_os_theme';

// ============================================================
// Helpers
// ============================================================

function getSystemPreference(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeToDOM(resolved: ResolvedTheme) {
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }
}

// ============================================================
// Provider
// ============================================================

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  const resolve = useCallback((mode: ThemeMode): ResolvedTheme => {
    return mode === 'system' ? getSystemPreference() : mode;
  }, []);

  const applyTheme = useCallback((mode: ThemeMode) => {
    const resolved = resolve(mode);
    setResolvedTheme(resolved);
    applyThemeToDOM(resolved);
  }, [resolve]);

  // On mount: restore persisted theme preference
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) || 'system';
    setThemeState(stored);
    applyTheme(stored);
  }, [applyTheme]);

  // Watch for OS preference changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme, applyTheme]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    const next: ResolvedTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
