import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  LayoutDashboard, GraduationCap, History, TrendingUp, Trophy,
  ChevronLeft, BookOpen, CheckCircle, Star, Clock, User,
  Swords, AlertCircle, Calendar, MessageSquare, Menu, Layers,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { fetchMyProfile } from '@/features/profile/services/profileService';
import { joinClass, fetchAvailableCases, fetchDailyQuota } from '@/features/chat/services/studentService';
import type { AvailableCase, DailyQuota } from '@/features/chat/services/studentService';
import type { StudentProfile, WeeklyScore, AttemptHistory, EnrolledClass } from '@/features/profile/types/profile';
import StudentFlashcardsView from '@/features/student/components/StudentFlashcardsView';
import { specialtyLabel } from '@/shared/utils/specialties';

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'classes' | 'history' | 'performance' | 'achievements' | 'flashcards';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name?: string | null, email?: string | null): string {
  if (name) return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  return email?.[0]?.toUpperCase() ?? '?';
}

function fmtDuration(secs: number): string {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtExpiry(expiresAt: string | null | undefined, t: TFunction<'student'>, locale: string): string | null {
  if (!expiresAt) return null;
  const expiresMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresMs)) return null;
  const diffMs = expiresMs - Date.now();
  if (diffMs <= 0) return t('expiry.today');
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return t('expiry.hours', { count: diffHours });
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return t('expiry.days', { count: diffDays });
  return t('expiry.date', { date: new Date(expiresAt).toLocaleDateString(locale) });
}

// Rótulo traduzido da dificuldade (só exibição; as chaves seguem a lógica).
function diffLabel(d: string | null, t: TFunction<'student'>): string {
  const key: Record<string, 'basico' | 'medio' | 'avancado'> = {
    Básico: 'basico', Intermediário: 'medio', Avançado: 'avancado',
    easy: 'basico', medium: 'medio', hard: 'avancado',
  };
  return d && key[d] ? t(`difficulty.${key[d]}`) : (d ?? '—');
}

function diffColors(d: string | null): string {
  if (!d) return 'bg-slate-100 text-slate-500';
  const k = d.toLowerCase();
  if (k === 'básico' || k === 'easy') return 'bg-emerald-100 text-emerald-700';
  if (k === 'avançado' || k === 'hard') return 'bg-rose-100 text-rose-700';
  return 'bg-amber-100 text-amber-700';
}

function scoreColors(score: number | null): string {
  if (score === null) return 'bg-slate-100 text-slate-500';
  if (score >= 80) return 'bg-emerald-100 text-emerald-700';
  if (score >= 60) return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
}

// ── Weekly Chart ──────────────────────────────────────────────────────────────

function WeeklyChart({ weeks }: { weeks: WeeklyScore[] }) {
  const { t } = useTranslation('student');
  const W = 560; const H = 120;
  const PAD = { top: 10, right: 10, bottom: 28, left: 32 };
  if (weeks.length === 0) {
    return <div className="flex items-center justify-center h-28 text-slate-400 text-sm">{t('no_data')}</div>;
  }
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const xOf = (i: number) => PAD.left + (i / Math.max(weeks.length - 1, 1)) * chartW;
  const yOf = (v: number) => PAD.top + chartH - (v / 100) * chartH;
  const points = weeks.map((w, i) => `${xOf(i)},${yOf(w.avg_score ?? 0)}`).join(' ');
  const area = [`${xOf(0)},${PAD.top + chartH}`, ...weeks.map((w, i) => `${xOf(i)},${yOf(w.avg_score ?? 0)}`), `${xOf(weeks.length - 1)},${PAD.top + chartH}`].join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id="sdGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 50, 100].map(t => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={yOf(t)} y2={yOf(t)} stroke="#e2e8f0" strokeWidth="1" />
          <text x={PAD.left - 6} y={yOf(t) + 4} textAnchor="end" fontSize="9" fill="#94a3b8">{t}</text>
        </g>
      ))}
      <polygon points={area} fill="url(#sdGrad)" />
      <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {weeks.map((w, i) => (
        <circle key={i} cx={xOf(i)} cy={yOf(w.avg_score ?? 0)} r="3.5" fill="white" stroke="#6366f1" strokeWidth="2" />
      ))}
      {weeks.map((w, i) => (
        <text key={i} x={xOf(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#94a3b8">
          {w.week.replace(/^\d{4}-W/, 'S')}
        </text>
      ))}
    </svg>
  );
}

// ── Tab: Visão Geral ──────────────────────────────────────────────────────────

function OverviewTab({ profile, onNavigate, onOpenJoin, quota }: { profile: StudentProfile; onNavigate: (tab: TabId) => void; onOpenJoin: () => void; quota?: DailyQuota | null }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('student');
  const { stats, history, weekly_scores, classes, user } = profile;

  const statCards = [
    { label: t('stats.cases_started'), value: stats.total_attempts,   icon: <BookOpen size={18} />,    color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
    { label: t('stats.completed'),     value: stats.completed,        icon: <CheckCircle size={18} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: t('stats.avg_score'),     value: stats.average_score != null && stats.average_score > 0 ? `${stats.average_score.toFixed(1)}` : '—', icon: <Star size={18} />, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: t('stats.best_score'),    value: stats.best_score != null && stats.best_score > 0 ? `${stats.best_score}` : '—', icon: <Trophy size={18} />, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: t('stats.avg_time'),      value: fmtDuration(stats.average_duration_seconds ?? 0), icon: <Clock size={18} />, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: t('stats.classes'),       value: classes.length, icon: <GraduationCap size={18} />, color: 'text-teal-600', bg: 'bg-teal-50' },
  ];

  const lastAttempts = [...history]
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">{t('overview.greeting', { name: user.name?.split(' ')[0] ?? t('overview.greeting_fallback') })}</h2>
        <p className="text-slate-500 text-sm mt-0.5">{t('overview.greeting_subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {statCards.map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${c.bg} ${c.color}`}>{c.icon}</div>
            <p className="text-2xl font-bold text-slate-800">{c.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <History size={15} className="text-indigo-400" /> {t('overview.recent_activity')}
            </h3>
            <button onClick={() => onNavigate('history')} className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors">
              {t('overview.see_all')}
            </button>
          </div>
          {lastAttempts.length === 0 ? (
            <div className="text-center py-6">
              <Swords size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">{t('overview.no_activity')}</p>
              <button onClick={() => navigate('/student-chat')} className="mt-3 text-xs text-indigo-500 hover:text-indigo-700 transition-colors">
                {t('start_now')}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {lastAttempts.map(a => (
                <div key={a.attempt_id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/conversation/${a.conversation_id ?? a.attempt_id}`)}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold ${a.is_ai_chat ? 'bg-violet-100 text-violet-600' : scoreColors(a.score)}`}>
                    {a.is_ai_chat ? <MessageSquare size={16} /> : (a.score ?? '—')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 truncate">{a.case_title}</p>
                    {!a.is_ai_chat && (
                      <p className="text-xs font-semibold text-indigo-400">{t('initial_listen')}</p>
                    )}
                    {!a.is_ai_chat && a.queixa_principal ? (
                      <p className="text-xs text-slate-400 truncate">{a.queixa_principal}</p>
                    ) : (
                      <p className="text-xs text-slate-400">{fmtDate(a.started_at, i18n.language)}</p>
                    )}
                  </div>
                  {a.is_ai_chat ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 bg-violet-100 text-violet-700">{t('chat_ai')}</span>
                  ) : (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${diffColors(a.difficulty)}`}>
                      {diffLabel(a.difficulty, t)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <TrendingUp size={15} className="text-indigo-400" /> {t('overview.weekly_evolution')}
            </h3>
            <button onClick={() => onNavigate('performance')} className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors">
              {t('overview.details')}
            </button>
          </div>
          <WeeklyChart weeks={weekly_scores} />
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#844AF5] to-[#6b35ff] rounded-2xl p-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-white font-bold text-base">{t('overview.cta_title')}</p>
          <p className="text-violet-200 text-sm mt-0.5">{t('overview.cta_subtitle')}</p>
          {quota && (
            <div className="flex gap-2 mt-2">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
                {t('overview.quota_cases', { used: quota.regular_used, limit: quota.regular_limit })}
              </span>
              {quota.is_paid && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {t('overview.quota_ai', { used: quota.ai_used, limit: quota.ai_limit })}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onOpenJoin}
            className="bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
          >
            <GraduationCap size={14} className="flex-shrink-0" /> {t('overview.join_class')}
          </button>
          <button
            onClick={() => { if (!quota || (quota.is_paid && quota.ai_available > 0)) navigate('/student-chat'); }}
            disabled={!!(quota && (!quota.is_paid || quota.ai_available === 0))}
            className={`text-sm font-bold px-5 py-2.5 rounded-xl transition-all ${
              quota && (!quota.is_paid || quota.ai_available === 0)
                ? 'bg-white/30 text-white/50 cursor-not-allowed'
                : 'bg-white text-[#6b35ff] hover:bg-violet-50'
            }`}
          >
            {!quota ? t('overview.start_case') : !quota.is_paid ? t('overview.plan_free') : quota.ai_available === 0 ? t('limit_reached') : t('overview.start_case')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Minhas Turmas ────────────────────────────────────────────────────────

function ClassesTab({
  classes,
  availableCases,
  onStartCase,
  onOpenJoin,
  quota,
}: {
  classes: EnrolledClass[];
  availableCases: AvailableCase[];
  onStartCase: (ca: AvailableCase) => void;
  onOpenJoin: () => void;
  quota?: DailyQuota | null;
}) {
  const { t, i18n } = useTranslation('student');
  const palette = ['#844AF5', '#10b981', '#f59e0b', '#3b82f6', '#a855f7', '#ec4899'];
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <GraduationCap size={40} className="text-slate-300" />
        <p className="text-slate-400 text-sm text-center">{t('classes.empty')}</p>
        <button
          onClick={onOpenJoin}
          className="px-6 py-2.5 rounded-xl bg-[#6b35ff] text-white font-semibold text-sm hover:bg-[#5a2ad9] transition-all flex items-center gap-1.5"
        >
          <GraduationCap size={14} className="flex-shrink-0" /> {t('classes.join_full')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{t('classes.title')}</h2>
          <p className="text-slate-500 text-sm mt-0.5">{t('classes.count', { count: classes.length })}</p>
        </div>
        <button
          onClick={onOpenJoin}
          className="px-4 py-2 rounded-xl bg-[#6b35ff] text-white font-semibold text-sm hover:bg-[#5a2ad9] transition-all flex items-center gap-1.5"
        >
          <GraduationCap size={14} className="flex-shrink-0" /> {t('classes.join')}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {classes.map((c, i) => {
          const color = palette[i % palette.length];
          const isExpanded = expandedClassId === c.class_id;
          const classCases = availableCases.filter(ca => ca.class_names.includes(c.name));
          return (
            <div key={c.class_id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-all">
              <div className="h-1.5 w-full" style={{ background: color }} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: color + '20', color }}>
                    <GraduationCap size={18} />
                  </div>
                  <span className="text-[10px] font-bold tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-lg uppercase">
                    {c.code}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">{c.name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Calendar size={11} /> {t('classes.joined_at', { date: fmtDate(c.joined_at, i18n.language) })}
                </p>
                <button
                  onClick={() => setExpandedClassId(isExpanded ? null : c.class_id)}
                  className="mt-4 w-full text-center text-xs font-semibold py-2 rounded-xl text-white transition-all hover:opacity-90"
                  style={{ background: color }}
                >
                  {isExpanded ? t('classes.hide_cases') : (classCases.length > 0 ? t('classes.see_cases_count', { count: classCases.length }) : t('classes.see_cases'))}
                </button>
              </div>
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-slate-50">
                  {classCases.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center">{t('classes.no_cases')}</p>
                  ) : (
                    <div className="flex flex-col gap-2 pt-3">
                      {classCases.map(ca => (
                        <div
                          key={ca.id}
                          className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 border border-slate-100"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-xs text-slate-800 truncate">{ca.title}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {ca.specialty ?? '—'} · {ca.difficulty}
                            </p>
                            {fmtExpiry(ca.expires_at, t, i18n.language) && (
                              <p className="text-[11px] text-rose-500 mt-0.5 font-medium">{fmtExpiry(ca.expires_at, t, i18n.language)}</p>
                            )}
                          </div>
                          <button
                            onClick={() => { if (!quota || quota.regular_available > 0) onStartCase(ca); }}
                            disabled={!!(quota && quota.regular_available === 0)}
                            className="flex-shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ background: color }}
                          >
                            {quota && quota.regular_available === 0 ? t('classes.limit') : t('classes.start')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab: Histórico ────────────────────────────────────────────────────────────

function HistoryTab({ history }: { history: AttemptHistory[] }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('student');
  const sorted = [...history].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <History size={40} className="text-slate-300" />
        <p className="text-slate-400 text-sm">{t('history.empty')}</p>
        <button onClick={() => navigate('/student-chat')} className="text-sm text-indigo-500 hover:text-indigo-700 transition-colors">
          {t('history.start_chat')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800">{t('history.title')}</h2>
        <p className="text-slate-500 text-sm mt-0.5">{t('history.count', { count: sorted.length })}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map(a => {
          const isFreeChat = a.is_ai_chat === true;
          const destId = a.conversation_id ?? a.attempt_id;
          return (
            <div key={a.attempt_id}
              onClick={() => navigate(`/conversation/${destId}`)}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer group">
              <div className="h-1 w-full" style={{
                background: isFreeChat ? '#a78bfa'
                  : a.score == null ? '#cbd5e1'
                  : a.score >= 80 ? '#10b981'
                  : a.score >= 60 ? '#f59e0b' : '#ef4444'
              }} />
              <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  {isFreeChat ? (
                    <div className="min-w-[46px] h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 bg-violet-100 text-violet-600">
                      <MessageSquare size={18} />
                    </div>
                  ) : (
                    <div className={`min-w-[46px] h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${scoreColors(a.score)}`}>
                      <span className="text-lg font-extrabold leading-none">{a.score ?? '—'}</span>
                      <span className="text-[9px] opacity-60">{t('pts')}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-700 line-clamp-1 leading-tight group-hover:text-slate-900 transition-colors">
                      {a.case_title}
                    </p>
                    {!isFreeChat && (
                      <p className="text-xs font-semibold text-indigo-400">{t('initial_listen')}</p>
                    )}
                    {!isFreeChat && a.queixa_principal && (
                      <p className="text-xs text-slate-400 line-clamp-1">{a.queixa_principal}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {isFreeChat ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">{t('chat_ai')}</span>
                  ) : (
                    <>
                      {a.specialty && (
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full capitalize">{specialtyLabel(a.specialty)}</span>
                      )}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${diffColors(a.difficulty)}`}>
                        {diffLabel(a.difficulty, t)}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${a.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : a.status === 'abandoned' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                        {a.status === 'completed' ? t('status.completed') : a.status === 'abandoned' ? t('status.abandoned') : t('status.in_progress')}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1"><Calendar size={10} /> {fmtDate(a.started_at, i18n.language)}</span>
                  {!isFreeChat && (
                    <span className="flex items-center gap-1"><Clock size={10} /> {fmtDuration(a.duration_seconds ?? 0)}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab: Desempenho ───────────────────────────────────────────────────────────

function PerformanceTab({ profile }: { profile: StudentProfile }) {
  const { t } = useTranslation('student');
  const { stats, by_specialty, weekly_scores } = profile;
  const maxAttempts = by_specialty[0]?.attempts ?? 1;

  const cards = [
    { label: t('stats.cases_started'),   value: stats.total_attempts,   icon: <BookOpen size={16} />,    color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
    { label: t('stats.completed'),       value: stats.completed,        icon: <CheckCircle size={16} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: t('stats.avg_score'),       value: stats.average_score != null && stats.average_score > 0 ? `${stats.average_score.toFixed(1)}` : '—', icon: <Star size={16} />, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: t('stats.best_score'),      value: stats.best_score != null && stats.best_score > 0 ? `${stats.best_score}` : '—',  icon: <Trophy size={16} />, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: t('stats.avg_time'),        value: fmtDuration(stats.average_duration_seconds ?? 0), icon: <Clock size={16} />, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: t('stats.completion_rate'), value: stats.total_attempts > 0 ? `${Math.round((stats.completed / stats.total_attempts) * 100)}%` : '—', icon: <User size={16} />, color: 'text-teal-600', bg: 'bg-teal-50' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">{t('performance.title')}</h2>
        <p className="text-slate-500 text-sm mt-0.5">{t('performance.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${c.bg} ${c.color}`}>{c.icon}</div>
            <p className="text-2xl font-bold text-slate-800">{c.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
          <TrendingUp size={15} className="text-indigo-400" /> {t('overview.weekly_evolution')}
        </h3>
        <WeeklyChart weeks={weekly_scores} />
      </div>

      {by_specialty.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-5">
            <User size={15} className="text-indigo-400" /> {t('performance.by_specialty')}
          </h3>
          <div className="space-y-4">
            {by_specialty.map(sp => (
              <div key={sp.specialty}>
                <div className="flex justify-between text-xs text-slate-600 mb-1.5">
                  <span className="font-medium capitalize">{specialtyLabel(sp.specialty)}</span>
                  <span className="text-slate-400">
                    {t('performance.case_count', { count: sp.attempts })} ·{' '}
                    <span className="font-semibold text-slate-600">
                      {sp.average_score != null ? t('performance.pts_value', { score: sp.average_score.toFixed(0) }) : '—'}
                    </span>
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-400 rounded-full transition-all duration-700"
                    style={{ width: `${(sp.attempts / maxAttempts) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Conquistas ───────────────────────────────────────────────────────────

function AchievementsTab() {
  const { t } = useTranslation('student');
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#844AF5]/20 to-[#6b35ff]/20 flex items-center justify-center border border-[#844AF5]/20">
        <Trophy size={36} className="text-[#844AF5]" />
      </div>
      <div className="text-center">
        <p className="text-slate-800 font-bold text-lg">{t('achievements.title')}</p>
        <p className="text-slate-500 text-sm mt-1">{t('achievements.coming_soon_desc')}</p>
        <p className="text-slate-300 text-xs mt-2">{t('achievements.coming_soon_detail')}</p>
      </div>
      <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[#844AF5]/10 text-[#a78bfa] border border-[#844AF5]/20">
        {t('achievements.coming_soon')}
      </span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('student');
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const state = location.state as { tab?: TabId } | null;
    return state?.tab ?? 'overview';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [availableCases, setAvailableCases] = useState<AvailableCase[]>([]);
  const [quota, setQuota] = useState<DailyQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Entrar na turma ──────────────────────────────────────────────────────
  const [joinOpen, setJoinOpen]     = useState(false);
  const [joinCode, setJoinCode]     = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinMsg, setJoinMsg]       = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleJoinClass = async () => {
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    setJoinMsg(null);
    try {
      const result = await joinClass(joinCode.trim());
      setJoinMsg({ type: 'ok', text: t('join.success', { name: result.class_name }) });
      setJoinCode('');
      await loadProfile();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('join.error');
      setJoinMsg({ type: 'err', text: message });
    } finally {
      setJoinLoading(false);
    }
  };

  const openJoin = () => { setJoinOpen(true); setJoinMsg(null); };

  const handleStartClassCase = (ca: AvailableCase): void => {
    navigate('/student-chat', {
      state: {
        pendingCase: {
          id: ca.id,
          title: ca.title,
          specialty: ca.specialty,
          difficulty: ca.difficulty,
        },
      },
    });
  };

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileData, casesData] = await Promise.all([
        fetchMyProfile(),
        fetchAvailableCases().catch(() => [] as AvailableCase[]),
      ]);
      setProfile(profileData);
      setAvailableCases(casesData);
      fetchDailyQuota().then(setQuota).catch(() => {});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('load_error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const tabs: { id: TabId; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'overview',     label: t('tabs.overview'),     icon: <LayoutDashboard size={20} />, color: 'text-sky-400'     },
    { id: 'classes',      label: t('tabs.classes'),      icon: <GraduationCap size={20} />,  color: 'text-emerald-400' },
    { id: 'history',      label: t('tabs.history'),      icon: <History size={20} />,        color: 'text-amber-400'   },
    { id: 'performance',  label: t('tabs.performance'),  icon: <TrendingUp size={20} />,     color: 'text-violet-400'  },
    { id: 'achievements', label: t('tabs.achievements'), icon: <Trophy size={20} />,         color: 'text-rose-400'    },
    { id: 'flashcards',   label: t('tabs.flashcards'),   icon: <Layers size={20} />,         color: 'text-pink-400'    },
  ];

  const tabLabel: Record<TabId, string> = {
    overview: t('tabs.overview'), classes: t('tabs.classes'), history: t('tabs.history'),
    performance: t('tabs.performance'), achievements: t('tabs.achievements'), flashcards: t('tabs.flashcards'),
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">{t('loading')}</span>
          </div>
        </div>
      );
    }
    if (error || !profile) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <AlertCircle size={36} className="text-rose-400" />
            <p className="text-sm text-slate-500">{error ?? t('profile_not_found')}</p>
            <button onClick={loadProfile} className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors">
              {t('try_again')}
            </button>
          </div>
        </div>
      );
    }
    switch (activeTab) {
      case 'overview':     return <OverviewTab profile={profile} onNavigate={setActiveTab} onOpenJoin={openJoin} quota={quota} />;
      case 'classes':      return <ClassesTab classes={profile.classes} availableCases={availableCases} onStartCase={handleStartClassCase} onOpenJoin={openJoin} quota={quota} />;
      case 'history':      return <HistoryTab history={profile.history} />;
      case 'performance':  return <PerformanceTab profile={profile} />;
      case 'achievements': return <AchievementsTab />;
      case 'flashcards':   return <StudentFlashcardsView />;
    }
  };

  return (
    <div className="h-screen bg-[#f7f6fa]" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Aurora */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0" style={{
        background: [
          'radial-gradient(ellipse 65% 55% at 0% 0%, rgba(138,91,255,0.20) 0%, transparent 70%)',
          'radial-gradient(ellipse 55% 50% at 100% 0%, rgba(99,179,237,0.16) 0%, transparent 70%)',
          'radial-gradient(ellipse 45% 40% at 100% 100%, rgba(122,85,255,0.13) 0%, transparent 70%)',
        ].join(', '),
      }} />
      {/* Dot grid */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0" style={{
        backgroundImage: 'radial-gradient(circle, rgba(122,85,255,0.18) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />
      <div className="flex h-full overflow-hidden relative z-10">

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside className={`w-56 flex-shrink-0 flex flex-col border-r border-white/[.06] overflow-hidden fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ background: '#1a1730' }}>
        <div className="px-5 py-5 border-b border-white/[.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#844AF5] flex items-center justify-center flex-shrink-0">
              <Swords size={13} className="text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-bold leading-none tracking-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>Anamnes.IA</p>
              <p className="text-[#7c78a0] text-[10px] mt-0.5 font-medium tracking-wider uppercase">{t('role')}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
          {tabs.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-semibold transition-all text-left select-none whitespace-nowrap focus:outline-none focus-visible:outline-none ${
                  active
                    ? 'bg-gradient-to-r from-[#844AF5] to-[#6b35ff] text-white shadow-[0_4px_14px_rgba(132,74,245,.40)] border-[3px] border-white'
                    : 'text-[#a39dc4] hover:bg-white/[.06] hover:text-white border-[3px] border-transparent'
                }`}
              >
                <span className={active ? 'text-white' : tab.color}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="px-2 pt-3 pb-4 border-t border-white/[.06] flex flex-col gap-0.5">
          <button
            onClick={() => navigate('/mainpage')}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-semibold text-[#a39dc4] hover:bg-white/[.06] hover:text-white transition-all whitespace-nowrap focus:outline-none focus-visible:outline-none border-[3px] border-transparent"
          >
            <ChevronLeft size={20} /> {t('back_to_menu')}
          </button>
          <div className="mt-2 flex items-center gap-3 px-4 py-2.5">
            <div className="w-9 h-9 rounded-full bg-[#844AF5] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {getInitials(user?.name, user?.email)}
            </div>
            <div className="min-w-0">
              <p className="text-[#e2dff5] text-sm font-semibold truncate">{user?.name ?? t('role')}</p>
              <p className="text-[#7c78a0] text-xs truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex-shrink-0 flex items-center justify-between px-4 md:px-7 py-3.5">
          <div className="flex items-center gap-1.5 text-sm">
            <button className="md:hidden mr-2 p-1 text-[#9893b0] hover:text-[#111018] focus:outline-none" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <span className="text-[#9893b0] font-medium">{t('role')}</span>
            <span className="text-[#d4cfe8]">/</span>
            <span className="text-[#111018] font-semibold">{tabLabel[activeTab]}</span>
          </div>
          <button
            onClick={() => { if (!quota || (quota.is_paid && quota.ai_available > 0)) navigate('/student-chat'); }}
            disabled={!!(quota && (!quota.is_paid || quota.ai_available === 0))}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-white text-xs font-semibold rounded-xl transition-all ${
              quota && (!quota.is_paid || quota.ai_available === 0)
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-[#6b35ff] hover:bg-[#5a2ad9]'
            }`}
          >
            <Swords size={13} /> {quota && (!quota.is_paid || quota.ai_available === 0) ? t('limit_reached') : t('train_now')}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 md:px-7 py-4 md:py-6">
          {renderContent()}
        </div>
      </main>

      {/* Modal Entrar na Turma */}
      {joinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setJoinOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">{t('join.title')}</h3>
              <button onClick={() => setJoinOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
            </div>
            <p className="text-sm text-slate-500 mb-4">{t('join.desc')}</p>
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder={t('join.placeholder')}
              maxLength={10}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-center text-lg font-mono font-bold tracking-widest text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#7a55ff]"
              onKeyDown={e => e.key === 'Enter' && handleJoinClass()}
              disabled={joinLoading}
              autoFocus
            />
            {joinMsg && (
              <p className={`text-sm mt-3 text-center font-medium ${joinMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                {joinMsg.text}
              </p>
            )}
            <button
              onClick={handleJoinClass}
              disabled={joinLoading || !joinCode.trim()}
              className="w-full mt-4 py-2.5 rounded-xl bg-[#6b35ff] text-white font-semibold text-sm hover:bg-[#5a2ad9] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {joinLoading ? t('join.joining') : t('join.submit')}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default StudentDashboard;
