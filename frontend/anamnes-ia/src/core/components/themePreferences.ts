import { createContext, useContext } from 'react';
import type { Lang } from '@/core/i18n/resolveLocale';

export type Theme = 'light' | 'dark';
export type Accent = 'purple' | 'blue' | 'green' | 'red';
// Idiomas suportados (SPEC-007): pt-BR/en/es. Fonte da verdade em `@/core/i18n`.
export type { Lang };
export type Density = 'comfortable' | 'compact';

export interface ThemeContextProps {
  theme: Theme;
  accent: Accent;
  lang: Lang;
  density: Density;
  setTheme: (value: Theme) => void;
  setAccent: (value: Accent) => void;
  setLang: (value: Lang) => void;
  setDensity: (value: Density) => void;
  resetVisualPreferences: () => void;
}

export const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const usePreferences = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('usePreferences must be used within a ThemeProvider');
  }
  return context;
};

export const useTheme = usePreferences;
