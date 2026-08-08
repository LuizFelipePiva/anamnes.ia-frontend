// src/features/settings/pages/Settings.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Palette, Globe, Bell, Lock, CreditCard, Wrench,
  Sun, Moon, Check, User,
} from 'lucide-react';
import { MainMenu } from '@/shared/components';
import type { Accent, Density, Lang } from '@/core/components';
import { usePreferences } from '@/core/components';
import { useAuth } from '@/features/auth';
import { authFetch } from '@/core/utils';
import { config } from '@/config/env';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Toggles {
  lockReminder?: boolean;
  emailNotif?:   boolean;
  pushNotif?:    boolean;
  analytics?:    boolean;
  shareCases?:   boolean;
}

// ── Toggle Switch component ───────────────────────────────────────────────────
interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  id: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, id }) => (
  <button
    id={id}
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
      transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2
      focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
      ${checked ? 'bg-primary' : 'bg-border-main'}`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg
        ring-0 transition-transform duration-200 ease-in-out
        ${checked ? 'translate-x-5' : 'translate-x-0'}`}
    />
  </button>
);

// ── ToggleRow component ───────────────────────────────────────────────────────
interface ToggleRowProps {
  id: string;
  title: string;
  subtitle?: string;
  checked: boolean;
  onChange: () => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ id, title, subtitle, checked, onChange }) => (
  <div className="flex items-center justify-between p-4 bg-background rounded-xl gap-4">
    <div className="min-w-0">
      <div className="font-semibold text-text-main">{title}</div>
      {subtitle && <div className="text-xs text-text-muted mt-0.5">{subtitle}</div>}
    </div>
    <ToggleSwitch id={id} checked={checked} onChange={onChange} />
  </div>
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeTogglesKey(userId: string | null | undefined) {
  return userId ? `prefs_${userId}_toggles` : 'prefs_global_toggles';
}

function loadToggles(userId: string | null | undefined): Toggles {
  try {
    return JSON.parse(localStorage.getItem(makeTogglesKey(userId)) || '{}');
  } catch {
    return {};
  }
}

// ── Main Component ────────────────────────────────────────────────────────────
const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('settings');
  // Nomes dos idiomas moram em `common` (usados também fora desta página).
  const { t: tCommon } = useTranslation('common');
  const { theme, accent, lang, density, setTheme, setAccent, setLang, setDensity, resetVisualPreferences } = usePreferences();
  const { user, login } = useAuth();

  const [activeTab, setActiveTab] = useState('appearance');
  const [toggles, setToggles] = useState<Toggles>(() => loadToggles(user?.id));
  const [savedFlash, setSavedFlash] = useState(false);

  // Reload toggles when the user changes (login / logout / switch)
  useEffect(() => {
    setToggles(loadToggles(user?.id));
  }, [user?.id]);

  const flashSaved = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  const handleToggle = (key: keyof Toggles) => {
    const next = { ...toggles, [key]: !toggles[key] };
    setToggles(next);
    localStorage.setItem(makeTogglesKey(user?.id), JSON.stringify(next));
    flashSaved();
  };

  // Wrap setters to trigger the saved flash
  const handleSetTheme   = (v: typeof theme)   => { setTheme(v);   flashSaved(); };
  const handleSetAccent  = (v: typeof accent)  => { setAccent(v);  flashSaved(); };
  const handleSetLang    = (v: typeof lang)    => {
    setLang(v);
    flashSaved();
    // Persiste no perfil (RF8) e troca o JWT local pelo reemitido com o novo
    // idioma — sem isso o token antigo (maior precedência) reverteria a escolha
    // no próximo F5. Falha de rede não desfaz a troca local.
    if (user) {
      authFetch(`${config.apiUrl}/profile/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: v }),
      })
        .then(async (res) => {
          if (!res.ok) return;
          const data = await res.json().catch(() => null);
          if (data?.token) login(data.token);
        })
        .catch(() => { /* mantém a troca local; backend sincroniza depois */ });
    }
  };
  const handleSetDensity = (v: typeof density) => { setDensity(v); flashSaved(); };

  const handleReset = () => {
    if (!window.confirm(t('advanced.reset_confirm'))) return;
    localStorage.removeItem(makeTogglesKey(user?.id));
    resetVisualPreferences();
    setToggles({});
  };

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const tabs: { id: string; label: string; icon: React.ReactNode }[] = [
    { id: 'appearance',    label: t('tabs.appearance'),    icon: <Palette size={18} /> },
    { id: 'language',      label: t('tabs.language'),      icon: <Globe size={18} /> },
    { id: 'notifications', label: t('tabs.notifications'), icon: <Bell size={18} /> },
    { id: 'privacy',       label: t('tabs.privacy'),       icon: <Lock size={18} /> },
    { id: 'subscription',  label: t('tabs.subscription'),  icon: <CreditCard size={18} /> },
    { id: 'advanced',      label: t('tabs.advanced'),      icon: <Wrench size={18} /> },
  ];

  const accentMeta: Record<Accent, { label: string; color: string }> = {
    purple: { label: t('accent.purple'),    color: '#844AF5' },
    blue:   { label: t('accent.blue'),  color: '#3b82f6' },
    green:  { label: t('accent.green'),     color: '#10b981' },
    red:    { label: t('accent.red'), color: '#ef4444' },
  };

  const activeTabMeta = tabs.find(tab => tab.id === activeTab);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Decorative background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: [
            'radial-gradient(ellipse 65% 55% at 0% 0%, var(--accent-light) 0%, transparent 70%)',
            'radial-gradient(ellipse 45% 40% at 100% 100%, var(--accent-light) 0%, transparent 70%)',
          ].join(', '),
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--accent-light) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="flex flex-col sm:flex-row min-h-screen relative z-10">
        {/* Sidebar — desktop */}
        <div className="sm:block hidden self-start sticky top-0">
          <MainMenu />
        </div>
        {/* Top bar — mobile */}
        <div className="sm:hidden w-full fixed top-0 left-0 z-20">
          <MainMenu mobile />
        </div>
        <div className="sm:hidden h-20 w-full" />

        <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-10">

          {/* ── Header ── */}
          <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">{t('page_title')}</h1>
              <p className="text-text-muted max-w-3xl">{t('page_subtitle')}</p>
            </div>

            {/* Status card */}
            <div className="rounded-2xl border border-border-subtle bg-surface/95 backdrop-blur p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                  {t('status_label')}
                </p>
                {/* Saved indicator */}
                <span
                  className={`flex items-center gap-1.5 text-xs font-semibold text-primary transition-opacity duration-300 ${
                    savedFlash ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <Check size={12} />
                  {t('saved')}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-text-main border border-border-subtle">
                  {theme === 'dark' ? t('theme.dark') : t('theme.light')}
                </span>
                <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-text-main border border-border-subtle">
                  {t(density === 'compact' ? 'density.compact' : 'density.comfortable')}
                </span>
                <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-text-main border border-border-subtle">
                  {lang}
                </span>
              </div>
            </div>
          </div>

          {/* ── Main panel ── */}
          <div className="bg-surface rounded-[28px] shadow-lg min-h-[640px] grid xl:grid-cols-[240px_minmax(0,1fr)_280px] overflow-hidden border border-border-subtle">

            {/* Left nav */}
            <div className="bg-background border-b xl:border-b-0 xl:border-r border-border-subtle p-4 flex flex-row xl:flex-col gap-2 overflow-x-auto xl:overflow-visible">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-primary text-white shadow-md'
                      : 'text-text-muted hover:bg-border-subtle hover:text-text-main'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="font-semibold">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="min-w-0 p-6 sm:p-8 lg:p-10 overflow-y-auto border-b xl:border-b-0 xl:border-r border-border-subtle">

              {/* Section header */}
              <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                    {t('section_active')}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-light text-primary">
                      {activeTabMeta?.icon}
                    </span>
                    <div>
                      <h2 className="text-2xl font-bold text-text-main">{activeTabMeta?.label}</h2>
                      <p className="text-sm text-text-muted">{t('adjustments')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Appearance ── */}
              {activeTab === 'appearance' && (
                <div className="space-y-8 max-w-lg">
                  {/* Theme */}
                  <div>
                    <h3 className="text-lg font-bold text-text-main mb-4">{t('theme.title')}</h3>
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleSetTheme('light')}
                        className={`flex-1 p-5 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                          theme === 'light'
                            ? 'border-primary bg-primary-light'
                            : 'border-border-subtle text-text-muted hover:border-border-main'
                        }`}
                      >
                        <Sun size={22} className={theme === 'light' ? 'text-primary' : 'text-text-muted'} />
                        <span className={`font-bold ${theme === 'light' ? 'text-primary' : 'text-text-muted'}`}>{t('theme.light')}</span>
                        {theme === 'light' && (
                          <span className="text-xs font-semibold text-primary bg-primary-light rounded-full px-2 py-0.5">{t('theme.active')}</span>
                        )}
                      </button>
                      <button
                        onClick={() => handleSetTheme('dark')}
                        className={`flex-1 p-5 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                          theme === 'dark'
                            ? 'border-primary bg-primary-light'
                            : 'border-border-subtle text-text-muted hover:border-border-main'
                        }`}
                      >
                        <Moon size={22} className={theme === 'dark' ? 'text-primary' : 'text-text-muted'} />
                        <span className={`font-bold ${theme === 'dark' ? 'text-primary' : 'text-text-muted'}`}>{t('theme.dark')}</span>
                        {theme === 'dark' && (
                          <span className="text-xs font-semibold text-primary bg-primary-light rounded-full px-2 py-0.5">{t('theme.active')}</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Accent */}
                  <div>
                    <h3 className="text-lg font-bold text-text-main mb-4">{t('accent.title')}</h3>
                    <div className="flex gap-4">
                      {(['purple', 'blue', 'green', 'red'] as Accent[]).map(colorKey => (
                        <button
                          key={colorKey}
                          onClick={() => handleSetAccent(colorKey)}
                          title={accentMeta[colorKey].label}
                          className={`relative w-12 h-12 rounded-full border-4 transition-all hover:scale-110 ${
                            accent === colorKey ? 'border-text-main scale-110' : 'border-border-subtle'
                          }`}
                          style={{ backgroundColor: accentMeta[colorKey].color }}
                        >
                          {accent === colorKey && (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <Check size={16} className="text-white drop-shadow" />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-sm text-text-muted">{accentMeta[accent].label}</p>
                  </div>

                  {/* Density */}
                  <div>
                    <h3 className="text-lg font-bold text-text-main mb-4">{t('density.title')}</h3>
                    <div className="flex gap-4">
                      {(['comfortable', 'compact'] as Density[]).map(d => (
                        <button
                          key={d}
                          onClick={() => handleSetDensity(d)}
                          className={`flex-1 p-4 rounded-xl border-2 font-semibold transition-all ${
                            density === d
                              ? 'border-primary bg-primary-light text-primary'
                              : 'border-border-subtle text-text-muted hover:border-border-main'
                          }`}
                        >
                          {t(d === 'comfortable' ? 'density.comfortable' : 'density.compact')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Language ── */}
              {activeTab === 'language' && (
                <div className="space-y-6 max-w-lg">
                  <h3 className="text-lg font-bold text-text-main">{t('language.title')}</h3>
                  {lang !== 'pt-BR' && (
                    <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
                      <span aria-hidden="true">🚧</span>
                      <span>{t('language.wip')}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-3">
                    {/* Os nomes vêm de common.language_names (endônimos, iguais em
                        qualquer idioma da UI) — não duplicar aqui. */}
                    {([
                      { code: 'pt-BR', flag: '🇧🇷' },
                      { code: 'en',    flag: '🇺🇸' },
                      { code: 'es',    flag: '🇪🇸' },
                      { code: 'ru',    flag: '🇷🇺' },
                    ] as { code: Lang; flag: string }[]).map(language => (
                      <button
                        key={language.code}
                        onClick={() => handleSetLang(language.code as Lang)}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                          lang === language.code
                            ? 'border-primary bg-primary-light'
                            : 'border-border-subtle hover:bg-background hover:border-border-main'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{language.flag}</span>
                          <span className={`font-medium ${lang === language.code ? 'text-primary' : 'text-text-main'}`}>
                            {tCommon(`language_names.${language.code}`)}
                          </span>
                        </div>
                        {lang === language.code && (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                            <Check size={12} className="text-white" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Notifications ── */}
              {activeTab === 'notifications' && (
                <div className="space-y-4 max-w-lg">
                  <h3 className="text-lg font-bold text-text-main mb-2">{t('notifications.title')}</h3>
                  <ToggleRow
                    id="toggle-email"
                    title={t('notifications.email_label')}
                    subtitle={t('notifications.email_sub')}
                    checked={toggles.emailNotif || false}
                    onChange={() => handleToggle('emailNotif')}
                  />
                  <ToggleRow
                    id="toggle-push"
                    title={t('notifications.push_label')}
                    subtitle={t('notifications.push_sub')}
                    checked={toggles.pushNotif || false}
                    onChange={() => handleToggle('pushNotif')}
                  />
                </div>
              )}

              {/* ── Privacy ── */}
              {activeTab === 'privacy' && (
                <div className="space-y-4 max-w-lg">
                  <h3 className="text-lg font-bold text-text-main mb-2">{t('privacy.title')}</h3>
                  <ToggleRow
                    id="toggle-analytics"
                    title={t('privacy.analytics')}
                    subtitle={t('privacy.analytics_sub')}
                    checked={toggles.analytics !== false}
                    onChange={() => handleToggle('analytics')}
                  />
                  <ToggleRow
                    id="toggle-share"
                    title={t('privacy.share')}
                    subtitle={t('privacy.share_sub')}
                    checked={toggles.shareCases || false}
                    onChange={() => handleToggle('shareCases')}
                  />
                </div>
              )}

              {/* ── Subscription ── */}
              {activeTab === 'subscription' && (
                <div className="space-y-6 max-w-lg">
                  <h3 className="text-lg font-bold text-text-main">{t('subscription.title')}</h3>
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="text-sm opacity-80">{t('subscription.title')}</div>
                        <div className="text-2xl font-bold">{t('subscription.plan_name')}</div>
                      </div>
                      <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold tracking-wide">{t('subscription.active_badge')}</span>
                    </div>
                    <p className="text-sm opacity-90 mb-5">
                      {t('subscription.unlimited_desc')}
                    </p>
                    <button
                      onClick={() => navigate('/payments')}
                      className="bg-white text-primary w-full py-2.5 rounded-xl font-bold hover:bg-white/90 transition"
                    >
                      {t('subscription.manage')}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Advanced ── */}
              {activeTab === 'advanced' && (
                <div className="space-y-6 max-w-lg">
                  <h3 className="text-lg font-bold text-text-main">{t('advanced.title')}</h3>

                  {/* Danger zone — theme-aware */}
                  <div className="p-5 rounded-xl border border-border-subtle bg-background">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      <h4 className="font-bold text-text-main">{t('advanced.danger_title')}</h4>
                    </div>
                    <p className="text-sm text-text-muted mb-4">{t('advanced.danger_desc')}</p>
                    <button
                      onClick={handleReset}
                      className="border border-red-500/60 text-red-500 px-4 py-2 rounded-lg
                        hover:bg-red-500/10 transition text-sm font-bold"
                    >
                      {t('advanced.reset_btn')}
                    </button>
                  </div>

                  {/* Account info */}
                  {user && (
                    <div className="p-5 rounded-xl border border-border-subtle bg-background">
                      <h4 className="font-bold text-text-main mb-3">{t('advanced.account_info')}</h4>
                      <div className="space-y-2 text-sm text-text-muted">
                        <div className="flex gap-2">
                          <span className="font-semibold text-text-main w-16">{t('advanced.name')}</span>
                          <span>{user.name || '—'}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-semibold text-text-main w-16">{t('advanced.email')}</span>
                          <span>{user.email}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-semibold text-text-main w-16">{t('advanced.role')}</span>
                          <span className="capitalize">{user.role}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Debug — dev only */}
                  {import.meta.env.DEV && (
                    <div>
                      <h4 className="font-bold text-text-main mb-2 text-sm">{t('advanced.debug')}</h4>
                      <pre className="bg-background border border-border-subtle text-primary p-4 rounded-xl text-xs overflow-auto max-h-48">
                        {JSON.stringify({ theme, accent, lang, density, userId: user?.id, toggles }, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right aside — visual summary */}
            <aside className="p-6 sm:p-8 bg-background/60 backdrop-blur-sm">
              <div className="rounded-3xl border border-border-subtle bg-surface p-5 shadow-sm sticky top-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted mb-5">
                  {t('visual_summary')}
                </p>
                <div className="space-y-3">

                  {/* User */}
                  {user && (
                    <div className="rounded-2xl border border-border-subtle bg-background p-4 flex items-center gap-3">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                        <User size={16} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs text-text-muted">{t('summary.account')}</div>
                        <div className="text-sm font-bold text-text-main truncate">{user.name || user.email}</div>
                      </div>
                    </div>
                  )}

                  {/* Theme */}
                  <div className="rounded-2xl border border-border-subtle bg-background p-4">
                    <div className="text-xs text-text-muted">{t('summary.theme')}</div>
                    <div className="mt-1 flex items-center gap-2">
                      {theme === 'dark' ? <Moon size={14} className="text-primary" /> : <Sun size={14} className="text-primary" />}
                      <span className="text-sm font-bold text-text-main">
                        {theme === 'dark' ? t('theme.dark_mode') : t('theme.light_mode')}
                      </span>
                    </div>
                  </div>

                  {/* Accent */}
                  <div className="rounded-2xl border border-border-subtle bg-background p-4">
                    <div className="text-xs text-text-muted">{t('summary.accent')}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className="h-4 w-4 rounded-full border border-black/10 flex-shrink-0"
                        style={{ backgroundColor: accentMeta[accent].color }}
                      />
                      <span className="text-sm font-semibold text-text-main">{accentMeta[accent].label}</span>
                    </div>
                  </div>

                  {/* Density */}
                  <div className="rounded-2xl border border-border-subtle bg-background p-4">
                    <div className="text-xs text-text-muted">{t('summary.density')}</div>
                    <div className="mt-1 text-sm font-bold text-text-main">
                      {t(density === 'compact' ? 'density.compact' : 'density.comfortable')}
                    </div>
                  </div>

                  {/* Language */}
                  <div className="rounded-2xl border border-border-subtle bg-background p-4">
                    <div className="text-xs text-text-muted">{t('summary.language')}</div>
                    <div className="mt-1 text-sm font-bold text-text-main">{lang}</div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
