import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  type Accent,
  type Density,
  type Lang,
  ThemeContext,
  type Theme,
} from './themePreferences';
import i18n from '@/core/i18n';
import { detectInitialLang, dirFor } from '@/core/i18n/resolveLocale';

// ── Accent CSS tokens ──────────────────────────────────────────────────────────
const ACCENT_TOKENS: Record<Accent, { base: string; light: string; dark: string }> = {
  purple: { base: '#844AF5', light: 'rgba(132, 74, 245, 0.12)', dark: '#6d38d4' },
  blue:   { base: '#3b82f6', light: 'rgba(59, 130, 246, 0.12)',  dark: '#2563eb' },
  green:  { base: '#10b981', light: 'rgba(16, 185, 129, 0.12)',  dark: '#059669' },
  red:    { base: '#ef4444', light: 'rgba(239, 68, 68, 0.12)',   dark: '#dc2626' },
};

// ── Type guards ────────────────────────────────────────────────────────────────
const isTheme   = (v: string): v is Theme   => v === 'light' || v === 'dark';
const isAccent  = (v: string): v is Accent  => ['purple', 'blue', 'green', 'red'].includes(v);
const isDensity = (v: string): v is Density => v === 'comfortable' || v === 'compact';

const DEFAULTS = {
  theme:   'light'        as Theme,
  accent:  'purple'       as Accent,
  lang:    'pt-BR'        as Lang,
  density: 'comfortable'  as Density,
};

// ── Per-user key builder ───────────────────────────────────────────────────────
// When userId is null/undefined we fall back to a global key (unauthenticated state).
function makePrefsKey(userId: string | null | undefined, field: string): string {
  const prefix = userId ? `prefs_${userId}` : 'prefs_global';
  return `${prefix}_${field}`;
}

function readStored<T extends string>(key: string, guard: (v: string) => v is T, fallback: T): T {
  const val = window.localStorage.getItem(key);
  return val && guard(val) ? val : fallback;
}

// Resolve o idioma por precedência (SPEC-007 / RF4/RF8):
// perfil (do JWT, prevalece no login) > localStorage do usuário > navegador > pt-BR.
function resolveLangPref(userId: string | null | undefined, profileLang?: string | null): Lang {
  return detectInitialLang({
    profileLang,
    storedLang: window.localStorage.getItem(makePrefsKey(userId, 'lang')),
    navigatorLangs: window.navigator?.languages ?? [window.navigator?.language],
  });
}

function readAllPrefs(userId: string | null | undefined, profileLang?: string | null) {
  return {
    theme:   readStored(makePrefsKey(userId, 'theme'),   isTheme,   DEFAULTS.theme),
    accent:  readStored(makePrefsKey(userId, 'accent'),  isAccent,  DEFAULTS.accent),
    lang:    resolveLangPref(userId, profileLang),
    density: readStored(makePrefsKey(userId, 'density'), isDensity, DEFAULTS.density),
  };
}

// ── DOM appliers ──────────────────────────────────────────────────────────────
function applyAccent(accent: Accent) {
  const root   = document.documentElement;
  const tokens = ACCENT_TOKENS[accent];
  root.style.setProperty('--accent-color', tokens.base);
  root.style.setProperty('--accent-light', tokens.light);
  root.style.setProperty('--accent-dark',  tokens.dark);
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.classList.toggle('dark', theme === 'dark');
}

function applyDensity(density: Density) {
  document.documentElement.setAttribute('data-density', density);
}

function applyLang(lang: Lang) {
  document.documentElement.lang = lang;
  // Direção derivada do ICU, não de lista hardcoded (SPEC-008 §9.7). Hoje sempre
  // 'ltr'; um idioma RTL futuro passa a espelhar o layout sem tocar aqui.
  document.documentElement.dir = dirFor(lang);
  // Mantém o i18next em sincronia com a preferência (fonte da verdade = ThemeProvider).
  if (i18n.language !== lang) void i18n.changeLanguage(lang);
}

// ── Props type (accepts optional userId instead of coupling with auth) ─────────
interface ThemeProviderProps {
  children: React.ReactNode;
  /** Pass the logged-in user's ID so preferences are scoped per account. */
  userId?: string | null;
  /** Idioma vindo do perfil (JWT). Prevalece no login sobre localStorage (RF8). */
  profileLang?: Lang | null;
}

// ── Provider ──────────────────────────────────────────────────────────────────
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, userId = null, profileLang = null }) => {
  // ── Initial state from localStorage ─────────────────────────────────────
  const initial = readAllPrefs(userId, profileLang);

  const [theme,   setThemeState]   = useState<Theme>  (initial.theme);
  const [accent,  setAccentState]  = useState<Accent> (initial.accent);
  const [lang,    setLangState]    = useState<Lang>   (initial.lang);
  const [density, setDensityState] = useState<Density>(initial.density);

  // Track previous userId to detect account switches
  const prevUserId = useRef<string | null | undefined>(userId);

  // ── When the user changes (login / logout / account switch) ───────────────
  useEffect(() => {
    if (prevUserId.current === userId) return;
    prevUserId.current = userId;

    const p = readAllPrefs(userId, profileLang);
    setThemeState(p.theme);
    setAccentState(p.accent);
    setLangState(p.lang);
    setDensityState(p.density);

    // Apply immediately to avoid a flash
    applyTheme(p.theme);
    applyAccent(p.accent);
    applyDensity(p.density);
    applyLang(p.lang);
  }, [userId, profileLang]);

  // ── Persist + apply on each state change ─────────────────────────────────
  useEffect(() => {
    window.localStorage.setItem(makePrefsKey(userId, 'theme'), theme);
    applyTheme(theme);
  }, [theme, userId]);

  useEffect(() => {
    window.localStorage.setItem(makePrefsKey(userId, 'accent'), accent);
    applyAccent(accent);
  }, [accent, userId]);

  useEffect(() => {
    window.localStorage.setItem(makePrefsKey(userId, 'lang'), lang);
    applyLang(lang);
  }, [lang, userId]);

  useEffect(() => {
    window.localStorage.setItem(makePrefsKey(userId, 'density'), density);
    applyDensity(density);
  }, [density, userId]);

  const resetVisualPreferences = useCallback(() => {
    setThemeState(DEFAULTS.theme);
    setAccentState(DEFAULTS.accent);
    setLangState(DEFAULTS.lang);
    setDensityState(DEFAULTS.density);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        accent,
        lang,
        density,
        setTheme:              setThemeState,
        setAccent:             setAccentState,
        setLang:               setLangState,
        setDensity:            setDensityState,
        resetVisualPreferences,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
