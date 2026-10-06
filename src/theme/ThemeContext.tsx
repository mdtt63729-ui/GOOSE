import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';
export type DynamicPalette = 'teal' | 'ocean' | 'sage' | 'coral' | 'lavender';

interface ThemeContextType {
  mode: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  dynamicColor: boolean;
  setDynamicColor: (enabled: boolean) => void;
  dynamicPalette: DynamicPalette;
  setDynamicPalette: (palette: DynamicPalette) => void;
  hapticsEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
  triggerHaptic: (type?: 'light' | 'medium' | 'heavy' | 'selection') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('goose_theme_mode') as ThemeMode) || 'dark';
  });

  const [dynamicColor, setDynamicColorState] = useState<boolean>(() => {
    const saved = localStorage.getItem('goose_dynamic_color');
    return saved !== null ? saved === 'true' : true;
  });

  const [dynamicPalette, setDynamicPaletteState] = useState<DynamicPalette>(() => {
    return (localStorage.getItem('goose_dynamic_palette') as DynamicPalette) || 'teal';
  });

  const [hapticsEnabled, setHapticsEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem('goose_haptics');
    return saved !== null ? saved === 'true' : true;
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const effectiveTheme: 'light' | 'dark' =
    mode === 'system' ? (systemIsDark ? 'dark' : 'light') : mode;

  useEffect(() => {
    const root = document.documentElement;
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    if (dynamicColor && dynamicPalette !== 'teal') {
      root.setAttribute('data-dynamic-palette', dynamicPalette);
    } else {
      root.removeAttribute('data-dynamic-palette');
    }

    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', effectiveTheme === 'dark' ? '#101415' : '#fbfcfe');
    }
  }, [effectiveTheme, dynamicColor, dynamicPalette]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem('goose_theme_mode', newMode);
  };

  const setDynamicColor = (enabled: boolean) => {
    setDynamicColorState(enabled);
    localStorage.setItem('goose_dynamic_color', String(enabled));
  };

  const setDynamicPalette = (palette: DynamicPalette) => {
    setDynamicPaletteState(palette);
    localStorage.setItem('goose_dynamic_palette', palette);
  };

  const setHapticsEnabled = (enabled: boolean) => {
    setHapticsEnabledState(enabled);
    localStorage.setItem('goose_haptics', String(enabled));
  };

  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'selection' = 'light') => {
    if (!hapticsEnabled) return;
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        if (type === 'light' || type === 'selection') navigator.vibrate(10);
        else if (type === 'medium') navigator.vibrate(25);
        else if (type === 'heavy') navigator.vibrate([35, 20, 35]);
      }
    } catch {
      // Ignore vibration errors on unsupported environments
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        mode,
        effectiveTheme,
        setMode,
        dynamicColor,
        setDynamicColor,
        dynamicPalette,
        setDynamicPalette,
        hapticsEnabled,
        setHapticsEnabled,
        triggerHaptic,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
