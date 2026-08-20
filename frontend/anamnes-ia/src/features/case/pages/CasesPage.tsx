import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { MainMenu } from '@/shared/components';
import { freeCases, type FreeCase } from '@/features/case/mocks/freeCases';
import { fetchAvailableCases, fetchFreeCases } from '@/features/chat/services/studentService';
import type { AvailableCase } from '@/features/chat/services/studentService';
import { useAuth } from '@/features/auth';
import {
  ArrowLeft, Search, GraduationCap, Target,
  Stethoscope, Brain, Wind, Utensils, Droplets, Heart,
  Bone, Syringe, Sparkles, Baby, Bug, FlaskConical, Zap,
} from 'lucide-react';
import { SPECIALTIES, getSpecialty, specialtyLabel } from '@/shared/utils/specialties';

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseSummaryAge(summary: string | null): string | null {
  if (!summary) return null;
  const m = summary.match(/,\s*(\d+)\s*anos/);
  return m ? m[1] : null;
}

function parseSummaryQP(summary: string | null): string | null {
  if (!summary) return null;
  const m = summary.match(/Queixa principal:\s*([^.]+)/);
  return m ? m[1].trim() : null;
}

function difficultyGradient(difficulty: string): string {
  const d = difficulty.toLowerCase();
  if (d === 'easy' || d === 'básico' || d === 'basico') return 'from-[#18c39a] to-[#12a37f]';
  if (d === 'hard' || d === 'avançado' || d === 'avancado') return 'from-[#f04b87] to-[#d63a70]';
  return 'from-[#f0a04b] to-[#d98e3a]';
}

function formatExpiryTag(expiresAt: string | null | undefined, t: TFunction<'case'>, locale: string): string | null {
  if (!expiresAt) return null;
  const expiresMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresMs)) return null;
  const diffMs = expiresMs - Date.now();
  if (diffMs <= 0) return t('expiry.today');
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return t('expiry.hours', { count: diffHours });
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return t('expiry.days', { count: diffDays }); // plural via _one/_other
  return t('expiry.date', { date: new Date(expiresAt).toLocaleDateString(locale) });
}

// Icons por especialidade (apenas local — para exibição nos cards)
const SPECIALTY_ICON: Record<string, React.ReactNode> = {
  'Clínica Geral':         <Stethoscope size={11} />,
  'Neurologia':            <Brain size={11} />,
  'Pneumologia':           <Wind size={11} />,
  'Gastroenterologia':     <Utensils size={11} />,
  'Hematologia':           <Droplets size={11} />,
  'Cardiologia':           <Heart size={11} />,
  'Ortopedia':             <Bone size={11} />,
  'Endocrinologia':        <Syringe size={11} />,
  'Dermatologia':          <Sparkles size={11} />,
  'Ginecologia':           <Stethoscope size={11} />,
  'Infectologia':          <Bug size={11} />,
  'Nefrologia':            <FlaskConical size={11} />,
  'Pediatria':             <Baby size={11} />,
  'Urgência e Emergência': <Zap size={11} />,
};

// Sem `label` fixo: o rótulo é resolvido no render (`specialtyLabel`) para
// acompanhar a troca de idioma — este módulo é avaliado uma única vez.
const SPECIALTY_FILTERS = SPECIALTIES.map(s => ({ key: s.key, emoji: s.emoji }));

const DIFFICULTY_FILTERS = [
  { key: 'Básico',        emoji: '🟢' },
  { key: 'Intermediário', emoji: '🟡' },
  { key: 'Avançado',      emoji: '🔴' },
];



const CasesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation('case');

  // Rótulos traduzidos das dificuldades. As CHAVES ('Básico'/'Intermediário'/
  // 'Avançado'/'Tudo') continuam sendo os identificadores usados na lógica de
  // filtro; só o texto exibido muda.
  const diffLabel = (key: string): string => ({
    Tudo: t('filter_all'),
    'Básico': t('difficulty.basico'),
    'Intermediário': t('difficulty.intermediario'),
    'Avançado': t('difficulty.avancado'),
  }[key] ?? key);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('Tudo');
  const [activeDiffFilter, setActiveDiffFilter] = useState<string>('Tudo');
  const [activeSpecialtyFilter, setActiveSpecialtyFilter] = useState<string>('Tudo');
  const [selectedFreeCase, setSelectedFreeCase] = useState<FreeCase | null>(null);
  const [apiFreeCases, setApiFreeCases] = useState<FreeCase[]>([]);
  const [availableCases, setAvailableCases] = useState<AvailableCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);

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
            id: c.id, title: c.title,
            persona_nome: fd?.persona_nome || c.title,
            persona_idade: fd?.persona_idade || '',
            queixa_principal: fd?.queixa_principal || c.summary || '',
            description: c.summary || 'Caso clínico para treinamento.',
            category: level as FreeCase['category'],
            difficulty: diff, level, area,
            estimatedTime: diff === 'easy' ? '10-15 min' : diff === 'hard' ? '20-30 min' : '15-20 min',
            initialPrompt: c.patient_prompt,
            available_until: c.available_until ?? null,
          };
        });
        setApiFreeCases(mapped);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user || (user.role !== 'student' && user.role !== 'admin')) return;
    setCasesLoading(true);
    fetchAvailableCases()
      .then(setAvailableCases)
      .catch(() => setAvailableCases([]))
      .finally(() => setCasesLoading(false));
  }, [user]);

  const handleStartCase = (caseItem: AvailableCase) => {
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

  const handleStartFreeCase = (freeCase: FreeCase) => {
    navigate('/student-chat', {
      state: {
        freeCase: {
          id: freeCase.id, title: freeCase.title, level: freeCase.level,
          area: freeCase.area, initialPrompt: freeCase.initialPrompt, type: 'free',
        },
      },
    });
  };

  const handleOpenFreeCase = (freeCase: FreeCase) => setSelectedFreeCase(freeCase);
  const handleConfirmFreeCase = () => {
    if (!selectedFreeCase) return;
    setSelectedFreeCase(null);
    handleStartFreeCase(selectedFreeCase);
  };

  const allClassNames = Array.from(new Set(availableCases.flatMap(c => c.class_names ?? [])));
  const availableCaseIds = new Set(availableCases.map(ac => ac.id));
  const baseFree = (apiFreeCases.length > 0 ? apiFreeCases : freeCases).filter(fc => !availableCaseIds.has(fc.id));
  const isClassFilter = allClassNames.includes(activeFilter);
  const searchLower = searchTerm.toLowerCase();

  // Difficulty label normaliser
  function normDiff(d: string) {
    const k = d.toLowerCase();
    if (k === 'easy' || k === 'básico') return 'Básico';
    if (k === 'hard' || k === 'avançado') return 'Avançado';
    return 'Intermediário';
  }

  // Specialty normaliser (maps API values to filter keys)
  function normSpecialty(s?: string | null): string {
    if (!s) return '';
    if (s === 'Clínica' || s === 'Clínica') return 'Clínica Geral';
    if (s === 'Emergência') return 'Urgência e Emergência';
    return s;
  }

  const filteredAvailable: AvailableCase[] = availableCases
    .filter(c => !isClassFilter || c.class_names.includes(activeFilter))
    .filter(c => activeDiffFilter === 'Tudo' || normDiff(c.difficulty) === activeDiffFilter)
    .filter(c => activeSpecialtyFilter === 'Tudo' || normSpecialty(c.specialty) === activeSpecialtyFilter)
    .filter(c =>
      !searchLower ||
      c.title.toLowerCase().includes(searchLower) ||
      (c.specialty ?? '').toLowerCase().includes(searchLower)
    );

  const filteredFree: FreeCase[] = isClassFilter ? [] : baseFree
    .filter(c => activeDiffFilter === 'Tudo' || normDiff(c.level) === activeDiffFilter)
    .filter(c => activeSpecialtyFilter === 'Tudo' || normSpecialty(c.area) === activeSpecialtyFilter)
    .filter(c =>
      !searchLower ||
      c.title.toLowerCase().includes(searchLower) ||
      c.area.toLowerCase().includes(searchLower) ||
      c.level.toLowerCase().includes(searchLower)
    );

  return (
    <div className="min-h-screen bg-[#f7f6fa] text-[#20202a] w-full">
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
      <div className="lg:grid lg:grid-cols-[80px_1fr] min-h-screen w-full relative z-10">

        <aside className="hidden lg:block lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:overflow-y-auto z-30">
          <MainMenu />
        </aside>
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50 w-full shadow-md">
          <MainMenu mobile />
        </header>
        <div className="hidden lg:block w-20" />

        <main className="w-full relative">
          <div className="lg:hidden h-16 w-full" />

          {/* Header */}
          <div className="w-full bg-[#1a1730]">
            <div className="w-full max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-10 py-5 flex items-center gap-4">
              <button
                onClick={() => navigate('/mainpage')}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors flex-shrink-0"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="min-w-0">
                <p className="text-[17px] sm:text-[20px] font-extrabold text-white tracking-tight leading-none">
                  {t('header_title')}
                </p>
                <p className="text-[10px] text-[#9b8fff] font-semibold tracking-[.2em] uppercase mt-1 leading-none hidden sm:block">
                  {t('header_subtitle')}
                </p>
              </div>
            </div>
          </div>
          {/* Wave */}
          <div aria-hidden="true" className="w-full -mt-px overflow-hidden leading-none">
            <svg viewBox="0 0 1440 56" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-12 sm:h-14">
              <path d="M0,0 C360,56 1080,0 1440,40 L1440,0 L0,0 Z" fill="#1a1730" />
            </svg>
          </div>

          <div className="w-full max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-10 py-9 flex flex-col gap-6">

            {/* Search + Filters */}
            <div className="flex flex-col gap-3 w-full">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder={t('search_placeholder')}
                  className="w-full rounded-2xl border border-[#e9e7f6] bg-white px-4 py-3 pl-11 text-sm text-[#20202a] placeholder:text-[#6a6a78] shadow-[0_2px_8px_rgba(19,12,45,.06)] focus:outline-none focus:ring-2 focus:ring-[#7a55ff]/40 focus:border-[#7a55ff]/40 transition-all"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6a6a78] flex items-center"><Search size={16} /></span>
              </div>
              {/* Row 1: Turmas + Dificuldade */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide items-center flex-nowrap">
                {/* Turma filters */}
                {allClassNames.map(cls => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setActiveFilter(activeFilter === cls ? 'Tudo' : cls)}
                    className={`flex-shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 flex items-center gap-1 ${
                      activeFilter === cls
                        ? 'bg-[#1a1730] text-white border-[#1a1730] shadow-[0_6px_16px_rgba(26,23,48,.30)]'
                        : 'bg-white text-[#7a55ff] border-[#e9e7f6] hover:bg-[#f3f1ff] hover:border-[#c4bfea]'
                    }`}
                  >
                    <GraduationCap size={11} className="flex-shrink-0" /> {cls}
                  </button>
                ))}

                {allClassNames.length > 0 && <div className="w-px h-5 bg-[#e9e7f6] flex-shrink-0" />}

                {/* Difficulty filters */}
                {[{ key: 'Tudo', emoji: '⚡', label: 'Tudo' }, ...DIFFICULTY_FILTERS.map(d => ({ key: d.key, emoji: d.emoji, label: d.key }))].map(f => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setActiveDiffFilter(f.key)}
                    className={`flex-shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 flex items-center gap-1 ${
                      activeDiffFilter === f.key
                        ? 'bg-[#6b35ff] text-white border-[#6b35ff] shadow-[0_4px_12px_rgba(107,53,255,.25)]'
                        : 'bg-white text-[#6a6a78] border-[#e9e7f6] hover:bg-[#f3f1ff] hover:border-[#c4bfea]'
                    }`}
                  >
                    <span>{f.emoji}</span> {diffLabel(f.label)}
                  </button>
                ))}
              </div>

              {/* Row 2: Especialidades */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide items-center flex-nowrap">
                <button
                  type="button"
                  onClick={() => setActiveSpecialtyFilter('Tudo')}
                  className={`flex-shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 ${
                    activeSpecialtyFilter === 'Tudo'
                      ? 'bg-[#6b35ff] text-white border-[#6b35ff] shadow-[0_4px_12px_rgba(107,53,255,.25)]'
                      : 'bg-white text-[#6a6a78] border-[#e9e7f6] hover:bg-[#f3f1ff] hover:border-[#c4bfea]'
                  }`}
                >
                  {t('filter_all_specialties')}
                </button>
                {SPECIALTY_FILTERS.map(f => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setActiveSpecialtyFilter(activeSpecialtyFilter === f.key ? 'Tudo' : f.key)}
                    className={`flex-shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 flex items-center gap-1 ${
                      activeSpecialtyFilter === f.key
                        ? 'bg-[#1a1730] text-white border-[#1a1730] shadow-[0_4px_12px_rgba(26,23,48,.25)]'
                        : 'bg-white text-[#6a6a78] border-[#e9e7f6] hover:bg-[#f3f1ff] hover:border-[#c4bfea]'
                    }`}
                  >
                    <span>{f.emoji}</span> {specialtyLabel(f.key)}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid */}
            {casesLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7a55ff]" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 w-full items-start">
                {/* Casos da turma */}
                {filteredAvailable.map(caseItem => {
                  const statusLabel =
                    caseItem.last_status === 'completed' ? t('status.completed')
                    : caseItem.last_status === 'abandoned' ? t('status.abandoned')
                    : caseItem.last_status === 'in_progress' ? t('status.in_progress')
                    : t('status.new');
                  const cardGradient = difficultyGradient(caseItem.difficulty);
                  const buttonLabel =
                    caseItem.last_status === 'completed' ? t('action.retry')
                    : (caseItem.last_status === 'in_progress' || caseItem.last_status === 'abandoned') ? t('action.new_attempt')
                    : t('action.start');
                  const specMeta = caseItem.specialty ? getSpecialty(caseItem.specialty) : null;
                  const specIcon = caseItem.specialty ? SPECIALTY_ICON[caseItem.specialty] ?? null : null;
                  const expiryTag = formatExpiryTag(caseItem.expires_at, t, i18n.language);
                  return (
                    <div
                      key={caseItem.id}
                      className="rounded-2xl overflow-hidden bg-white shadow-[0_10px_22px_rgba(19,12,45,.10)] hover:shadow-[0_18px_38px_rgba(19,12,45,.16)] hover:-translate-y-1 active:-translate-y-0.5 transition-all duration-200 cursor-pointer select-none flex flex-col"
                      onClick={() => handleStartCase(caseItem)}
                      role="button" tabIndex={0}
                      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleStartCase(caseItem)}
                    >
                      <div className={`relative bg-gradient-to-br ${cardGradient} px-5 pt-5 pb-6 text-white min-h-[160px] flex flex-col justify-between`}>
                        <div className="absolute inset-0 bg-[radial-gradient(900px_220px_at_30%_0%,rgba(255,255,255,.14),transparent_60%)] pointer-events-none" />
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-[11px] font-semibold bg-black/15 backdrop-blur-sm rounded-full px-2.5 py-0.5">{statusLabel}</span>
                            {expiryTag && (
                              <span className="text-[11px] font-semibold bg-black/15 backdrop-blur-sm rounded-full px-2.5 py-0.5">
                                {expiryTag}
                              </span>
                            )}
                            {caseItem.class_names?.[0] && (
                              <span className="text-[11px] font-semibold bg-black/15 backdrop-blur-sm rounded-full px-2.5 py-0.5 flex items-center gap-1"><GraduationCap size={11} /> {caseItem.class_names[0]}</span>
                            )}
                          </div>
                          <h3 className="text-[20px] font-extrabold leading-tight tracking-tight mb-0.5 line-clamp-2">{caseItem.title}</h3>
                          {parseSummaryAge(caseItem.summary) && (
                            <p className="text-[13px] font-medium opacity-75">{t('age', { age: parseSummaryAge(caseItem.summary) })}</p>
                          )}
                        </div>
                        <div className="relative z-10 flex items-center gap-2 mt-3 flex-wrap">
                          <span className="text-[11px] font-semibold bg-black/15 backdrop-blur-sm rounded-full px-2.5 py-0.5 flex items-center gap-1"><Target size={10} /> {diffLabel(normDiff(caseItem.difficulty))}</span>
                          {caseItem.specialty && (
                            <span className="text-[11px] font-semibold bg-black/15 backdrop-blur-sm rounded-full px-2.5 py-0.5 flex items-center gap-1">
                            {specMeta ? specIcon : null} {specialtyLabel(caseItem.specialty)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="px-4 py-3 bg-white flex flex-col gap-1">
                        {parseSummaryQP(caseItem.summary) && (
                          <div className="flex flex-col gap-0.5 mb-1">
                            <span className="text-[11px] font-bold text-[#9893b0] uppercase tracking-widest">{t('initial_listen')}</span>
                            <p className="text-[13px] text-[#11111a] leading-snug line-clamp-2">{parseSummaryQP(caseItem.summary)}</p>
                          </div>
                        )}
                        {caseItem.best_score !== null && caseItem.best_score !== undefined && (
                          <div className="flex items-center justify-between text-[13px] text-[#454554]">
                            <span>{t('best_score')}</span>
                            <strong className="font-extrabold text-[#11111a]">{caseItem.best_score}</strong>
                          </div>
                        )}
                        {caseItem.attempts_count > 0 && (
                          <div className="flex items-center justify-between text-[13px] text-[#454554]">
                            <span>{t('attempts')}</span>
                            <strong className="font-extrabold text-[#11111a]">{caseItem.attempts_count}</strong>
                          </div>
                        )}
                        {caseItem.attempts_count === 0 && (caseItem.best_score === null || caseItem.best_score === undefined) && (
                          <div className="min-h-[48px] flex items-center justify-center text-[#9a9aab] text-[12px] text-center">{t('no_attempts')}</div>
                        )}
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); handleStartCase(caseItem); }}
                          className="mt-2 inline-flex items-center justify-center w-full rounded-xl text-xs sm:text-sm font-semibold px-3 py-2.5 transition-colors bg-[#7a55ff] hover:bg-[#5a2ad9] text-white"
                        >
                          {buttonLabel}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Casos gratuitos */}
                {filteredFree.map(caseItem => {
                  const freeGradient = difficultyGradient(caseItem.level);
                  const freeSpecIcon = SPECIALTY_ICON[caseItem.area] ?? null;
                  const freeExpiryTag = formatExpiryTag(caseItem.available_until, t, i18n.language);
                  return (
                    <div
                      key={caseItem.id}
                      className="rounded-2xl overflow-hidden bg-white shadow-[0_10px_22px_rgba(19,12,45,.10)] hover:shadow-[0_18px_38px_rgba(19,12,45,.16)] hover:-translate-y-1 active:-translate-y-0.5 transition-all duration-200 cursor-pointer select-none flex flex-col"
                      onClick={() => handleOpenFreeCase(caseItem)}
                      role="button" tabIndex={0}
                      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleOpenFreeCase(caseItem)}
                    >
                      <div className={`relative bg-gradient-to-br ${freeGradient} px-5 pt-5 pb-6 text-white min-h-[160px] flex flex-col justify-between`}>
                        <div className="absolute inset-0 bg-[radial-gradient(900px_220px_at_30%_0%,rgba(255,255,255,.14),transparent_60%)] pointer-events-none" />
                        <div className="relative z-10">
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-[11px] font-semibold bg-black/15 backdrop-blur-sm rounded-full px-2.5 py-0.5">{t('free')}</span>
                            {freeExpiryTag && (
                              <span className="text-[11px] font-semibold bg-black/15 backdrop-blur-sm rounded-full px-2.5 py-0.5">
                                {freeExpiryTag}
                              </span>
                            )}
                          </div>
                          <h3 className="text-[20px] font-extrabold leading-tight tracking-tight mb-0.5">{caseItem.persona_nome}</h3>
                          {caseItem.persona_idade && <p className="text-[13px] font-medium opacity-75">{t('age', { age: caseItem.persona_idade })}</p>}
                        </div>
                        <div className="relative z-10 flex items-center gap-2 mt-3 flex-wrap">
                          <span className="text-[11px] font-semibold bg-black/15 backdrop-blur-sm rounded-full px-2.5 py-0.5 flex items-center gap-1"><Target size={10} /> {diffLabel(caseItem.level)}</span>
                          <span className="text-[11px] font-semibold bg-black/15 backdrop-blur-sm rounded-full px-2.5 py-0.5 flex items-center gap-1">
                            {freeSpecIcon} {specialtyLabel(caseItem.area)}
                          </span>
                        </div>
                      </div>
                      <div className="px-4 py-3 bg-white flex flex-col gap-2 flex-1 justify-between">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-bold text-[#9893b0] uppercase tracking-widest">{t('initial_listen')}</span>
                          <p className="text-[13px] text-[#11111a] leading-snug line-clamp-2">{caseItem.queixa_principal}</p>
                        </div>
                        <div className="flex items-center justify-between text-[13px] text-[#454554]">
                          <span>{t('estimated_time')}</span>
                          <strong className="font-extrabold text-[#11111a]">{caseItem.estimatedTime}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); handleOpenFreeCase(caseItem); }}
                          className="mt-2 inline-flex items-center justify-center w-full rounded-xl text-xs sm:text-sm font-semibold px-3 py-2.5 transition-colors bg-[#6b35ff] hover:bg-[#5a2ad9] text-white shadow-sm"
                        >
                          {t('action.view')}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredAvailable.length === 0 && filteredFree.length === 0 && (
                  <div className="col-span-full rounded-2xl bg-[#faf9ff] border border-[#ece9ff] p-8 text-center">
                    <p className="text-[#6a6a78] text-sm">
                      {isClassFilter
                        ? t('empty.class')
                        : searchTerm
                          ? t('empty.search', { term: searchTerm })
                          : activeSpecialtyFilter !== 'Tudo' || activeDiffFilter !== 'Tudo'
                            ? t('empty.filters')
                            : t('empty.none')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <footer className="w-full pt-7 border-t border-[#f0f0f5] pb-6">
              <p className="text-[11px] text-[#b8b8c8] text-center">{t('footer')}</p>
            </footer>
          </div>
        </main>
      </div>

      {/* Modal caso gratuito */}
      {selectedFreeCase && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setSelectedFreeCase(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {(() => {
                const modalGradient = difficultyGradient(selectedFreeCase.level);
              const modalSpecIcon = SPECIALTY_ICON[selectedFreeCase.area] ?? null;
              return (
                <div className={`relative bg-gradient-to-br ${modalGradient} px-6 pt-6 pb-8 text-white`}>
                  <div className="absolute inset-0 bg-[radial-gradient(900px_220px_at_30%_0%,rgba(255,255,255,.14),transparent_60%)] pointer-events-none" />
                  <button
                    onClick={() => setSelectedFreeCase(null)}
                    className="absolute top-4 right-4 text-white/70 hover:text-white text-xl font-bold leading-none"
                  >×</button>
                  <div className="relative z-10">
                    <div className="flex gap-2 mb-3 flex-wrap">
                      <span className="text-[11px] font-semibold bg-black/15 backdrop-blur-sm rounded-full px-2.5 py-0.5 flex items-center gap-1"><Target size={10} /> {diffLabel(selectedFreeCase.level)}</span>
                      <span className="text-[11px] font-semibold bg-black/15 backdrop-blur-sm rounded-full px-2.5 py-0.5 flex items-center gap-1">
                        {modalSpecIcon} {specialtyLabel(selectedFreeCase.area)}
                      </span>
                    </div>
                    <h3 className="text-[22px] font-extrabold leading-tight tracking-tight">{selectedFreeCase.title}</h3>
                  </div>
                </div>
              );
            })()}
            <div className="px-6 py-5 flex flex-col gap-4">
              {/* Paciente */}
              {(selectedFreeCase.persona_nome || selectedFreeCase.persona_idade) && (
                <div className="pb-3 border-b border-[#f0eeff]">
                  <p className="text-[14px] font-bold text-[#11111a] leading-tight">{selectedFreeCase.persona_nome}</p>
                  {selectedFreeCase.persona_idade && (
                    <p className="text-[12px] text-[#6a6a78] mt-0.5">{t('age', { age: selectedFreeCase.persona_idade })}</p>
                  )}
                </div>
              )}
              {/* Queixa principal */}
              {selectedFreeCase.queixa_principal && (
                <div className="flex flex-col gap-0.5 pb-3 border-b border-[#f0eeff]">
                  <span className="text-[11px] font-bold text-[#9893b0] uppercase tracking-widest">{t('chief_complaint')}</span>
                  <p className="text-[13px] text-[#11111a] leading-snug">{selectedFreeCase.queixa_principal}</p>
                </div>
              )}
              {/* Tempo estimado */}
              <div className="flex items-center justify-between text-[13px] text-[#454554]">
                <span>{t('estimated_time')}</span>
                <strong className="font-extrabold text-[#11111a]">{selectedFreeCase.estimatedTime}</strong>
              </div>
              <button
                type="button"
                onClick={handleConfirmFreeCase}
                className="w-full py-3 rounded-xl bg-[#6b35ff] hover:bg-[#5a2ad9] text-white font-semibold text-sm transition-all shadow-sm"
              >
                {t('action.start')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CasesPage;
