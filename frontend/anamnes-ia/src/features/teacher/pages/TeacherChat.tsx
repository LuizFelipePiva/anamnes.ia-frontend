// src/pages/TeacherChat.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  LayoutDashboard, Users, GraduationCap, FileText, BookOpen, Layers,
  ChevronLeft, ChevronDown, ChevronRight, Download, Plus, X, Menu,
  Search, TrendingUp, Star, CheckCircle, Clock, Trophy, MessageSquare,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/features/auth';

// Importações dos módulos — API real
import type {
  ClassInfo, CaseInfo, ViewType, DashboardStats, StudentStats, StudentHistoryItem, WeeklyStats,
  CaseAttemptItem, ConversationMessage, CaseAssignmentDetail,
} from '@/features/teacher/types/teacher';
import {
  fetchClasses, updateClass, deleteClass as deleteClassApi, fetchClassDetail, removeStudent,
  fetchCases, updateCase, deleteCase as deleteCaseApi, assignCase, fetchCaseAssignments,
  updateCaseAssignment, deleteCaseAssignment,
  fetchDashboardStats, fetchStudentsStats, fetchDashboardWeekly,
  fetchCaseAttempts, fetchAttemptMessages,
} from '@/features/teacher/services/teacherService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TooltipContentProps, MouseHandlerDataParam, TooltipValueType } from 'recharts';
import { SimpleToast } from '@/shared/components';
import CaseForm from '@/features/teacher/components/CaseForm';
import CreateClassModal from '@/features/teacher/components/CreateClassModal';
import ClassSharingPanel from '@/features/teacher/components/ClassSharingPanel';
import FlashcardsView from '@/features/teacher/components/FlashcardsView';
import { fetchStudentProfile } from '@/features/profile/services/profileService';
import type { StudentProfile, WeeklyScore } from '@/features/profile/types/profile';
import { specialtyLabel } from '@/shared/utils/specialties';

function formatExpiryLabel(t: TFunction<'teacher'>, locale: string, expiresAt?: string | null): string | null {
  if (!expiresAt) return null;
  const expiresMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresMs)) return null;
  const diffMs = expiresMs - Date.now();
  if (diffMs <= 0) return t('expiry.today');
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return t('expiry.hours', { count: diffHours });
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return t('expiry.days', { count: 1 });
  if (diffDays <= 7) return t('expiry.days', { count: diffDays });
  return t('expiry.date', { date: new Date(expiresAt).toLocaleDateString(locale) });
}


// ─── Tooltip renderers ──────────────────────────────────────────────────────
type TooltipProps = TooltipContentProps<TooltipValueType, number | string> & { ptsLabel: string };

function MiniTooltipContent({ active, payload, label, ptsLabel }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e293b', borderRadius: 6, padding: '3px 8px' }}>
      <span style={{ color: '#a5b4fc', fontSize: 10 }}>{label} </span>
      <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{payload[0].value} {ptsLabel}</span>
    </div>
  );
}

function WeeklyTooltipContent({ active, payload, label, ptsLabel }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e293b', borderRadius: 8, padding: '4px 10px' }}>
      <span style={{ color: '#a5b4fc', fontSize: 10 }}>{label} </span>
      <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{payload[0].value} {ptsLabel}</span>
    </div>
  );
}

// ─── Modal weekly chart (Recharts) ─────────────────────────────────────────
function ModalWeeklyChart({ weeks }: { weeks: WeeklyScore[] }) {
  const { t } = useTranslation('teacher');
  const ptsLabel = t('chat.student_modal.pts');
  if (weeks.length === 0) {
    return <div className="flex items-center justify-center h-20 text-[#9893b0] text-xs">{t('chat.no_data')}</div>;
  }
  const data = weeks.map(w => ({
    name: w.week.replace(/^\d{4}-W/, 'S'),
    score: w.avg_score ?? 0,
  }));
  return (
    <ResponsiveContainer width="100%" height={110}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="modalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#844AF5" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#844AF5" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0edf8" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#9893b0' }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 8, fill: '#9893b0' }} axisLine={false} tickLine={false} tickCount={4} />
        <Tooltip
          content={(p) => <MiniTooltipContent {...p} ptsLabel={ptsLabel} />}
          cursor={{ stroke: '#844AF5', strokeWidth: 1, strokeDasharray: '3 3' }}
        />
        <Area type="monotone" dataKey="score" stroke="#844AF5" strokeWidth={2} fill="url(#modalGrad)"
          dot={{ fill: '#fff', stroke: '#844AF5', strokeWidth: 1.5, r: 3 }}
          activeDot={{ fill: '#fff', stroke: '#844AF5', strokeWidth: 2, r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Weekly Area Chart (com hover interno, sem causar re-render externo) ─────
function WeeklyAreaChart({ weeklyStats }: { weeklyStats: { week: string; avg_score: number }[] }) {
  const { t } = useTranslation('teacher');
  const ptsLabel = t('chat.student_modal.pts');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const weekLabel = (w: string) => w.replace(/\d{4}-W(\d+)/, (_, n) => t('charts.week_short', { n }));
  const data = weeklyStats.length > 0
    ? weeklyStats.map(w => ({ name: weekLabel(w.week), score: w.avg_score }))
    : [{ name: t('charts.week_short', { n: 1 }), score: 0 }, { name: t('charts.week_short', { n: 2 }), score: 0 }];
  const currentAvg = hoveredIndex !== null ? data[hoveredIndex]?.score : data[data.length - 1]?.score;
  return (
    <div className="px-5 py-4">
      <div className="mb-2">
        <div className="text-[10px] text-[#9893b0] font-bold uppercase tracking-wider">{t('charts.current_avg')}</div>
        <div className="text-3xl font-black text-[#111018]">
          {currentAvg != null && currentAvg > 0 ? currentAvg.toFixed(1) : '--'}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 12, left: -24, bottom: 0 }}
          onMouseMove={(e: MouseHandlerDataParam) => { if (e.activeTooltipIndex != null) setHoveredIndex(e.activeTooltipIndex as number); }}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id="rcGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#844AF5" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#844AF5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9893b0', fontWeight: 700 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9893b0', fontWeight: 700 }} axisLine={false} tickLine={false} tickCount={5} />
          <Tooltip
            content={(p) => <WeeklyTooltipContent {...p} ptsLabel={ptsLabel} />}
            cursor={{ stroke: '#844AF5', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#844AF5"
            strokeWidth={2.5}
            fill="url(#rcGrad)"
            dot={{ fill: '#fff', stroke: '#844AF5', strokeWidth: 2, r: 4 }}
            activeDot={{ fill: '#fff', stroke: '#844AF5', strokeWidth: 3, r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── StudentDetailModal ───────────────────────────────────────────────────────
const StudentDetailModal: React.FC<{
  open: boolean;
  loading: boolean;
  error: string | null;
  profile: StudentProfile | null;
  onClose: () => void;
}> = ({ open, loading, error, profile, onClose }) => {
  const { t, i18n } = useTranslation('teacher');
  const locale = i18n.language;
  if (!open) return null;
  const font = { fontFamily: "'Inter', -apple-system, sans-serif" };

  const getTag = (stats: StudentProfile['stats']) => {
    const avg = stats.average_score ?? 0;
    if (stats.total_attempts === 0) return { label: t('chat.student_modal.tag_new'),       bg: 'bg-slate-100 text-slate-600' };
    if (avg >= 8)                   return { label: t('chat.student_modal.tag_highlight'), bg: 'bg-emerald-100 text-emerald-700' };
    if (avg >= 5)                   return { label: t('chat.student_modal.tag_regular'),   bg: 'bg-amber-100 text-amber-700' };
    return { label: t('chat.student_modal.tag_attention'), bg: 'bg-rose-100 text-rose-700' };
  };

  const fmtDurt = (s: number) => { if (!s) return '—'; const m = Math.floor(s / 60); return m > 0 ? `${m}m ${s % 60}s` : `${s}s`; };
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  const scoreClrs = (score: number | null) => {
    if (score === null) return 'bg-slate-100 text-slate-500';
    if (score >= 80) return 'bg-emerald-100 text-emerald-700';
    if (score >= 60) return 'bg-amber-100 text-amber-700';
    return 'bg-rose-100 text-rose-700';
  };
  const diffClrs = (d: string | null) => {
    if (!d) return 'bg-slate-100 text-slate-500';
    const k = d.toLowerCase();
    if (k === 'básico' || k === 'easy') return 'bg-emerald-100 text-emerald-700';
    if (k === 'avançado' || k === 'hard') return 'bg-rose-100 text-rose-700';
    return 'bg-amber-100 text-amber-700';
  };
  const diffLbl = (d: string | null) => {
    const m: Record<string, string> = {
      'Básico': t('difficulty.basico'), 'Intermediário': t('difficulty.medio'), 'Avançado': t('difficulty.avancado'),
      easy: t('difficulty.basico'), medium: t('difficulty.medio'), hard: t('difficulty.avancado'),
    };
    return d ? (m[d] ?? d) : '—';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,9,20,.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto flex flex-col"
        style={{ ...font, animation: 'modalIn .18s ease' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#f0edf8] px-7 py-5 flex items-center gap-4">
          {profile && (() => {
            const tag = getTag(profile.stats);
            const initials = profile.user.name
              ? profile.user.name.split(' ').slice(0,2).map(w => w[0]?.toUpperCase() ?? '').join('')
              : profile.user.email?.[0]?.toUpperCase() ?? '?';
            return (
              <>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#6b35ff] flex items-center justify-center flex-shrink-0 text-white font-bold text-xl">{initials}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <p className="font-bold text-[#111018] text-xl truncate">{profile.user.name}</p>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${tag.bg}`}>{tag.label}</span>
                  </div>
                  <p className="text-sm text-[#9893b0] truncate mt-0.5">{profile.user.email}{profile.user.institution ? ` · ${profile.user.institution}` : ''}</p>
                </div>
              </>
            );
          })()}
          {!profile && !loading && <p className="font-bold text-[#111018] text-lg">{t('chat.student_modal.title')}</p>}
          {loading && <p className="text-sm text-[#9893b0]">{t('chat.student_modal.loading')}</p>}
          <button onClick={onClose} className="ml-auto w-9 h-9 rounded-xl bg-[#f5f3fb] flex items-center justify-center text-[#9893b0] hover:text-[#111018] hover:bg-[#ede8f9] transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-7">
          {loading && (
            <div className="flex justify-center py-20">
              <div className="w-7 h-7 border-2 border-[#844AF5] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {error && (
            <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">{error}</div>
          )}
          {profile && !loading && (() => {
            const { stats, by_specialty, weekly_scores, history, classes: pCls } = profile;
            const rate = stats.total_attempts > 0 ? Math.round((stats.completed / stats.total_attempts) * 100) : 0;
            const maxSp = by_specialty[0]?.attempts ?? 1;
            const recent = history.filter(a => !a.is_ai_chat).slice(0, 8);
            const statCards = [
              { label: t('chat.student_modal.stat_cases_started'), value: stats.total_attempts, icon: <BookOpen size={16} />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: t('chat.student_modal.stat_completed'),      value: stats.completed,      icon: <CheckCircle size={16} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: t('chat.student_modal.stat_avg_score'),      value: stats.average_score != null && stats.average_score > 0 ? stats.average_score.toFixed(1) : '—', icon: <Star size={16} />, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: t('chat.student_modal.stat_best_score'),     value: stats.best_score != null && stats.best_score > 0 ? String(stats.best_score) : '—', icon: <Trophy size={16} />, color: 'text-violet-600', bg: 'bg-violet-50' },
              { label: t('chat.student_modal.stat_avg_time'),     value: fmtDurt(stats.average_duration_seconds ?? 0), icon: <Clock size={16} />, color: 'text-sky-600', bg: 'bg-sky-50' },
              { label: t('chat.student_modal.stat_completion_rate'),  value: `${rate}%`, icon: <TrendingUp size={16} />, color: 'text-teal-600', bg: 'bg-teal-50' },
            ];
            return (
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {statCards.map(c => (
                    <div key={c.label} className="bg-[#faf9fe] rounded-xl p-4 border border-[#f0edf8]">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${c.bg} ${c.color}`}>{c.icon}</div>
                      <p className="text-xl font-bold text-[#111018] leading-none">{c.value}</p>
                      <p className="text-xs text-[#9893b0] mt-1">{c.label}</p>
                    </div>
                  ))}
                </div>

                {/* Conclusões */}
                <div className="bg-[#faf9fe] rounded-xl p-5 border border-[#f0edf8]">
                  <div className="flex justify-between text-sm text-[#6b6880] mb-2.5">
                    <span className="font-medium">{t('chat.student_modal.completed_soap')} <span className="text-[#9893b0] font-normal">{t('chat.student_modal.completed_soap_detail', { completed: stats.completed, total: stats.total_attempts })}</span></span>
                    <span className="font-bold text-[#844AF5]">{rate}%</span>
                  </div>
                  <div className="w-full h-3 bg-[#ede8f9] rounded-full overflow-hidden">
                    <div className="h-full bg-[#844AF5] rounded-full transition-all duration-700" style={{ width: `${rate}%` }} />
                  </div>
                </div>

                {/* Turmas */}
                {pCls.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[#6b6880] uppercase tracking-widest mb-2.5">{t('chat.student_modal.enrolled_classes')}</p>
                    <div className="flex flex-wrap gap-2">
                      {pCls.map(c => (
                        <span key={c.class_id} className="text-xs bg-[#f3f1ff] text-[#844AF5] font-semibold px-3 py-1.5 rounded-full border border-[#e8e3fc]">{c.name}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evolução semanal */}
                <div className="bg-white rounded-xl border border-[#eeedf2] p-5">
                  <p className="text-sm font-semibold text-[#374151] flex items-center gap-1.5 mb-3">
                    <TrendingUp size={14} className="text-[#844AF5]" /> {t('chat.student_modal.weekly_evolution')}
                  </p>
                  <ModalWeeklyChart weeks={weekly_scores} />
                </div>

                {/* Por especialidade */}
                {by_specialty.length > 0 && (
                  <div className="bg-white rounded-xl border border-[#eeedf2] p-5">
                    <p className="text-sm font-semibold text-[#374151] mb-4">{t('chat.student_modal.by_specialty')}</p>
                    <div className="space-y-4">
                      {by_specialty.map(sp => (
                        <div key={sp.specialty}>
                          <div className="flex justify-between text-sm text-[#374151] mb-1.5">
                            <span className="font-medium capitalize">{specialtyLabel(sp.specialty)}</span>
                            <span className="text-[#9893b0]">
                              {t('chat.student_modal.case_count', { count: sp.attempts })} · <span className="font-semibold text-[#374151]">{sp.average_score != null ? t('chat.student_modal.pts_value', { score: sp.average_score.toFixed(0) }) : '—'}</span>
                            </span>
                          </div>
                          <div className="h-2.5 bg-[#f0edf8] rounded-full overflow-hidden">
                            <div className="h-full bg-[#844AF5] rounded-full transition-all duration-700" style={{ width: `${(sp.attempts / maxSp) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Histórico recente */}
                {recent.length > 0 && (
                  <div className="bg-white rounded-xl border border-[#eeedf2] overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#f0edf8]">
                      <p className="text-sm font-semibold text-[#374151]">{t('chat.student_modal.recent_history')}</p>
                    </div>
                    <div className="divide-y divide-[#f7f5fc]">
                      {recent.map(a => (
                        <div key={a.attempt_id} className="flex items-center gap-4 px-5 py-3.5">
                          <div className={`min-w-[46px] h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${scoreClrs(a.score)}`}>
                            <span className="text-base font-extrabold leading-none">{a.score ?? '—'}</span>
                            <span className="text-[10px] opacity-60">{t('chat.student_modal.pts')}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[#374151] truncate">{a.case_title}</p>
                            <p className="text-xs text-[#9893b0] mt-0.5">{fmtDate(a.started_at)}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {a.specialty && <span className="text-xs text-[#9893b0] bg-[#f7f5fc] px-2 py-0.5 rounded-full capitalize">{specialtyLabel(a.specialty)}</span>}
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${diffClrs(a.difficulty)}`}>{diffLbl(a.difficulty)}</span>
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                              a.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                              a.status === 'abandoned' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {a.status === 'completed' ? t('status.completed') : a.status === 'abandoned' ? t('status.abandoned') : t('status.in_progress')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

const TeacherChatPage: React.FC = () => {
  const { t, i18n } = useTranslation('teacher');
  const locale = i18n.language;
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // --- Estados de View e Dados ---
  const [activeView, setActiveView] = useState<ViewType>(() => {
    const state = location.state as { view?: ViewType } | null;
    return state?.view ?? 'reports';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<StudentStats[]>([]);
  const [cases, setCases] = useState<CaseInfo[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Seleções para Sidepanel
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [, setSelectedStudentId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // Estado para interação com o gráfico removido — agora interno ao WeeklyAreaChart

  // Modais e Toasts
  const [isCaseFormOpen, setIsCaseFormOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<CaseInfo | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyData] = useState<StudentHistoryItem[]>([]);
  const [historyLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; visible: boolean }>({ msg: '', visible: false });

  // ── Criação de Turma ──
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);

  // ── Atribuir caso a turma (várias turmas, prazo por turma) ──
  const [caseAssignClassId, setCaseAssignClassId] = useState<string>('');
  const [caseAssignDueDate, setCaseAssignDueDate] = useState<string>('');
  const [caseAssigning, setCaseAssigning] = useState(false);
  const [caseAssignmentsDetail, setCaseAssignmentsDetail] = useState<Record<string, CaseAssignmentDetail[]>>({});

  // ── Detalhes de turma (com alunos) ──
  const [classStudents, setClassStudents] = useState<Array<{ id: string; name: string; email: string; joined_at: string }>>([]);

  // ── Mapa turmaId → alunos (para a aba Estudantes) ──
  const [classStudentsMap, setClassStudentsMap] = useState<Record<string, Array<{id: string; name: string; email: string; joined_at: string}>>>({});
  const [editingClassName, setEditingClassName] = useState('');
  const [editingClassTerm, setEditingClassTerm] = useState('');
  const [isEditingClass, setIsEditingClass] = useState(false);

  // ── Modal detalhe do aluno ──
  const [studentDetail, setStudentDetail] = useState<{
    open: boolean; studentId: string | null; profile: StudentProfile | null; loading: boolean; error: string | null;
  }>({ open: false, studentId: null, profile: null, loading: false, error: null });
  const [studentSearch, setStudentSearch] = useState('');
  const [collapsedClasses, setCollapsedClasses] = useState<Set<string>>(new Set());

  // ── Modal tentativas do caso ──
  const [caseAttemptsModal, setCaseAttemptsModal] = useState<{
    open: boolean; caseId: string | null; caseTitle: string; attempts: CaseAttemptItem[]; loading: boolean;
  }>({ open: false, caseId: null, caseTitle: '', attempts: [], loading: false });
  const [convModal, setConvModal] = useState<{
    open: boolean; attemptId: string | null; studentName: string; messages: ConversationMessage[]; loading: boolean;
    score: number | null; feedback: string | null;
  }>({ open: false, attemptId: null, studentName: '', messages: [], loading: false, score: null, feedback: null });

  const handleOpenCaseAttempts = async (caseId: string, caseTitle: string) => {
    setCaseAttemptsModal({ open: true, caseId, caseTitle, attempts: [], loading: true });
    try {
      const data = await fetchCaseAttempts(caseId);
      setCaseAttemptsModal(prev => ({ ...prev, attempts: data, loading: false }));
    } catch {
      setCaseAttemptsModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleOpenConvModal = async (attempt: CaseAttemptItem) => {
    if (!caseAttemptsModal.caseId) return;
    const studentName = attempt.users?.name ?? t('chat.attempts_modal.student_fallback');
    setConvModal({ open: true, attemptId: attempt.id, studentName, messages: [], loading: true, score: attempt.score, feedback: attempt.feedback });
    try {
      const msgs = await fetchAttemptMessages(caseAttemptsModal.caseId, attempt.id);
      setConvModal(prev => ({ ...prev, messages: msgs, loading: false }));
    } catch {
      setConvModal(prev => ({ ...prev, loading: false }));
    }
  };

  // --- Effects ---
  const showToast = useCallback((msg: string) => {
    setToast({ msg, visible: true });
  }, []);

  const reloadCaseAssignments = useCallback(async (caseId: string) => {
    try {
      const data = await fetchCaseAssignments(caseId);
      setCaseAssignmentsDetail(prev => ({ ...prev, [caseId]: data }));
    } catch {
      showToast(t('chat.toasts.load_assignments_error'));
    }
  }, [showToast, t]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [classesRes, casesRes, statsRes, studentsRes, weeklyRes] = await Promise.all([
        fetchClasses(),
        fetchCases(),
        fetchDashboardStats(),
        fetchStudentsStats(),
        fetchDashboardWeekly(),
      ]);
      setClasses(classesRes);
      setCases(casesRes);
      setStats(statsRes);
      setStudents(studentsRes);
      setWeeklyStats(weeklyRes);
      setSelectedClassId(prev => prev ?? (classesRes.length > 0 ? classesRes[0].id : null));
      setSelectedStudentId(prev => prev ?? (studentsRes.length > 0 ? studentsRes[0].student_id : null));
      setSelectedCaseId(prev => prev ?? (casesRes.length > 0 ? casesRes[0].id : null));

      // Carrega alunos de cada turma em paralelo para a aba Estudantes
      const classDetails = await Promise.all(
        classesRes.map(c => fetchClassDetail(c.id).catch(() => null))
      );
      const map: Record<string, Array<{id: string; name: string; email: string; joined_at: string}>> = {};
      classDetails.forEach((detail, i) => {
        if (detail) map[classesRes[i].id] = detail.students || [];
      });
      setClassStudentsMap(map);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      showToast(t('chat.toasts.load_data_error'));
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!selectedCaseId) return;
    void reloadCaseAssignments(selectedCaseId);
  }, [selectedCaseId, reloadCaseAssignments]);

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // --- Helpers ---
  const openStudentDetail = useCallback(async (studentId: string) => {
    setStudentDetail({ open: true, studentId, profile: null, loading: true, error: null });
    try {
      const profile = await fetchStudentProfile(studentId);
      setStudentDetail(prev => ({ ...prev, profile, loading: false }));
    } catch {
      setStudentDetail(prev => ({ ...prev, loading: false, error: t('chat.student_modal.load_error') }));
    }
  }, [t]);

  const handleExport = () => {
    const header = t('chat.export.header');
    const rows = students.map(s => [
      `"${s.name ?? ''}"`,
      `"${s.email ?? ''}"`,
      s.attempts,
      s.completed,
      s.average_score.toFixed(1),
      s.last_activity ? new Date(s.last_activity).toLocaleDateString(locale) : '-',
    ].join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${t('chat.export.filename_prefix')}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t('chat.toasts.csv_exported'));
  };

  const handleUpdateClass = async (classId: string, field: string, value: unknown) => {
    try {
      const updated = await updateClass(classId, { [field]: value });
      setClasses(prev => prev.map(c => c.id === classId ? { ...c, ...updated } : c));
      showToast(t('chat.toasts.class_updated'));
    } catch {
      showToast(t('chat.toasts.class_update_error'));
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm(t('chat.confirm.delete_class'))) return;
    try {
      await deleteClassApi(classId);
      setClasses(prev => prev.filter(c => c.id !== classId));
      setSelectedClassId(null);
      setClassStudents([]);
      showToast(t('chat.toasts.class_deleted'));
    } catch {
      showToast(t('chat.toasts.class_delete_error'));
    }
  };

  const handleLoadClassStudents = async (classId: string) => {
    try {
      const detail = await fetchClassDetail(classId);
      setClassStudents(detail.students || []);
    } catch {
      setClassStudents([]);
    }
  };

  const handleRemoveStudent = async (classId: string, studentId: string) => {
    if (!confirm(t('chat.confirm.remove_student'))) return;
    try {
      await removeStudent(classId, studentId);
      setClassStudents(prev => prev.filter(s => s.id !== studentId));
      showToast(t('chat.toasts.student_removed'));
    } catch {
      showToast(t('chat.toasts.student_remove_error'));
    }
  };

  const handleSelectClass = (classId: string) => {
    setSelectedClassId(classId);
    setIsEditingClass(false);
    setClassStudents([]);
    handleLoadClassStudents(classId);
  };

  const handleStartEditClass = (cls: ClassInfo) => {
    setEditingClassName(cls.name);
    setEditingClassTerm(cls.term ?? '');
    setIsEditingClass(true);
  };

  const handleSaveEditClass = async (classId: string) => {
    try {
      const updated = await updateClass(classId, {
        name: editingClassName.trim() || undefined,
        term: editingClassTerm.trim() || undefined,
      });
      setClasses(prev => prev.map(c => c.id === classId ? { ...c, ...updated } : c));
      setIsEditingClass(false);
      showToast(t('chat.toasts.class_updated'));
    } catch {
      showToast(t('chat.toasts.class_update_error'));
    }
  };

  const handleUpdateCase = async (caseId: string, field: string, value: unknown) => {
    try {
      const updated = await updateCase(caseId, { [field]: value });
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, ...updated } : c));
      showToast(t('chat.toasts.case_updated'));
    } catch {
      showToast(t('chat.toasts.case_update_error'));
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    if (!confirm(t('chat.confirm.delete_case'))) return;
    try {
      await deleteCaseApi(caseId);
      setCases(prev => prev.filter(c => c.id !== caseId));
      setSelectedCaseId(null);
      showToast(t('chat.toasts.case_deleted'));
    } catch {
      showToast(t('chat.toasts.case_delete_error'));
    }
  };

  const handleCaseCreated = () => {
    setIsCaseFormOpen(false);
    setEditingCase(null);
    loadData();
    showToast(t('chat.toasts.case_saved'));
  };

  const handleOpenEditCase = (cas: CaseInfo) => {
    setEditingCase(cas);
    setIsCaseFormOpen(true);
  };

  const handleAssignCaseToClass = async (caseId: string) => {
    if (!caseAssignClassId) { showToast(t('chat.toasts.select_class_first')); return; }
    setCaseAssigning(true);
    try {
      await assignCase(caseId, caseAssignClassId, caseAssignDueDate.trim() || undefined);
      await reloadCaseAssignments(caseId);
      showToast(t('chat.toasts.case_assigned'));
      setCaseAssignClassId('');
      setCaseAssignDueDate('');
    } catch (e: unknown) {
      showToast((e instanceof Error ? e.message : null) || t('chat.toasts.case_assign_error'));
    } finally {
      setCaseAssigning(false);
    }
  };

  const handleToggleFreeCase = async (cas: CaseInfo) => {
    const isFree = cas.published === true;
    try {
      const updated = await updateCase(cas.id, { published: !isFree });
      setCases(prev => prev.map(c => c.id === cas.id ? { ...c, ...updated } : c));
      showToast(isFree ? t('chat.toasts.case_free_removed') : t('chat.toasts.case_free_published'));
    } catch (e: unknown) {
      showToast((e instanceof Error ? e.message : null) || t('chat.toasts.case_change_error'));
    }
  };


  const RenderFreeCases = () => {
    const freeCasesList = cases.filter(c => c.published === true);
    const draftList = cases.filter(c => !c.published);
    return (
      <div className="flex flex-col gap-4">
        {/* Info */}
        <div className="bg-white rounded-2xl border border-[#e9e7f6] shadow-[0_10px_22px_rgba(19,12,45,.10)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0edf8]">
            <span className="text-[11px] font-semibold text-[#6b6880] uppercase tracking-widest">{t('chat.content.public_ready_cases')}</span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#f0edf8] text-[#6b6880]">{t('chat.content.published_count', { count: freeCasesList.length })}</span>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-[#6b6880] mb-3 leading-relaxed">
              {t('chat.content.info')}
            </p>
            <button
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#6b35ff] text-white text-sm font-semibold hover:bg-[#5a2ad9] transition-all"
              onClick={() => setIsCaseFormOpen(true)}
            >
              <Plus size={13} /> {t('chat.content.new_free_case')}
            </button>
          </div>
        </div>

        {freeCasesList.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#e9e7f6] shadow-[0_10px_22px_rgba(19,12,45,.10)] overflow-hidden">
            <div className="flex items-center px-5 py-4 border-b border-[#f0edf8]">
              <span className="text-[11px] font-semibold text-[#6b6880] uppercase tracking-widest">{t('chat.content.published_as_free')}</span>
            </div>
            <div className="px-5 py-4 flex flex-col gap-2">
              {freeCasesList.map(c => (
                <div key={c.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#ecfdf5] border border-[rgba(34,197,94,0.2)]">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[13px] truncate text-[#111018]">{c.title}</div>
                    <div className="text-[11px] text-[#6b6880] mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>{c.specialty ?? '—'} &bull; {c.difficulty}</span>
                      {formatExpiryLabel(t, locale, c.available_until) && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                          {formatExpiryLabel(t, locale, c.available_until)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-red-50 text-red-600 border border-red-100 text-[11px] font-semibold hover:bg-red-100 transition-all"
                    onClick={() => handleToggleFreeCase(c)}
                  >
                    {t('actions.remove')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {draftList.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#e9e7f6] shadow-[0_10px_22px_rgba(19,12,45,.10)] overflow-hidden">
            <div className="flex items-center px-5 py-4 border-b border-[#f0edf8]">
              <span className="text-[11px] font-semibold text-[#6b6880] uppercase tracking-widest">{t('chat.content.other_cases')}</span>
            </div>
            <div className="px-5 py-4 flex flex-col gap-2">
              {draftList.map(c => (
                <div key={c.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#f3f1ff]">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[13px] truncate text-[#111018]">{c.title}</div>
                    <div className="text-[11px] text-[#6b6880] mt-0.5 flex items-center gap-1.5 flex-wrap">
                      {c.specialty ?? '—'} &bull; {c.difficulty} &bull;{' '}
                      <span className={c.published ? 'text-[#059669]' : 'text-[#6b6880]'}>{c.published ? t('chat.content.published') : t('chat.content.draft')}</span>
                      {formatExpiryLabel(t, locale, c.available_until) && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                          {formatExpiryLabel(t, locale, c.available_until)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-[#6b35ff] text-white text-[11px] font-semibold hover:bg-[#5a2ad9] transition-all"
                    onClick={() => handleToggleFreeCase(c)}
                  >
                    {t('chat.content.make_free')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {cases.length === 0 && (
          <div className="text-sm text-[#6b6880] text-center py-10">{t('chat.content.empty')}</div>
        )}
      </div>
    );
  };

  // --- Helpers ---
  const getSelectedClass   = () => classes.find(c => c.id === selectedClassId);
  const getSelectedCase    = () => cases.find(c => c.id === selectedCaseId);

  // --- Shared Tailwind tokens ---
  const twCard    = 'bg-white rounded-2xl border border-[#e9e7f6] shadow-[0_10px_22px_rgba(19,12,45,.10)] overflow-hidden';
  const twCardHd  = 'flex items-center justify-between px-5 py-4 border-b border-[#f0edf8]';
  const twCardT   = 'text-[11px] font-semibold text-[#6b6880] uppercase tracking-widest';
  const twCardBd  = 'px-5 py-4';
  const twBtnPri  = 'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#6b35ff] text-white text-sm font-semibold hover:bg-[#5a2ad9] transition-all disabled:opacity-50';
  const twBtnGho  = 'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-[#e9e7f6] bg-white text-sm font-semibold text-[#374151] hover:border-[#c4bfea] transition-all';
  const twBtnDgr  = 'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-red-600 border border-red-100 text-sm font-semibold hover:bg-red-100 transition-all';
  const twInput   = 'w-full px-3.5 py-2.5 rounded-xl border border-[#e5e2ef] bg-white text-sm text-[#111018] focus:outline-none focus:ring-2 focus:ring-[#7a55ff]/20 focus:border-[#7a55ff] transition-all';
  const twFLabel  = 'text-[11px] font-bold text-[#6b6880] uppercase tracking-widest mb-1 block';
  const twSVal    = 'text-sm font-semibold text-[#111018]';
  const twMuted   = 'text-sm text-[#6b6880]';
  const twPillOk  = 'inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#ecfdf5] text-[#059669]';
  const twPillWrn = 'inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#fffbeb] text-[#92400e]';
  const twPillSft = 'inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#f0edf8] text-[#6b6880]';
  const twBadge   = 'inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-[#f0edf8] text-[#6b6880]';
  const twBadgeOk = 'inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-[#ecfdf5] text-[#059669]';
  const twBadgePu = 'inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-[#f3f1ff] text-[#7a55ff]';

  // Rótulo traduzido da dificuldade (o valor armazenado permanece em pt-BR — é conteúdo do banco)
  const diffLabel = (d: string): string => (({
    'Básico': t('difficulty.basico'), 'Intermediário': t('difficulty.intermediario'), 'Avançado': t('difficulty.avancado'),
  } as Record<string, string>)[d] ?? d);

  // Difficulty color maps for case cards
  const diffBar:  Record<string, string> = { 'Básico': 'bg-emerald-400', 'Intermediário': 'bg-amber-400', 'Avançado': 'bg-rose-500' };
  const diffBg:   Record<string, string> = { 'Básico': 'bg-emerald-100', 'Intermediário': 'bg-amber-100', 'Avançado': 'bg-rose-100'  };
  const diffText: Record<string, string> = { 'Básico': 'text-emerald-700', 'Intermediário': 'text-amber-700', 'Avançado': 'text-rose-700' };

  // ─── RenderReports ────────────────────────────────────────────────────────
  const RenderReports = () => {

    const completionPct    = Math.round(stats?.completion_rate ?? 0);
    const engajamentoLabel = completionPct >= 70 ? t('charts.engagement_high') : completionPct >= 40 ? t('charts.engagement_mid') : t('charts.engagement_low');
    const engajamentoPill  = completionPct >= 70 ? twPillOk : completionPct >= 40 ? twPillWrn : 'inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-500';

    const specialtyCounts: Record<string, number> = {};
    cases.forEach(c => { if (c.specialty) specialtyCounts[c.specialty] = (specialtyCounts[c.specialty] ?? 0) + 1; });
    const topSpecialties = Object.entries(specialtyCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s);



    const basicPct = cases.length ? Math.round(cases.filter(c => c.difficulty === 'Básico').length / cases.length * 100) : 0;
    const midPct   = cases.length ? Math.round(cases.filter(c => c.difficulty === 'Intermediário').length / cases.length * 100) : 0;
    const advPct   = cases.length ? Math.round(cases.filter(c => c.difficulty === 'Avançado').length / cases.length * 100) : 0;
    const donutBg  = `conic-gradient(#844AF5 0% ${basicPct}%, #60a5fa ${basicPct}% ${basicPct + midPct}%, #e2e8f0 ${basicPct + midPct}% 100%)`;

    return (
      <>
        {/* Hero row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card: Criar provas por IA */}
          <a
            href="https://anamnes-provas-.base44.app"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-[0_18px_40px_rgba(234,88,12,.40)] hover:-translate-y-1 bg-gradient-to-br from-[#ea580c] to-[#f97316] block"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <span className="text-[11px] font-semibold text-white/70 uppercase tracking-widest">{t('chat.reports.new_tool')}</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/20 text-white">{t('chat.reports.ai_tag')}</span>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-white/80 mb-4 leading-relaxed">{t('chat.reports.ai_desc')}</p>
              <span className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[#ea580c] text-sm font-bold shadow-[0_4px_14px_rgba(0,0,0,.18)]">
                {t('chat.reports.create_exams_ai')}
              </span>
            </div>
          </a>

          {/* Card: Criar Caso */}
          <div
            className="rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-[0_18px_40px_rgba(107,53,255,.40)] hover:-translate-y-1 bg-gradient-to-br from-[#6b35ff] to-[#9c6dff]"
            onClick={() => navigate('/teacher/new-case')}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <span className="text-[11px] font-semibold text-white/70 uppercase tracking-widest">{t('chat.reports.create_case')}</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/20 text-white">{t('chat.reports.teacher_tag')}</span>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-white/80 mb-4 leading-relaxed">{t('chat.reports.create_case_desc')}</p>
              <button
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[#6b35ff] text-sm font-bold hover:bg-white/90 transition-all shadow-[0_4px_14px_rgba(0,0,0,.18)]"
                onClick={(e) => { e.stopPropagation(); setIsCaseFormOpen(true); }}
              >
                <Plus size={13} /> {t('chat.reports.create_now')}
              </button>
            </div>
          </div>

          {/* Card: Casos Criados */}
          <div className={twCard}>
            <div className={twCardHd}>
              <span className={twCardT}>{t('chat.reports.cases_created')}</span>
              <span className={twPillSft}>{t('chat.reports.total')}</span>
            </div>
            <div className={`${twCardBd} flex flex-col justify-between`}>
              <div>
                <div className="text-4xl font-black tabular-nums leading-none mb-0.5 bg-gradient-to-r from-[#6b35ff] to-[#9c6dff] bg-clip-text text-transparent">{stats?.total_cases ?? 0}</div>
                <div className="text-[11px] font-semibold text-[#9893b0] uppercase tracking-wide mb-1">{t('chat.reports.cases_created_by_you')}</div>
                <div className={twMuted}>{t('chat.reports.attempts_made', { count: stats?.total_attempts ?? 0 })}</div>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />{t('chat.reports.classes_count', { count: stats?.total_classes ?? 0 })}</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-600"><span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />{t('chat.reports.students_count', { count: stats?.total_students ?? 0 })}</span>
              </div>
            </div>
          </div>

          {/* Card: Engajamento */}
          <div className={twCard}>
            <div className={twCardHd}>
              <span className={twCardT}>{t('chat.reports.engagement')}</span>
              <span className={engajamentoPill}>{engajamentoLabel}</span>
            </div>
            <div className={`${twCardBd} flex items-center justify-center`}>
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#eee" strokeWidth="3" />
                  <path strokeDasharray={`${completionPct}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#844AF5" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-black text-xl text-[#334155] leading-none">{completionPct}%</span>
                  <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-wide">{t('chat.reports.completion')}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Second row — chart + donut */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={`${twCard} lg:col-span-2`}>
            <div className={twCardHd}>
              <span className={twCardT}>{t('chat.reports.class_avg_evolution')}</span>
              <span className={twPillSft}>{weeklyStats.length > 0 ? t('chat.reports.last_weeks', { count: weeklyStats.length }) : t('chat.reports.no_data')}</span>
            </div>
            <WeeklyAreaChart weeklyStats={weeklyStats} />
          </div>

          <div className={twCard}>
            <div className={twCardHd}>
              <span className={twCardT}>{t('chat.reports.distribution')}</span>
              <span className={twPillSft}>{t('chat.reports.difficulty')}</span>
            </div>
            <div className={twCardBd}>
              <div className="flex items-center gap-5">
                <div className="relative w-24 h-24 flex-shrink-0">
                  <div className="w-full h-full rounded-full" style={{ background: donutBg }} />
                  <div className="absolute inset-3 bg-white rounded-full flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-[#9893b0] uppercase">{t('chat.reports.total_center')}</span>
                    <span className="text-xl font-black text-[#111018]">{stats?.total_cases ?? 0}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2.5 flex-1">
                  {([
                    { label: t('difficulty.basico'),        pct: basicPct, color: 'bg-[#844AF5]' },
                    { label: t('difficulty.intermediario'),  pct: midPct,   color: 'bg-blue-400'  },
                    { label: t('difficulty.avancado'),       pct: advPct,   color: 'bg-slate-200' },
                  ] as { label: string; pct: number; color: string }[]).map(item => (
                    <div key={item.label} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                        <span className="font-semibold text-[#374151]">{item.label}</span>
                      </div>
                      <span className="font-bold text-[#111018]">{item.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <hr className="border-0 border-t border-[#f0edf8] my-4" />
              {topSpecialties.length > 0 ? (
                <>
                  <div className="text-[10px] font-bold text-[#9893b0] uppercase mb-2">{t('chat.reports.specialties')}</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {topSpecialties.map(s => (
                      <span key={s} className={twBadgePu}>#{s}</span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-xs text-[#9893b0]">{t('chat.reports.no_cases')}</div>
              )}
            </div>
          </div>
        </section>
      </>
    );
  };

  // ─── RenderClasses ───────────────────────────────────────────────────────
  const RenderClasses = () => {
    const activeClass = getSelectedClass();
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 h-[calc(100vh-140px)]">
        <div className="flex flex-col gap-3 overflow-y-auto">
          <button className={`${twBtnPri} w-full`} onClick={() => setIsCreateClassOpen(true)}>
            <Plus size={14} /> {t('chat.classes.new_class')}
          </button>

          {classes.map((cls, ci) => {
            const accent = ['#844AF5','#10b981','#f59e0b','#3b82f6','#a855f7','#ec4899'][ci % 6];
            return (
              <div
                key={cls.id}
                className={`bg-white rounded-2xl cursor-pointer overflow-hidden transition-all hover:shadow-[0_14px_28px_rgba(107,53,255,.18)] hover:-translate-y-0.5 ${selectedClassId === cls.id ? 'border-2 border-[#844AF5] shadow-[0_0_0_4px_rgba(132,74,245,.12)]' : 'border border-[#e9e7f6] shadow-[0_4px_14px_rgba(19,12,45,.07)]'}`}
                onClick={() => handleSelectClass(cls.id)}
              >
                <div className="h-1.5" style={{ background: accent }} />
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <div className="font-semibold text-sm text-[#111018]">{cls.name}</div>
                    <div className="text-[12px] text-[#6b6880] mt-0.5">{cls.term ?? t('chat.classes.no_period')} &bull; {cls.status}</div>
                  </div>
                  <div className="flex flex-col gap-1.5 items-end">
                    <span className={twBadge}>{cls.code}</span>
                    <span className={twBadgeOk}>{cls.status}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Modal de criar turma foi movido para o nível do TeacherChatPage */}
        </div>

        <div className="overflow-y-auto">
          {activeClass ? (
            <div className={`${twCard} sticky top-0`}>
              <div className={twCardHd}>
                <span className={twCardT}>{t('chat.classes.details')}</span>
                <div className="flex gap-1.5">
                  {!isEditingClass && (
                    <button className={twBtnGho} style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => handleStartEditClass(activeClass)}>{t('actions.edit')}</button>
                  )}
                  <button className={twBtnDgr} style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => handleDeleteClass(activeClass.id)}>{t('actions.delete')}</button>
                </div>
              </div>
              <div className={`${twCardBd} flex flex-col gap-4`}>
                {isEditingClass ? (
                  <>
                    <label className="flex flex-col gap-1">
                      <span className={twFLabel}>{t('chat.classes.name')}</span>
                      <input className={twInput} value={editingClassName} onChange={e => setEditingClassName(e.target.value)} />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1">
                        <span className={twFLabel}>{t('chat.classes.term')}</span>
                        <input className={twInput} value={editingClassTerm} onChange={e => setEditingClassTerm(e.target.value)} />
                      </label>
                      <div className="flex flex-col gap-1">
                        <span className={twFLabel}>{t('chat.classes.code')}</span>
                        <div className={twSVal}>{activeClass.code}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className={twBtnGho} onClick={() => setIsEditingClass(false)}>{t('actions.cancel')}</button>
                      <button className={twBtnPri} onClick={() => handleSaveEditClass(activeClass.id)}>{t('actions.save')}</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-1">
                      <span className={twFLabel}>{t('chat.classes.name')}</span>
                      <div className={twSVal}>{activeClass.name}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <span className={twFLabel}>{t('chat.classes.code')}</span>
                        <div className={twSVal}>{activeClass.code}</div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className={twFLabel}>{t('chat.classes.term')}</span>
                        <div className={twSVal}>{activeClass.term ?? t('chat.classes.no_period')}</div>
                      </div>
                    </div>
                  </>
                )}

                <hr className="border-0 border-t border-[#f0edf8]" />

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className={twFLabel}>{t('chat.classes.free_join')}</span>
                    <input
                      type="checkbox"
                      checked={activeClass.open_join}
                      onChange={(e) => handleUpdateClass(activeClass.id, 'open_join', e.target.checked)}
                      className="mt-1 w-4 h-4 accent-[#844AF5]"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className={twFLabel}>{t('chat.classes.goal')}</span>
                    <input
                      type="number"
                      className={twInput}
                      value={activeClass.goal ?? 80}
                      onChange={(e) => { const val = Number(e.target.value); setClasses(prev => prev.map(c => c.id === activeClass.id ? { ...c, goal: val } : c)); }}
                      onBlur={(e) => handleUpdateClass(activeClass.id, 'goal', Number(e.target.value))}
                    />
                  </label>
                </div>

                <button
                  className={`${twBtnGho} w-full`}
                  onClick={() => {
                    const code = activeClass.code;
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(code)
                        .then(() => showToast(t('chat.toasts.code_copied', { code })))
                        .catch(() => {
                          // fallback
                          const el = document.createElement('textarea');
                          el.value = code;
                          document.body.appendChild(el);
                          el.select();
                          document.execCommand('copy');
                          document.body.removeChild(el);
                          showToast(t('chat.toasts.code_copied', { code }));
                        });
                    } else {
                      const el = document.createElement('textarea');
                      el.value = code;
                      document.body.appendChild(el);
                      el.select();
                      document.execCommand('copy');
                      document.body.removeChild(el);
                      showToast(t('chat.toasts.code_copied', { code }));
                    }
                  }}
                >
                  {t('chat.classes.copy_invite')}
                </button>

                <hr className="border-0 border-t border-[#f0edf8]" />

                <div className="text-[11px] font-extrabold text-[#9893b0] uppercase tracking-widest">{t('chat.classes.students_count', { count: classStudents.length })}</div>
                {classStudents.length === 0 ? (
                  <div className={`${twMuted} text-[13px]`}>{t('chat.classes.no_students')}</div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {classStudents.map(st => (
                      <div key={st.id} className="flex justify-between items-center px-3 py-2 rounded-xl bg-[#f8fafc]">
                        <div>
                          <div className="font-semibold text-[13px] text-[#111018]">{st.name}</div>
                          <div className="text-[11px] text-[#94a3b8]">{st.email}</div>
                        </div>
                        <button
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-red-50 text-red-500 border border-red-100 font-semibold hover:bg-red-100 transition-all"
                          onClick={() => handleRemoveStudent(activeClass.id, st.id)}
                        >
                          {t('actions.remove')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <hr className="border-0 border-t border-[#f0edf8]" />

                <ClassSharingPanel
                  classId={activeClass.id}
                  isOwner={activeClass.teacher_id === user?.id}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-[#9893b0]">{t('chat.classes.select_class')}</div>
          )}
        </div>
      </div>
    );
  };

  // ─── RenderStudents ──────────────────────────────────────────────────────
  const RenderStudents = () => {
    const getStudentTag = (s: StudentStats) => {
      if (s.attempts === 0)     return { label: t('chat.students.tag_new'),       cls: twPillSft };
      if (s.average_score >= 8) return { label: t('chat.students.tag_highlight'), cls: twPillOk };
      if (s.average_score >= 5) return { label: t('chat.students.tag_regular'),   cls: twPillSft };
      return { label: t('chat.students.tag_attention'), cls: twPillWrn };
    };

    const searchLower = studentSearch.toLowerCase();
    const filteredClasses = classes.map(cls => ({
      cls,
      clsStudents: (classStudentsMap[cls.id] || []).filter(cs =>
        !searchLower || cs.name.toLowerCase().includes(searchLower) || cs.email.toLowerCase().includes(searchLower)
      ),
    })).filter(({ clsStudents }) => clsStudents.length > 0 || !searchLower);

    const totalStudents = new Set(Object.values(classStudentsMap).flatMap(arr => arr.map(s => s.id))).size;

    return (
      <div className="flex flex-col gap-4 max-w-5xl">
        {/* Barra de pesquisa */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0aac8]" />
            <input
              type="text"
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              placeholder={t('chat.students.search_placeholder')}
              className="pl-9 pr-3 py-2.5 w-full rounded-xl border border-[#e5e2ef] bg-white text-sm text-[#111018] placeholder:text-[#b0aac8] focus:outline-none focus:ring-2 focus:ring-[#844AF5]/20 focus:border-[#844AF5] transition-all"
            />
          </div>
          {studentSearch && (
            <button onClick={() => setStudentSearch('')} className="w-9 h-9 rounded-xl bg-[#f5f3fb] text-[#9893b0] flex items-center justify-center hover:bg-[#ede8f9] transition-colors">
              <X size={13} />
            </button>
          )}
          <span className="text-xs text-[#9893b0] font-medium flex-shrink-0 whitespace-nowrap">
            {t('chat.students.summary', { students: totalStudents, classes: classes.length })}
          </span>
        </div>

        {classes.length === 0 && (
          <div className="text-sm text-[#9893b0] text-center py-10">{t('chat.students.no_classes')}</div>
        )}

        {filteredClasses.map(({ cls, clsStudents }) => {
          const isCollapsed = collapsedClasses.has(cls.id);
          return (
            <div key={cls.id} className={twCard}>
              <button
                className="w-full px-5 pt-4 pb-3 border-b border-[#f0edf8] flex items-center justify-between gap-2 hover:bg-[#faf9fe] transition-colors text-left"
                onClick={() => setCollapsedClasses(prev => {
                  const next = new Set(prev);
                  if (next.has(cls.id)) next.delete(cls.id); else next.add(cls.id);
                  return next;
                })}
              >
                <div className="flex items-center gap-2">
                  {isCollapsed ? <ChevronRight size={14} className="text-[#9893b0]" /> : <ChevronDown size={14} className="text-[#9893b0]" />}
                  <span className="text-[13px] font-bold text-[#111018]">{cls.name}</span>
                  {cls.term && <span className="text-[11px] text-[#9893b0]">{cls.term}</span>}
                </div>
                <span className="text-[11px] font-semibold text-[#844AF5] bg-[#f3f1ff] px-2.5 py-1 rounded-full flex-shrink-0">
                  {t('chat.students.student_count', { count: clsStudents.length })}
                </span>
              </button>

              {!isCollapsed && (
                clsStudents.length === 0 ? (
                  <div className="px-5 py-4 text-sm text-[#9893b0]">{t('chat.students.no_students')}</div>
                ) : (
                  <table className="w-full table-fixed">
                    <colgroup>
                      <col style={{ width: '35%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '14%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        {[
                          { key: 'student', label: t('chat.students.th_student') },
                          { key: 'avg', label: t('chat.students.th_avg') },
                          { key: 'class', label: t('chat.students.th_class'), title: t('chat.students.title_class') },
                          { key: 'total', label: t('chat.students.th_total'), title: t('chat.students.title_total') },
                          { key: 'last', label: t('chat.students.th_last_activity') },
                          { key: 'actions', label: '' },
                        ].map((h, i) => (
                          <th key={h.key} title={h.title} className={`text-left py-3 text-[11px] font-semibold text-[#6b6880] uppercase tracking-widest border-b border-[#f0edf8] ${i === 0 ? 'pl-5 pr-3' : i === 5 ? 'pl-3 pr-5' : 'px-3'}`}>{h.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {clsStudents.map(cs => {
                        const s = students.find(st => st.student_id === cs.id);
                        const tag = s ? getStudentTag(s) : null;
                        return (
                          <tr
                            key={cs.id}
                            onClick={() => openStudentDetail(cs.id)}
                            className="cursor-pointer transition-colors hover:bg-[#f8f7ff] group"
                          >
                            <td className="py-3 pl-5 pr-3 border-b border-[#f7f5fc]">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#a78bfa] to-[#844AF5] flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold">
                                  {(cs.name?.[0] ?? cs.email?.[0] ?? '?').toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-[#374151] truncate">{cs.name}</div>
                                  <div className="text-[11px] text-[#9893b0] truncate">{cs.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 border-b border-[#f7f5fc]">
                              <span className={`text-sm font-bold ${
                                s && s.attempts > 0 && s.average_score >= 8 ? 'text-emerald-600' :
                                s && s.attempts > 0 && s.average_score >= 5 ? 'text-amber-600' :
                                s && s.attempts > 0 ? 'text-rose-500' : 'text-[#c4bfda]'
                              }`}>
                                {s && s.attempts > 0 ? s.average_score.toFixed(1) : '—'}
                              </span>
                            </td>
                            <td className="py-3 px-3 border-b border-[#f7f5fc]">
                              <span className="text-sm text-[#374151]">{s ? (s.completed_by_class?.[cls.id] ?? 0) : '—'}</span>
                            </td>
                            <td className="py-3 px-3 border-b border-[#f7f5fc]">
                              <span className="text-sm text-[#9893b0]">{s ? s.completed : '—'}</span>
                            </td>
                            <td className="py-3 px-3 border-b border-[#f7f5fc]">
                              <span className="text-[12px] text-[#9893b0]">
                                {s?.last_activity ? new Date(s.last_activity).toLocaleDateString(locale, { day: '2-digit', month: 'short' }) : '—'}
                              </span>
                            </td>
                            <td className="py-3 pl-3 pr-5 border-b border-[#f7f5fc]">
                              <div className="flex items-center gap-1.5 justify-end">
                                {tag && <span className={`${tag.cls} text-[10px]`}>{tag.label}</span>}
                                <ChevronRight size={13} className="text-[#d4cfe8] opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              )}
            </div>
          );
        })}

        {filteredClasses.length === 0 && searchLower && (
          <div className="text-sm text-[#9893b0] text-center py-10">
            {t('chat.students.not_found', { query: studentSearch })}
          </div>
        )}
      </div>
    );
  };

  // ─── RenderCases ─────────────────────────────────────────────────────────
  const RenderCases = () => {
    const activeCase = getSelectedCase();
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 h-[calc(100vh-140px)]">
        <div className="flex flex-col gap-4 overflow-y-auto">
          <button className={`${twBtnPri} w-full`} onClick={() => setIsCaseFormOpen(true)}>
            <Plus size={14} /> {t('chat.cases.new_case')}
          </button>

          {cases.length === 0 && (
            <div className="text-sm text-[#9893b0] text-center py-10">{t('chat.cases.no_cases')}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cases.map(ca => (
              <div
                key={ca.id}
                className={`bg-white rounded-2xl cursor-pointer overflow-hidden transition-all hover:shadow-[0_14px_28px_rgba(107,53,255,.18)] hover:-translate-y-0.5 ${selectedCaseId === ca.id ? 'border-2 border-[#844AF5] shadow-[0_0_0_4px_rgba(132,74,245,.12)]' : 'border border-[#e9e7f6] shadow-[0_4px_14px_rgba(19,12,45,.07)]'}`}
                onClick={() => setSelectedCaseId(ca.id)}
              >
                <div className={`h-1.5 ${diffBar[ca.difficulty] ?? 'bg-[#844AF5]'}`} />
                <div className="px-4 py-3.5">
                  <div className="font-bold text-[13px] text-[#111018] mb-2.5 leading-snug line-clamp-2 min-h-[2.4rem]">{ca.title}</div>
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {ca.specialty && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f3f1ff] text-[#7a55ff]">{specialtyLabel(ca.specialty)}</span>
                    )}
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${diffBg[ca.difficulty] ?? 'bg-[#f0edf8]'} ${diffText[ca.difficulty] ?? 'text-[#6b6880]'}`}>
                      {diffLabel(ca.difficulty)}
                    </span>
                    {formatExpiryLabel(t, locale, ca.available_until) && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                        {formatExpiryLabel(t, locale, ca.available_until)}
                      </span>
                    )}
                  </div>
                  <span className={ca.published ? twBadgeOk : twBadge}>
                    {ca.published ? t('chat.cases.published') : t('chat.cases.draft')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto">
          {activeCase ? (
            <div className={`${twCard} sticky top-0`}>
              <div className={twCardHd}>
                <span className={twCardT}>{t('chat.cases.config')}</span>
              </div>
              <div className={`${twCardBd} flex flex-col gap-4`}>
                <div className="flex flex-col gap-1">
                  <span className={twFLabel}>{t('chat.cases.title_field')}</span>
                  <input className={`${twInput} opacity-70 cursor-default`} value={activeCase.title} readOnly />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <span className={twFLabel}>{t('chat.cases.specialty')}</span>
                    <div className={twSVal}>{specialtyLabel(activeCase.specialty)}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className={twFLabel}>{t('chat.cases.difficulty')}</span>
                    <div className={twSVal}>{diffLabel(activeCase.difficulty)}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className={twFLabel}>{t('chat.cases.expiry_catalog')}</span>
                  <div className={twSVal}>{formatExpiryLabel(t, locale, activeCase.available_until) ?? t('chat.cases.permanent')}</div>
                  <p className="text-[10px] text-[#9893b0] mt-0.5 leading-snug">
                    {t('chat.cases.expiry_hint')}
                  </p>
                </div>

                <hr className="border-0 border-t border-[#f0edf8]" />

                <div className="flex flex-col gap-1">
                  <span className={twFLabel}>{t('chat.cases.visibility')}</span>
                  <select
                    className={twInput}
                    value={activeCase.visibility}
                    onChange={(e) => handleUpdateCase(activeCase.id, 'visibility', e.target.value)}
                  >
                    <option value="turma">{t('chat.cases.visibility_class')}</option>
                    <option value="privado">{t('chat.cases.visibility_private')}</option>
                  </select>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeCase.published}
                    onChange={(e) => handleUpdateCase(activeCase.id, 'published', e.target.checked)}
                    className="w-4 h-4 accent-[#844AF5]"
                  />
                  <span className="text-sm font-medium text-[#374151]">{t('chat.cases.published_for_students')}</span>
                </label>

                <hr className="border-0 border-t border-[#f0edf8]" />

                <div className="flex flex-col gap-1.5">
                  <span className={twFLabel}>{t('chat.cases.classes_with_case')}</span>
                  <p className="text-[11px] text-[#9893b0] leading-snug">
                    {t('chat.cases.classes_with_case_hint')}
                  </p>
                  {(caseAssignmentsDetail[activeCase.id] ?? []).length > 0 && (
                    <div className="flex flex-col gap-2 mt-1">
                      {(caseAssignmentsDetail[activeCase.id] ?? []).map(a => (
                        <div
                          key={a.id}
                          className="flex flex-wrap items-center gap-2 rounded-xl bg-[#f9f8fc] border border-[#e8e3fc] px-3 py-2"
                        >
                          <span className="text-xs font-semibold text-[#374151] min-w-0 flex-1 truncate">
                            {a.classes?.name ?? t('chat.cases.class_fallback')}
                            <span className="text-[10px] font-normal text-[#9893b0] ml-1">({a.classes?.code})</span>
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <input
                              type="date"
                              className="text-[11px] rounded-lg border border-[#e8e3fc] px-2 py-1 text-[#374151] bg-white max-w-[10.5rem]"
                              value={a.due_date ? a.due_date.slice(0, 10) : ''}
                              onChange={async (e) => {
                                const v = e.target.value;
                                const prev = a.due_date ? a.due_date.slice(0, 10) : '';
                                if (v === prev) return;
                                try {
                                  await updateCaseAssignment(activeCase.id, a.id, { due_date: v || null });
                                  await reloadCaseAssignments(activeCase.id);
                                } catch {
                                  showToast(t('chat.toasts.due_date_error'));
                                }
                              }}
                              title={t('chat.cases.due_date_title')}
                              disabled={caseAssigning}
                            />
                            <button
                              type="button"
                              className="text-[10px] font-semibold text-[#7a55ff] hover:underline px-1"
                              onClick={async () => {
                                try {
                                  await updateCaseAssignment(activeCase.id, a.id, { due_date: null });
                                  await reloadCaseAssignments(activeCase.id);
                                } catch {
                                  showToast(t('chat.toasts.due_date_error'));
                                }
                              }}
                              disabled={caseAssigning}
                            >
                              {t('chat.cases.no_due_date')}
                            </button>
                            <button
                              type="button"
                              className="p-1.5 rounded-lg text-[#9893b0] hover:text-rose-500 hover:bg-rose-50 transition-colors"
                              onClick={async () => {
                                if (!window.confirm(t('chat.confirm.remove_assignment'))) return;
                                try {
                                  await deleteCaseAssignment(activeCase.id, a.id);
                                  await reloadCaseAssignments(activeCase.id);
                                  showToast(t('chat.toasts.assignment_removed'));
                                } catch (err: unknown) {
                                  showToast((err instanceof Error ? err.message : null) ?? t('chat.toasts.remove_error'));
                                }
                              }}
                              title={t('chat.cases.remove_from_class')}
                              disabled={caseAssigning}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5 pt-1 border-t border-[#f0edf8] mt-1">
                    <span className="text-[11px] font-medium text-[#6b6897]">{t('chat.cases.attach_other_class')}</span>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        className={`${twInput} flex-1`}
                        value={caseAssignClassId}
                        onChange={e => setCaseAssignClassId(e.target.value)}
                        disabled={caseAssigning}
                      >
                        <option value="">
                          {classes.filter(c => !(caseAssignmentsDetail[activeCase.id] ?? []).some(x => x.class_id === c.id)).length === 0
                            ? t('chat.cases.all_classes_have')
                            : t('chat.cases.select_class')}
                        </option>
                        {classes
                          .filter(c => !(caseAssignmentsDetail[activeCase.id] ?? []).some(x => x.class_id === c.id))
                          .map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                          ))}
                      </select>
                      <input
                        type="date"
                        className={`${twInput} sm:max-w-[11rem]`}
                        value={caseAssignDueDate}
                        onChange={e => setCaseAssignDueDate(e.target.value)}
                        disabled={caseAssigning}
                        title={t('chat.cases.due_date_class_title')}
                      />
                      <button
                        type="button"
                        className={twBtnPri}
                        onClick={() => handleAssignCaseToClass(activeCase.id)}
                        disabled={
                          caseAssigning
                          || !caseAssignClassId
                          || classes.filter(c => !(caseAssignmentsDetail[activeCase.id] ?? []).some(x => x.class_id === c.id)).length === 0
                        }
                      >
                        {caseAssigning ? '...' : t('chat.cases.attach')}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#f3f1ff] text-[#7a55ff] text-sm font-semibold hover:bg-[#ede8fc] transition-all border border-[#e8e3fc]"
                    onClick={() => handleOpenCaseAttempts(activeCase.id, activeCase.title)}
                  >
                    <MessageSquare size={14} /> {t('chat.cases.see_who_did')}
                  </button>
                  <button className={`${twBtnGho} w-full`} onClick={() => handleOpenEditCase(activeCase)}>{t('chat.cases.edit_content')}</button>
                  <button className={`${twBtnDgr} w-full`} onClick={() => handleDeleteCase(activeCase.id)}>{t('actions.delete')}</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-[#9893b0]">{t('chat.cases.select_case')}</div>
          )}
        </div>
      </div>
    );
  };

  // ─── Main return ─────────────────────────────────────────────────────────
  return (
    <>
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
                <GraduationCap size={13} className="text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-bold leading-none tracking-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>Anamnes.IA</p>
                <p className="text-[#7c78a0] text-[10px] mt-0.5 font-medium tracking-wider uppercase">{t('chat.header.role')}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
            {([
              { id: 'reports',  label: t('chat.sidebar.reports'),  icon: <LayoutDashboard size={20} />, color: 'text-sky-400'     },
              { id: 'classes',  label: t('chat.sidebar.classes'),      icon: <Users size={20} />,           color: 'text-emerald-400' },
              { id: 'students', label: t('chat.sidebar.students'),  icon: <GraduationCap size={20} />,   color: 'text-amber-400'   },
              { id: 'cases',    label: t('chat.sidebar.cases'),       icon: <FileText size={20} />,        color: 'text-violet-400'  },
              { id: 'content',  label: t('chat.sidebar.content'),    icon: <BookOpen size={20} />,        color: 'text-teal-400'    },
              { id: 'flashcards', label: t('chat.sidebar.flashcards'), icon: <Layers size={20} />,           color: 'text-pink-400'    },
            ] as { id: ViewType; label: string; icon: React.ReactNode; color: string }[]).map(item => {
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveView(item.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-semibold transition-all text-left select-none focus:outline-none focus-visible:outline-none ${
                    active
                      ? 'bg-gradient-to-r from-[#844AF5] to-[#6b35ff] text-white shadow-[0_4px_14px_rgba(132,74,245,.40)] border-[3px] border-white'
                      : 'text-[#a39dc4] hover:bg-white/[.06] hover:text-white border-[3px] border-transparent'
                  }`}
                >
                  <span className={active ? 'text-white' : item.color}>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="px-2 pt-3 pb-4 border-t border-white/[.06] flex flex-col gap-0.5">
            <button
              onClick={() => navigate('/mainpage')}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-semibold text-[#a39dc4] hover:bg-white/[.06] hover:text-white transition-all"
            >
              <ChevronLeft size={20} /> {t('chat.sidebar.back_to_menu')}
            </button>
            <button
              onClick={handleExport}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-semibold text-[#a39dc4] hover:bg-white/[.06] hover:text-white transition-all"
            >
              <Download size={20} /> {t('chat.sidebar.export_csv')}
            </button>
            <div className="mt-2 flex items-center gap-3 px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-[#844AF5] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {user?.name?.[0]?.toUpperCase() ?? 'P'}
              </div>
              <div className="min-w-0">
                <p className="text-[#e2dff5] text-sm font-semibold truncate">{user?.name ?? t('chat.sidebar.teacher_fallback')}</p>
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
              <span className="text-[#9893b0] font-medium">{t('chat.header.role')}</span>
              <span className="text-[#d4cfe8]">/</span>
              <span className="text-[#111018] font-semibold capitalize">
                {activeView === 'reports'  ? t('chat.sidebar.reports')  :
                 activeView === 'classes'  ? t('chat.sidebar.classes')      :
                 activeView === 'students' ? t('chat.sidebar.students')  :
                 activeView === 'cases'    ? t('chat.sidebar.cases')       :
                 activeView === 'content'  ? t('chat.sidebar.content')    :
                 activeView === 'flashcards' ? t('chat.sidebar.flashcards') : activeView}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {(activeView === 'cases' || activeView === 'content') && (
                <button
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6b35ff] text-white text-xs font-semibold rounded-xl hover:bg-[#5a2ad9] transition-all"
                  onClick={() => setIsCaseFormOpen(true)}
                >
                  <Plus size={13} /> {t('chat.header.new_case')}
                </button>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-7">
            {loading ? (
              <div className="flex justify-center py-28">
                <div className="w-7 h-7 border-2 border-[#844AF5] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {activeView === 'reports'  && RenderReports()}
                {activeView === 'classes'  && RenderClasses()}
                {activeView === 'students' && RenderStudents()}
                {activeView === 'cases'    && RenderCases()}
                {activeView === 'content'  && RenderFreeCases()}
                {activeView === 'flashcards' && <FlashcardsView />}
              </>
            )}
          </div>
        </main>
        </div>
      </div>

      {/* MODAL: Criar / Editar Caso */}
      {isCaseFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <CaseForm
              classes={classes}
              onCaseCreated={handleCaseCreated}
              onClose={() => { setIsCaseFormOpen(false); setEditingCase(null); }}
              showToast={showToast}
              editingCase={editingCase ?? undefined}
            />
          </div>
        </div>
      )}

      {/* MODAL: Histórico do Aluno */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setIsHistoryModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0edf8] bg-gradient-to-r from-[#f3f1ff] to-white">
              <div>
                <div className="text-base font-bold text-[#111018]">{t('chat.history_modal.title')}</div>
                <div className="text-xs text-[#6b6880] mt-0.5">{t('chat.history_modal.subtitle')}</div>
              </div>
              <button
                className="w-7 h-7 rounded-lg bg-[#f5f3fb] text-[#6b6880] flex items-center justify-center hover:bg-[#ede8f9] transition-all"
                onClick={() => setIsHistoryModalOpen(false)}
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-6">
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#844AF5] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : historyData.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr>
                      {[
                        { key: 'date', label: t('chat.history_modal.th_date') },
                        { key: 'case', label: t('chat.history_modal.th_case') },
                        { key: 'score', label: t('chat.history_modal.th_score') },
                        { key: 'status', label: t('chat.history_modal.th_status') },
                      ].map(h => (
                        <th key={h.key} className="text-left pb-3 pr-4 text-[11px] font-semibold text-[#6b6880] uppercase tracking-widest border-b border-[#f0edf8]">{h.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.map((h, i) => (
                      <tr key={i}>
                        <td className="py-3 pr-4 text-sm text-[#374151] border-b border-[#f7f5fc]">{h.started_at ? new Date(h.started_at).toLocaleDateString(locale) : '--'}</td>
                        <td className="py-3 pr-4 text-sm text-[#374151] border-b border-[#f7f5fc]">{h.cases?.title ?? t('chat.history_modal.case_removed')}</td>
                        <td className="py-3 pr-4 text-sm text-[#374151] border-b border-[#f7f5fc] font-semibold">{h.score !== null ? h.score : '--'}</td>
                        <td className="py-3 pr-4 border-b border-[#f7f5fc]">
                          <span className={h.status === 'completed' ? twBadgeOk : twBadge}>{h.status === 'completed' ? t('status.completed') : h.status === 'abandoned' ? t('status.abandoned') : t('status.in_progress')}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-sm text-[#6b6880] text-center py-8">{t('chat.history_modal.empty')}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Detalhe do Aluno */}
      <StudentDetailModal
        open={studentDetail.open}
        loading={studentDetail.loading}
        error={studentDetail.error}
        profile={studentDetail.profile}
        onClose={() => setStudentDetail(prev => ({ ...prev, open: false }))}
      />

      {/* MODAL: Criar Turma */}
      {isCreateClassOpen && (
        <CreateClassModal
          onClose={() => setIsCreateClassOpen(false)}
          onCreated={(c) => {
            setClasses(prev => [c, ...prev]);
            setIsCreateClassOpen(false);
            showToast(t('chat.toasts.class_created', { name: c.name, code: c.code }));
          }}
        />
      )}

      {/* TOAST */}
      {toast.visible && <SimpleToast message={toast.msg} visible={toast.visible} />}

      {/* ─── MODAL: Tentativas do Caso ────────────────────────────────── */}
      {caseAttemptsModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,8,26,.55)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,.22)] w-full max-w-2xl max-h-[85vh] flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0edf8]">
              <div>
                <p className="text-xs font-bold text-[#9893b0] uppercase tracking-widest mb-0.5">{t('chat.attempts_modal.label')}</p>
                <p className="text-sm font-bold text-[#111018] leading-tight">{caseAttemptsModal.caseTitle}</p>
              </div>
              <button onClick={() => setCaseAttemptsModal(prev => ({ ...prev, open: false }))} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9893b0] hover:bg-[#f5f3fb] hover:text-[#111018] transition-all">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {caseAttemptsModal.loading ? (
                <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-[#844AF5] border-t-transparent rounded-full animate-spin" /></div>
              ) : caseAttemptsModal.attempts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <GraduationCap size={32} className="text-[#d4cfe8]" />
                  <p className="text-sm font-semibold text-[#374151]">{t('chat.attempts_modal.none')}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-[#9893b0] mb-1">{t('chat.attempts_modal.attempt_count', { count: caseAttemptsModal.attempts.length })}</p>
                  {caseAttemptsModal.attempts.map(attempt => {
                    const statusColor = attempt.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : attempt.status === 'abandoned' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700';
                    const statusLabel = attempt.status === 'completed' ? t('status.completed') : attempt.status === 'abandoned' ? t('status.abandoned') : t('status.in_progress');
                    const dur = attempt.duration_seconds ? `${Math.floor(attempt.duration_seconds / 60)}m ${attempt.duration_seconds % 60}s` : null;
                    return (
                      <div key={attempt.id} className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl bg-[#faf9fe] border border-[#f0edf8] hover:border-[#c4bee0] transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#844AF5]/10 flex items-center justify-center text-[#844AF5] text-[11px] font-bold flex-shrink-0">
                            {(attempt.users?.name ?? 'A').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#111018] truncate">{attempt.users?.name ?? t('chat.attempts_modal.student_fallback')}</p>
                            <p className="text-[11px] text-[#9893b0] truncate">{attempt.users?.email ?? ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor}`}>{statusLabel}</span>
                          {attempt.score !== null && (
                            <span className={`text-sm font-bold tabular-nums ${attempt.score >= 70 ? 'text-emerald-600' : attempt.score >= 50 ? 'text-amber-600' : 'text-rose-500'}`}>
                              {attempt.score}<span className="text-[10px] font-normal text-[#9893b0]">/100</span>
                            </span>
                          )}
                          {dur && <span className="text-[11px] text-[#9893b0] hidden sm:block">{dur}</span>}
                          <button
                            onClick={() => handleOpenConvModal(attempt)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#7a55ff] border border-[#e8e3fc] bg-white hover:border-[#844AF5] hover:bg-[#f3f1ff] transition-all"
                          >
                            <MessageSquare size={12} /> {t('chat.attempts_modal.history')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Histórico de Conversa ─────────────────────────────── */}
      {convModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(10,8,26,.65)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,.28)] w-full max-w-xl max-h-[85vh] flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0edf8]">
              <div>
                <p className="text-xs font-bold text-[#9893b0] uppercase tracking-widest mb-0.5">{t('chat.conv_modal.label')}</p>
                <p className="text-sm font-bold text-[#111018]">{convModal.studentName}</p>
              </div>
              <button onClick={() => setConvModal(prev => ({ ...prev, open: false }))} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9893b0] hover:bg-[#f5f3fb] hover:text-[#111018] transition-all">
                <X size={16} />
              </button>
            </div>

            {/* Score + feedback */}
            {(convModal.score !== null || convModal.feedback) && (
              <div className="px-6 py-3 border-b border-[#f0edf8] flex flex-col gap-1.5">
                {convModal.score !== null && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#9893b0] uppercase tracking-widest">{t('chat.conv_modal.score')}</span>
                    <span className={`text-base font-black tabular-nums ${convModal.score >= 70 ? 'text-emerald-600' : convModal.score >= 50 ? 'text-amber-600' : 'text-rose-500'}`}>
                      {convModal.score}<span className="text-xs font-normal text-[#9893b0]">/100</span>
                    </span>
                  </div>
                )}
                {convModal.feedback && (
                  <p className="text-xs text-[#5c5480] leading-relaxed whitespace-pre-line">{convModal.feedback}</p>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
              {convModal.loading ? (
                <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-[#844AF5] border-t-transparent rounded-full animate-spin" /></div>
              ) : convModal.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
                  <MessageSquare size={28} className="text-[#d4cfe8]" />
                  <p className="text-sm text-[#9893b0]">{t('chat.conv_modal.empty')}</p>
                </div>
              ) : (
                convModal.messages.map(msg => {
                  const isUser = msg.role === 'user';
                  const isSoap = msg.content.startsWith('[SOAP_SUBMISSION]');
                  const content = isSoap ? msg.content.replace('[SOAP_SUBMISSION]\n', '') : msg.content;
                  return (
                    <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isSoap
                          ? 'bg-[#f3f1ff] border border-[#e8e3fc] text-[#374151] w-full max-w-full'
                          : isUser
                          ? 'bg-[#844AF5] text-white rounded-br-sm'
                          : 'bg-[#f7f6fa] text-[#374151] rounded-bl-sm border border-[#f0edf8]'
                      }`}>
                        {isSoap && <p className="text-[10px] font-bold text-[#7a55ff] uppercase tracking-widest mb-2">{t('chat.conv_modal.soap_by_student')}</p>}
                        <p className="whitespace-pre-wrap">{content}</p>
                        {msg.timestamp && (
                          <p className={`text-[10px] mt-1.5 ${isSoap ? 'text-[#9893b0]' : isUser ? 'text-white/60' : 'text-[#b0aac8]'}`}>
                            {new Date(msg.timestamp).toLocaleString(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TeacherChatPage;
