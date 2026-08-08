import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { MainMenu, TipsCarousel } from '@/shared/components';
import { ChatHistoryCarousel } from '@/features/chat';
import TrainingModules from '@/features/minigame/components/TrainingModules';
import { freeCases, type FreeCase } from '@/features/case/mocks/freeCases';
import { fetchAvailableCases, fetchFreeCases, fetchDailyQuota } from '@/features/chat/services/studentService';
import type { AvailableCase, DailyQuota } from '@/features/chat/services/studentService';
import { useAuth } from '@/features/auth';
import { ArrowRight, ChevronLeft, ChevronRight, GraduationCap, Sparkles, Target, Building2, BookOpen, CheckCircle, Star, X, Clock, Gamepad2, MessageSquare, Stethoscope } from 'lucide-react';
import { fetchMyProfile } from '@/features/profile/services/profileService';
import type { StudentProfile } from '@/features/profile/types/profile';
import useEmblaCarousel from 'embla-carousel-react';
import logoImg from '@/assets/anamnesia_logo.png';
import { specialtyLabel } from '@/shared/utils/specialties';

// ── Saudação baseada no horário ──────────────────────────────────────────────
// Devolve a chave do dicionário, não o texto — a tradução acontece no render.
function getGreetingKey(): 'home.greeting_morning' | 'home.greeting_afternoon' | 'home.greeting_evening' {
  const h = new Date().getHours();
  if (h < 12) return 'home.greeting_morning';
  if (h < 18) return 'home.greeting_afternoon';
  return 'home.greeting_evening';
}

// ── Daily-rotating case preview ──────────────────────────────────────────────
const PREVIEW_COUNT = 5;

function difficultyGradient(difficulty: string): string {
  const d = difficulty.toLowerCase();
  if (d === 'easy' || d === 'básico' || d === 'basico') return 'from-[#18c39a] to-[#12a37f]';
  if (d === 'hard' || d === 'avançado' || d === 'avancado') return 'from-[#f04b87] to-[#d63a70]';
  return 'from-[#f0a04b] to-[#d98e3a]';
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = seed.split('').reduce((acc, c) => (Math.imul(31, acc) + c.charCodeAt(0)) | 0, 0);
  const rng = () => {
    h ^= h << 13; h ^= h >> 17; h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type PreviewCase =
  | ({ kind: 'class' } & AvailableCase)
  | ({ kind: 'free' } & FreeCase);

const MainPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const { user } = useAuth();

  // ── Embla carousel ──
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', dragFree: true });
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const [emblaCanPrev, setEmblaCanPrev] = useState(false);
  const [emblaCanNext, setEmblaCanNext] = useState(true);
  useEffect(() => {
    if (!emblaApi) return;
    const update = () => {
      setEmblaCanPrev(emblaApi.canScrollPrev());
      setEmblaCanNext(emblaApi.canScrollNext());
    };
    emblaApi.on('select', update);
    emblaApi.on('reInit', update);
    update();
    return () => { emblaApi.off('select', update); emblaApi.off('reInit', update); };
  }, [emblaApi]);
  // emblaMask removed — now using overlay divs instead

  // ── Cota diária ──
  const [quota, setQuota] = useState<DailyQuota | null>(null);
  useEffect(() => { fetchDailyQuota().then(setQuota).catch(() => { }); }, []);

  // ── Perfil (estatísticas + mapa de notas) ──
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  useEffect(() => {
    if (!user) return;
    fetchMyProfile().then(setProfile).catch(() => { });
  }, [user]);

  const weeklyStats = useMemo(() => {
    if (!profile) return null;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const thisWeek = profile.history.filter(a => new Date(a.started_at) >= cutoff);
    const attempts = thisWeek.length;
    const completed = thisWeek.filter(a => a.status === 'completed').length;
    const scores = thisWeek.filter(a => a.score !== null && !a.is_ai_chat).map(a => a.score as number);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null;
    return { attempts, completed, avgScore };
  }, [profile]);

  // ── Casos gratuitos (API + fallback para mock) ──
  const [apiFreeCases, setApiFreeCases] = useState<FreeCase[]>([]);

  // ── Casos da turma ──
  const [availableCases, setAvailableCases] = useState<AvailableCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);

  // ── Carregar casos gratuitos da API ──
  useEffect(() => {
    fetchFreeCases()
      .then(list => {
        if (list.length === 0) return;
        const mapped: FreeCase[] = list.map(c => {
          const diffMap: Record<string, FreeCase['difficulty']> = { 'Básico': 'easy', 'Intermediário': 'medium', 'Avançado': 'hard' };
          const level = (c.difficulty as FreeCase['level']) || 'Intermediário';
          const area = c.specialty || 'Clínica';
          const diff = diffMap[c.difficulty] || 'medium';
          const fd = c.form_data as Record<string, string> | undefined;
          return {
            id: c.id,
            title: c.title,
            persona_nome: fd?.persona_nome || c.title,
            persona_idade: fd?.persona_idade || '',
            queixa_principal: fd?.queixa_principal || c.summary || '',
            description: c.summary || 'Caso clínico para treinamento.',
            category: level as FreeCase['category'],
            difficulty: diff,
            level,
            area,
            estimatedTime: diff === 'easy' ? '10-15 min' : diff === 'hard' ? '20-30 min' : '15-20 min',
            initialPrompt: c.patient_prompt,
          };
        });
        setApiFreeCases(mapped);
      })
      .catch(() => { /* usa mock */ });
  }, []);

  // ── Carregar casos disponíveis da turma ──
  useEffect(() => {
    if (!user || (user.role !== 'student' && user.role !== 'teacher' && user.role !== 'admin')) return;
    setCasesLoading(true);
    fetchAvailableCases()
      .then(setAvailableCases)
      .catch(() => setAvailableCases([]))
      .finally(() => setCasesLoading(false));
  }, [user]);

  const handleStartCase = (caseItem: AvailableCase) => {
    if (quota && quota.regular_available <= 0) return;
    navigate('/student-chat', {
      state: {
        pendingCase: {
          id: caseItem.id,
          title: caseItem.title,
          specialty: caseItem.specialty,
          difficulty: caseItem.difficulty,
        },
      },
    });
  };

  const quickActions = useMemo(() => [
    {
      title: 'Casos clínicos',
      description: 'Acesse cenários prontos para praticar diagnóstico e comunicação.',
      icon: <Stethoscope size={18} />, 
      route: '/cases',
      accent: 'from-[#7a55ff] to-[#6040e0]',
    },
    {
      title: 'Simulação',
      description: 'Entre na conversa com o paciente e responda em tempo real.',
      icon: <MessageSquare size={18} />, 
      route: '/student-chat',
      accent: 'from-[#18c39a] to-[#12a37f]',
    },
    {
      title: 'Flashcards',
      description: 'Revise conceitos e fixe o conteúdo com repetição espaçada.',
      icon: <BookOpen size={18} />, 
      route: '/flashcards',
      accent: 'from-[#f04b87] to-[#d63a70]',
    },
    {
      title: 'Minigame',
      description: 'Aprimore sua atenção e raciocínio com exercícios curtos.',
      icon: <Gamepad2 size={18} />, 
      route: '/minigame',
      accent: 'from-[#f0a04b] to-[#d98e3a]',
    },
  ], []);

  // Casos gratuitos — deduplica os que já aparecem via turma
  const availableCaseIds = new Set(availableCases.map(ac => ac.id));
  const baseFree = (apiFreeCases.length > 0 ? apiFreeCases : freeCases)
    .filter(fc => !availableCaseIds.has(fc.id));

  // ── Seleção diária de 5 casos ──────────────────────────────────────────────
  const dailyCases = useMemo((): PreviewCase[] => {
    const today = new Date().toISOString().slice(0, 10);
    const seed = `${user?.id ?? 'guest'}-${today}`;
    const pool: PreviewCase[] = [
      ...availableCases.map(c => ({ kind: 'class' as const, ...c })),
      ...baseFree.map(c => ({ kind: 'free' as const, ...c })),
    ];
    return seededShuffle(pool, seed).slice(0, PREVIEW_COUNT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableCases, baseFree.length, user?.id]);

  const handleStartFreeCase = (freeCase: FreeCase) => {
    if (quota && quota.regular_available <= 0) return;
    navigate('/student-chat', {
      state: {
        freeCase: {
          id: freeCase.id,
          title: freeCase.title,
          level: freeCase.level,
          area: freeCase.area,
          initialPrompt: freeCase.initialPrompt,
          type: 'free',
        }
      }
    });
  };

  // ── Preview popup state ──
  const [previewCase, setPreviewCase] = useState<PreviewCase | null>(null);

  const handleConfirmStart = () => {
    if (!previewCase) return;
    if (previewCase.kind === 'class') handleStartCase(previewCase);
    else handleStartFreeCase(previewCase);
    setPreviewCase(null);
  };


  return (
    <div className="min-h-screen bg-[#f7f6fa] text-[#20202a] w-full">
      {/* ── Aurora nos cantos ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: [
            'radial-gradient(ellipse 65% 55% at 0% 0%, rgba(138,91,255,0.20) 0%, transparent 70%)',
            'radial-gradient(ellipse 55% 50% at 100% 0%, rgba(99,179,237,0.16) 0%, transparent 70%)',
            'radial-gradient(ellipse 45% 40% at 100% 100%, rgba(122,85,255,0.13) 0%, transparent 70%)',
          ].join(', '),
        }}
      />
      {/* ── Grid de pontos ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(122,85,255,0.18) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="lg:grid lg:grid-cols-[80px_1fr] min-h-screen w-full relative z-10">

        {/* Menu lateral */}
        <aside className="hidden lg:block lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:overflow-y-auto z-30">
          <MainMenu />
        </aside>

        {/* Menu topo (Mobile) */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50 w-full shadow-md">
          <MainMenu mobile />
        </header>

        {/* Espaçador Grid Desktop */}
        <div className="hidden lg:block w-20 bg-[#1a1730]" />

        {/* Conteúdo Principal */}
        <main className="w-full relative">
          {/* Espaçador Mobile */}
          <div className="lg:hidden h-16 w-full" />

          {/* ── FAIXA DE MARCA ── */}
          <div className="w-full bg-[#1a1730]">
            <div className="w-full max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-10 py-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <img src={logoImg} alt="ANAMNES.IA" className="h-10 sm:h-12 w-auto object-contain flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[17px] sm:text-[20px] font-bold text-white tracking-tight leading-none" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    Anamnes.IA
                  </p>
                  <p className="text-[10px] text-[#9b8fff] font-semibold tracking-[.2em] uppercase mt-1 leading-none hidden sm:block">
                    {t('home.tagline')}
                  </p>
                </div>
              </div>
              {user?.name && (
                <span className="text-[13px] text-white/70 font-medium">
                  <Trans
                    i18nKey="home.hello"
                    ns="common"
                    values={{ name: user.name.split(' ')[0] }}
                    components={{ 1: <span className="text-white font-semibold" /> }}
                  />
                </span>
              )}
            </div>
          </div>

          {/* ── Onda de transição header → fundo ── */}
          <div aria-hidden="true" className="w-full -mt-px overflow-hidden leading-none">
            <svg viewBox="0 0 1440 56" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-12 sm:h-14">
              <path d="M0,0 C360,56 1080,0 1440,40 L1440,0 L0,0 Z" fill="#1a1730" className="header-wave" />
            </svg>
          </div>

          {/* ── CONTEÚDO ── */}
          <div className="w-full max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-10 py-9 flex flex-col gap-10">

            {/* ── MINI SAUDAÇÃO ── */}
            {user && (
              <div className="w-full bg-white rounded-2xl shadow-[0_4px_18px_rgba(19,12,45,.07)] border border-[#f0eeff] overflow-hidden">
                {/* Topo: saudação + botão */}
                <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-4">
                  <div>
                    <p className="text-[17px] font-bold text-[#20202a]">
                      <Trans
                        i18nKey="home.greeting_line"
                        ns="common"
                        values={{
                          greeting: t(getGreetingKey()),
                          name: user.name?.split(' ')[0] ?? t('home.student_fallback'),
                        }}
                        components={{ 1: <span className="text-[#7a55ff]" /> }}
                      />
                    </p>
                    <p className="text-[12px] text-[#9a9aab] mt-0.5">
                      {weeklyStats ? t('home.week_summary') : t('home.ready_prompt')}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/student-chat')}
                    className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#844AF5] to-[#6b35ff] text-white text-[13px] font-bold hover:opacity-90 transition-all shadow-[0_4px_14px_rgba(122,85,255,.25)] whitespace-nowrap"
                  >
                    {t('home.ready_cta')} <ArrowRight size={14} />
                  </button>
                </div>

                {/* Stats semanais */}
                {weeklyStats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[var(--card-divide)] border-t border-[var(--card-divide)]">
                    <div className="flex flex-col items-center justify-center gap-1 py-4 px-3">
                      <div className="flex items-center gap-1.5 text-indigo-400 mb-1"><BookOpen size={14} /></div>
                      <p className="text-[26px] font-extrabold text-[#20202a] leading-none">{weeklyStats.attempts}</p>
                      <p className="text-[11px] text-[#9a9aab] font-medium text-center">{t('home.stat_started')}</p>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1 py-4 px-3">
                      <div className="flex items-center gap-1.5 text-emerald-400 mb-1"><CheckCircle size={14} /></div>
                      <p className="text-[26px] font-extrabold text-[#20202a] leading-none">{weeklyStats.completed}</p>
                      <p className="text-[11px] text-[#9a9aab] font-medium text-center">{t('home.stat_completed')}</p>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1 py-4 px-3">
                      <div className="flex items-center gap-1.5 text-amber-400 mb-1"><Star size={14} /></div>
                      <p className="text-[26px] font-extrabold text-[#20202a] leading-none">
                        {weeklyStats.avgScore != null ? weeklyStats.avgScore : '—'}
                      </p>
                      <p className="text-[11px] text-[#9a9aab] font-medium text-center">{t('home.stat_avg_score')}</p>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1 py-4 px-3">
                      <div className="flex items-center gap-1.5 text-violet-400 mb-1"><Sparkles size={14} /></div>
                      {quota && quota.is_paid ? (
                        <>
                          <p className="text-[26px] font-extrabold text-[#20202a] leading-none">{quota.ai_used}<span className="text-[14px] font-semibold text-[#9a9aab]">/{quota.ai_limit}</span></p>
                          <p className="text-[11px] text-[#9a9aab] font-medium text-center">{t('home.stat_ai_today')}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-[26px] font-extrabold text-[#20202a] leading-none">{quota ? `${quota.regular_used}` : '—'}<span className="text-[14px] font-semibold text-[#9a9aab]">{quota ? `/${quota.regular_limit}` : ''}</span></p>
                          <p className="text-[11px] text-[#9a9aab] font-medium text-center">{t('home.stat_cases_today')}</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Atalhos de produtividade */}
            <section className="w-full flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-extrabold tracking-[.16em] text-[#7a55ff] uppercase m-0">
                    PRÓXIMO PASSO
                  </p>
                  <p className="text-sm text-[#6b6885] mt-1">
                    Escolha o caminho mais útil para continuar hoje.
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center rounded-full bg-[#f3f1ff] px-3 py-1 text-[10px] font-semibold text-[#7a55ff]">
                  Acesso rápido
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {quickActions.map(action => (
                  <button
                    key={action.title}
                    type="button"
                    onClick={() => navigate(action.route)}
                    className="group rounded-2xl border border-[#ece9ff] bg-white p-4 text-left shadow-[0_4px_16px_rgba(19,12,45,.04)] transition-all hover:-translate-y-0.5 hover:border-[#7a55ff] hover:shadow-[0_8px_24px_rgba(122,85,255,.14)]"
                  >
                    <div className={`inline-flex rounded-xl bg-gradient-to-r ${action.accent} p-2.5 text-white shadow-sm`}>
                      {action.icon}
                    </div>
                    <p className="mt-3 text-[15px] font-bold text-[#20202a]">{action.title}</p>
                    <p className="mt-1 text-sm leading-snug text-[#6b6885]">{action.description}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-[#7a55ff]">
                      Abrir agora <ArrowRight size={13} />
                    </span>
                  </button>
                ))}
              </div>
            </section>


            {/* Histórico */}
            <ChatHistoryCarousel />

            {/* ── CASOS DE HOJE ── */}
            <section className="w-full flex flex-col gap-4">
              {/* Header row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-[11px] font-extrabold tracking-[.16em] text-[#7a55ff] uppercase m-0 pl-3 border-l-[3px] border-[#7a55ff]">
                    {t('home.today_cases')}
                  </h2>
                  <span className="text-[10px] font-semibold text-[#b0aac8] bg-[#f3f1ff] px-2.5 py-0.5 rounded-full">
                    {t('home.renews_tomorrow')}
                  </span>
                  {/* Cota diária */}
                  {quota && (
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${quota.regular_available === 0
                        ? 'bg-rose-50 text-rose-500 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      }`}>
                      {t('home.quota_used', { used: quota.regular_used, limit: quota.regular_limit })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => navigate('/cases')}
                    className="flex items-center gap-1 text-[12px] font-semibold text-[#7a55ff] hover:text-[#5a35d9] transition-colors ml-1"
                  >
                    {t('home.see_all')}
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Embla carousel */}
              {casesLoading ? (
                <div className="flex gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-[230px] rounded-2xl bg-[#f3f1ff] animate-pulse h-[196px]" />
                  ))}
                </div>
              ) : dailyCases.length === 0 ? (
                <div
                  className="rounded-2xl bg-[#faf9ff] border border-[#ece9ff] p-6 text-center cursor-pointer hover:bg-[#f3f1ff] transition-colors"
                  onClick={() => navigate('/cases')}
                >
                  <p className="text-[#7a55ff] text-sm font-semibold">{t('home.explore_cases')}</p>
                </div>
              ) : (
                <div className="relative group">
                  {/* Prev button */}
                  {emblaCanPrev && (
                    <button
                      type="button"
                      onClick={scrollPrev}
                      aria-label={t('home.prev')}
                      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-20 w-9 h-9 rounded-full bg-white shadow-[0_4px_16px_rgba(19,12,45,.18)] border border-[#ede8ff] text-[#7a55ff] flex items-center justify-center transition-all duration-200 hover:bg-[#7a55ff] hover:text-white hover:shadow-[0_6px_20px_rgba(122,85,255,.35)] hover:scale-110 active:scale-95"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  )}
                  {/* Next button */}
                  {emblaCanNext && (
                    <button
                      type="button"
                      onClick={scrollNext}
                      aria-label={t('home.next')}
                      className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-20 w-9 h-9 rounded-full bg-white shadow-[0_4px_16px_rgba(19,12,45,.18)] border border-[#ede8ff] text-[#7a55ff] flex items-center justify-center transition-all duration-200 hover:bg-[#7a55ff] hover:text-white hover:shadow-[0_6px_20px_rgba(122,85,255,.35)] hover:scale-110 active:scale-95"
                    >
                      <ChevronRight size={16} />
                    </button>
                  )}
                  <div className="overflow-hidden" ref={emblaRef}>
                    <div className="flex gap-3.5">
                      {dailyCases.map(caseItem => {
                        const isClass = caseItem.kind === 'class';
                        const diffLabel = isClass ? caseItem.difficulty : caseItem.level;
                        const specialty = isClass ? caseItem.specialty : caseItem.area;
                        const gradient = difficultyGradient(isClass ? caseItem.difficulty : caseItem.difficulty);
                        const handleClick = () => setPreviewCase(caseItem);
                        return (
                          <div
                            key={caseItem.id}
                            className="flex-[0_0_230px] rounded-2xl overflow-hidden bg-white hover:-translate-y-0.5 transition-all duration-200 cursor-pointer select-none flex flex-col border border-[#f0edf8]"
                            onClick={handleClick}
                          >
                            <div className={`relative bg-gradient-to-br ${gradient} px-4 pt-4 pb-4 text-white flex flex-col justify-between min-h-[136px]`}>
                              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,.18),transparent_65%)] pointer-events-none rounded-t-2xl" />
                              <div className="relative z-10">
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-black/15 rounded-full px-2 py-0.5 mb-2 tracking-wide">
                                  {isClass
                                    ? <><GraduationCap size={10} /> {t('home.badge_teacher')}</>
                                    : <><Sparkles size={10} /> {t('home.badge_free')}</>}
                                </span>
                                <p className="text-[14px] font-bold leading-snug line-clamp-2">{caseItem.title}</p>
                              </div>
                              <div className="relative z-10 flex items-center gap-1.5 mt-3">
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-black/15 rounded-full px-2 py-0.5"><Target size={10} /> {diffLabel}</span>
                                {specialty && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-black/15 rounded-full px-2 py-0.5 truncate max-w-[90px]"><Building2 size={10} /> {specialtyLabel(specialty)}</span>
                                )}
                              </div>
                            </div>
                            <div className="px-3 py-2.5 bg-white">
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); handleClick(); }}
                                disabled={!!(quota && quota.regular_available <= 0)}
                                className="inline-flex items-center justify-center w-full rounded-xl text-xs font-semibold py-2 transition-all bg-[#7a55ff] hover:bg-[#6040e0] active:scale-[.97] text-white shadow-[0_2px_8px_rgba(122,85,255,.30)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#7a55ff]"
                              >
                                {quota && quota.regular_available <= 0 ? t('home.limit_reached') : t('home.see_case')}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {/* CTA card */}
                      <div
                        className="flex-[0_0_160px] rounded-2xl border border-dashed border-[#d6cffa] bg-[#faf9ff] flex flex-col items-center justify-center gap-2.5 px-4 py-6 cursor-pointer hover:border-[#7a55ff] hover:bg-[#f3f1ff] transition-colors"
                        onClick={() => navigate('/cases')}
                        role="button" tabIndex={0}
                        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && navigate('/cases')}
                      >
                        <span className="text-[26px]">🩺</span>
                        <p className="text-[11px] font-bold text-[#7a55ff] text-center leading-snug">{t('home.full_library')}</p>
                        <ArrowRight size={13} className="text-[#b0aac8]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Módulos de Exame Físico */}
            <TrainingModules />

            {/* Dicas Clínicas */}
            <TipsCarousel />

            {/* Footer */}
            <footer className="w-full pt-7 border-t border-[#f0f0f5] flex items-center justify-between pb-6">
              <div className="flex items-center gap-2">
                <img src={logoImg} alt="" className="h-5 w-auto opacity-30" />
                <p className="text-[11px] text-[#c0c0cc] font-semibold tracking-wide">Anamnes.IA</p>
              </div>
              <p className="text-[11px] text-[#b8b8c8]">CNPJ: 62.785.748/0001-02</p>
            </footer>

          </div>
        </main>
      </div>

      {/* ── Case Preview Modal ── */}
      {previewCase && (() => {
        const isClass = previewCase.kind === 'class';
        const nome = isClass ? previewCase.title : previewCase.persona_nome;
        const idade = isClass ? null : previewCase.persona_idade;
        const qp = isClass
          ? (previewCase.summary?.match(/Queixa principal:\s*([^.]+)/)?.[1]?.trim() ?? null)
          : previewCase.queixa_principal;
        const diffLabel = isClass ? previewCase.difficulty : previewCase.level;
        const estimatedTime = isClass
          ? (previewCase.difficulty === 'Básico' ? '10-15 min' : previewCase.difficulty === 'Avançado' ? '20-30 min' : '15-20 min')
          : previewCase.estimatedTime;
        const gradient = difficultyGradient(isClass ? previewCase.difficulty : previewCase.difficulty);
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(7,5,20,.65)', backdropFilter: 'blur(8px)' }}
            onClick={() => setPreviewCase(null)}
          >
            <div
              className="w-full max-w-sm rounded-2xl overflow-hidden shadow-[0_24px_60px_rgba(19,12,45,.35)] animate-[modalIn_.18s_ease]"
              onClick={e => e.stopPropagation()}
            >
              {/* Gradiente topo */}
              <div className={`relative bg-gradient-to-br ${gradient} px-5 pt-5 pb-6 text-white`}>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,.18),transparent_65%)] pointer-events-none" />
                <button
                  onClick={() => setPreviewCase(null)}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/20 flex items-center justify-center hover:bg-black/30 transition-colors"
                >
                  <X size={13} />
                </button>
                <div className="relative z-10">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-black/15 rounded-full px-2 py-0.5 mb-3 tracking-wide">
                    {isClass ? <><GraduationCap size={10} /> {t('home.badge_teacher')}</> : <><Sparkles size={10} /> {t('home.badge_free')}</>}
                  </span>
                  <h3 className="text-[20px] font-extrabold leading-tight tracking-tight mb-0.5">{nome}</h3>
                  {idade && <p className="text-[13px] font-medium opacity-75">{t('home.age', { age: idade })}</p>}
                </div>
                <div className="relative z-10 flex items-center gap-2 mt-4">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-black/15 rounded-full px-2.5 py-0.5"><Target size={10} /> {diffLabel}</span>
                </div>
              </div>
              {/* Parte branca */}
              <div className="bg-white px-5 py-4 flex flex-col gap-4">
                {qp && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-[#9893b0] uppercase tracking-widest">{t('home.initial_listening')}</span>
                    <p className="text-[14px] text-[#11111a] leading-snug">{qp}</p>
                  </div>
                )}
                <div className="flex items-center justify-between text-[13px] text-[#454554]">
                  <span className="flex items-center gap-1.5"><Clock size={13} className="text-[#9893b0]" /> {t('home.estimated_time')}</span>
                  <strong className="font-extrabold text-[#11111a]">{estimatedTime}</strong>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPreviewCase(null)}
                    className="flex-1 py-2.5 rounded-xl border border-[#e5e2ef] text-[13px] font-semibold text-[#374151] hover:bg-[#faf9fe] transition-colors"
                  >
                    {t('home.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmStart}
                    disabled={!!(quota && quota.regular_available <= 0)}
                    className="flex-1 py-2.5 rounded-xl bg-[#7a55ff] hover:bg-[#6040e0] text-white text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {quota && quota.regular_available <= 0 ? t('home.limit_reached') : t('home.start_case')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(.96) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default MainPage;
