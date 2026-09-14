/**
 * SPEC-013 — lógica pura do plano de estudos da home.
 *
 * Regras transversais do contrato (`docs/specs/SPEC-013-casos-de-teste.md` §1):
 * - R1 nunca lança; entrada vazia devolve o "zero" do tipo.
 * - R2 não muta a entrada.
 * - R3 datas comparadas no fuso local, por dia civil (00:00 local).
 * - R4 a semana começa na segunda.
 * - R5 nada de texto de UI aqui — só chave i18n + valores.
 *
 * `now` é sempre o último parâmetro: nenhuma função lê o relógio.
 */
import { WEEKLY_GOAL } from '@/config/constants';
import type { AttemptHistory, SoapProfile, SpecialtyStats } from '@/features/profile/types/profile';
import type { AvailableCase } from '@/features/chat/services/studentService';
import type { FreeCase } from '@/features/case/mocks/freeCases';

export { WEEKLY_GOAL };

/** Limiares travados na SPEC-013 §9 — revisáveis com dado de uso. */
const WEAK_MIN_ATTEMPTS = 3;
const STALE_MIN_DAYS = 5;
const MASTERY_MAX_ROWS = 5;
const SOAP_MIN_ATTEMPTS = 3;
const MAX_RECOMMENDATIONS = 4;

const DAY_MS = 86_400_000;

// ── Datas (sempre fuso local) ────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Diferença em dias civis (a − b), imune a DST por causa do arredondamento. */
function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / DAY_MS);
}

/** Segunda-feira 00:00 da semana de `now` (R4). */
function startOfWeek(now: Date): Date {
  const d = startOfDay(now);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/** Chave estável do dia civil, para agrupar tentativas sem cair em UTC. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function inCurrentWeek(iso: string, now: Date): boolean {
  const t = new Date(iso).getTime();
  const start = startOfWeek(now).getTime();
  return t >= start && t < start + 7 * DAY_MS;
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// ── weeklyStats ──────────────────────────────────────────────────────────────

export interface WeeklyStats {
  attempts: number;
  completed: number;
  avgScore: number | null;
}

/**
 * Semana corrente (seg→dom). Chat IA conta como tentativa (P1): o único filtro
 * de nota é `score !== null` — entradas de chat nunca têm score e saem da média
 * sozinhas.
 */
export function weeklyStats(history: AttemptHistory[], now: Date): WeeklyStats {
  const week = history.filter(a => inCurrentWeek(a.started_at, now));
  const scores = week.filter(a => a.score !== null).map(a => a.score as number);
  const mean = avg(scores);
  return {
    attempts: week.length,
    completed: week.filter(a => a.status === 'completed').length,
    avgScore: mean === null ? null : Math.round(mean),
  };
}

// ── scoreTrend ───────────────────────────────────────────────────────────────

/**
 * Média dos últimos 7 dias menos a dos 7 anteriores, arredondada.
 * `null` quando falta nota em qualquer das janelas — `0` é resultado válido (P2).
 */
export function scoreTrend(history: AttemptHistory[], now: Date): number | null {
  const end = now.getTime();
  const mid = end - 7 * DAY_MS;
  const start = end - 14 * DAY_MS;

  const recent: number[] = [];
  const previous: number[] = [];
  for (const a of history) {
    if (a.score === null) continue;
    const t = new Date(a.started_at).getTime();
    if (t >= mid && t <= end) recent.push(a.score);
    else if (t >= start && t < mid) previous.push(a.score);
  }

  const r = avg(recent);
  const p = avg(previous);
  if (r === null || p === null) return null;
  return Math.round(r - p);
}

// ── studyStreak ──────────────────────────────────────────────────────────────

export interface Streak {
  current: number;
  best: number;
  /** 7 posições, índice 0 = segunda. */
  week: boolean[];
}

export function studyStreak(history: AttemptHistory[], now: Date): Streak {
  const week = Array(7).fill(false) as boolean[];
  if (history.length === 0) return { current: 0, best: 0, week };

  const days = new Set<string>();
  const weekStart = startOfWeek(now);
  for (const a of history) {
    const d = new Date(a.started_at);
    days.add(dayKey(startOfDay(d)));
    const idx = daysBetween(d, weekStart);
    if (idx >= 0 && idx < 7) week[idx] = true;
  }

  const has = (offset: number): boolean => {
    const d = startOfDay(now);
    d.setDate(d.getDate() + offset);
    return days.has(dayKey(d));
  };

  // A sequência não quebra por hoje ainda não ter tentativa (T3.2): se hoje está
  // vazio, ela é contada a partir de ontem.
  let current = 0;
  const anchor = has(0) ? 0 : has(-1) ? -1 : null;
  if (anchor !== null) {
    let offset = anchor;
    while (has(offset)) {
      current += 1;
      offset -= 1;
    }
  }

  // `best` varre o histórico inteiro, não só a janela atual.
  const ordered = [...days]
    .map(k => {
      const [y, m, d] = k.split('-').map(Number);
      return new Date(y, m, d).getTime();
    })
    .sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const t of ordered) {
    run = prev !== null && daysBetween(new Date(t), new Date(prev)) === 1 ? run + 1 : 1;
    prev = t;
    if (run > best) best = run;
  }

  return { current, best, week };
}

// ── weeklyGoalProgress ───────────────────────────────────────────────────────

export interface GoalProgress {
  done: number;
  goal: number;
  pct: number;
}

/** `done` mostra o número real; `pct` satura em 100 (T4.3). */
export function weeklyGoalProgress(history: AttemptHistory[], now: Date): GoalProgress {
  const done = history.filter(a => a.status === 'completed' && inCurrentWeek(a.started_at, now)).length;
  return { done, goal: WEEKLY_GOAL, pct: Math.min(100, Math.round((done / WEEKLY_GOAL) * 100)) };
}

// ── specialtyMastery ─────────────────────────────────────────────────────────

export interface MasteryRow {
  specialty: string;
  score: number;
  band: 'low' | 'mid' | 'high';
}

function band(score: number): MasteryRow['band'] {
  if (score < 60) return 'low';
  if (score < 80) return 'mid';
  return 'high';
}

/**
 * `average_score === 0` é a sentinela de "tem tentativa, não tem nota"
 * (`routes/profile.py:111`) — descartada, senão sequestra o topo da lista (P5).
 */
function isScored(s: SpecialtyStats): boolean {
  return s.attempts > 0 && s.average_score > 0;
}

/** Ordem crescente: o ponto fraco vem primeiro, porque o objetivo é acionar. */
function byWeakest(a: SpecialtyStats, b: SpecialtyStats): number {
  return (
    a.average_score - b.average_score ||
    b.attempts - a.attempts ||
    a.specialty.localeCompare(b.specialty)
  );
}

export function specialtyMastery(bySpecialty: SpecialtyStats[]): MasteryRow[] {
  return bySpecialty
    .filter(isScored)
    .slice()
    .sort(byWeakest)
    .slice(0, MASTERY_MAX_ROWS)
    .map(s => ({ specialty: s.specialty, score: s.average_score, band: band(s.average_score) }));
}

// ── soapDimensions ───────────────────────────────────────────────────────────

/** Chaves iguais às gravadas em `case_attempts.breakdown` pelo `eval_service`. */
export type SoapDim = 'subjetivo' | 'objetivo' | 'avaliacao' | 'plano';

export interface SoapRow {
  dim: SoapDim;
  score: number;
  band: MasteryRow['band'];
}

/** Ordem canônica S/O/A/P — é assim que o aluno aprende o método. */
const SOAP_ORDER: SoapDim[] = ['subjetivo', 'objetivo', 'avaliacao', 'plano'];

/**
 * SPEC-013 §6.8: com menos de `SOAP_MIN_ATTEMPTS` tentativas avaliadas a média
 * é ruído — o bloco não renderiza. Tentativas anteriores à migration do
 * `breakdown` não entram (o backend já as descarta), então um aluno antigo
 * volta a ver o card só depois de 3 casos novos.
 */
export function soapDimensions(soap: SoapProfile | null | undefined): SoapRow[] {
  if (!soap || soap.attempts < SOAP_MIN_ATTEMPTS) return [];
  return SOAP_ORDER.map(dim => {
    const score = Math.round(soap[dim]);
    return { dim, score, band: band(score) };
  });
}

// ── buildRecommendations ─────────────────────────────────────────────────────

export type RecoKind = 'weak' | 'stale' | 'class' | 'streak';

export interface Recommendation {
  kind: RecoKind;
  caseId: string;
  caseKind: 'class' | 'free';
  title: string;
  specialty: string | null;
  /** Chave i18n — nunca texto pronto (R5). */
  reasonKey: string;
  reasonValues: Record<string, string | number>;
}

export interface StudyPlanInput {
  history: AttemptHistory[];
  bySpecialty: SpecialtyStats[];
  availableCases: AvailableCase[];
  freeCases: FreeCase[];
}

/** Candidato normalizado: a home mistura casos de turma e livres no mesmo pool. */
interface CaseCandidate {
  id: string;
  title: string;
  specialty: string | null;
  caseKind: 'class' | 'free';
  isBasic: boolean;
}

function classCandidate(c: AvailableCase): CaseCandidate {
  return {
    id: c.id,
    title: c.title,
    specialty: c.specialty ?? null,
    caseKind: 'class',
    isBasic: (c.difficulty ?? '').toLowerCase().startsWith('bás'),
  };
}

/**
 * `FreeCase` não tem `specialty`: a especialidade vive em `area` e o nível em
 * `difficulty` (`easy|medium|hard`). Ver SPEC-013 casos de teste §10.
 */
function freeCandidate(c: FreeCase): CaseCandidate {
  return {
    id: c.id,
    title: c.title,
    specialty: c.area ?? null,
    caseKind: 'free',
    isBasic: c.difficulty === 'easy',
  };
}

function createdAt(c: AvailableCase): number {
  return c.created_at ? new Date(c.created_at).getTime() : 0;
}

function deadlineOf(c: AvailableCase): number | null {
  const raw = c.available_until ?? c.expires_at ?? null;
  return raw ? new Date(raw).getTime() : null;
}

export function buildRecommendations(input: StudyPlanInput, now: Date): Recommendation[] {
  const { history, bySpecialty, availableCases, freeCases } = input;
  const out: Recommendation[] = [];
  const usedCaseIds = new Set<string>();
  const usedSpecialties = new Set<string>();

  const pool: CaseCandidate[] = [
    ...availableCases.map(classCandidate),
    ...freeCases.map(freeCandidate),
  ];

  /** Última tentativa de cada caso, para preferir o que o aluno não viu (T6.19). */
  const lastAttemptByCase = new Map<string, number>();
  for (const a of history) {
    // Entradas de chat IA não têm `case_id` — não dizem nada sobre casos vistos.
    if (!a.case_id) continue;
    const t = new Date(a.started_at).getTime();
    const prev = lastAttemptByCase.get(a.case_id);
    if (prev === undefined || t > prev) lastAttemptByCase.set(a.case_id, t);
  }

  /** Caso ainda não tentado primeiro; entre os tentados, o mais antigo (T6.19b). */
  function pickCase(candidates: CaseCandidate[]): CaseCandidate | null {
    const free = candidates.filter(c => !usedCaseIds.has(c.id));
    if (free.length === 0) return null;
    const untouched = free.filter(c => !lastAttemptByCase.has(c.id));
    if (untouched.length > 0) return untouched[0];
    return free
      .slice()
      .sort((a, b) => (lastAttemptByCase.get(a.id) ?? 0) - (lastAttemptByCase.get(b.id) ?? 0))[0];
  }

  function pickBySpecialty(specialty: string): CaseCandidate | null {
    return pickCase(pool.filter(c => c.specialty === specialty));
  }

  function push(kind: RecoKind, c: CaseCandidate, reasonKey: string, reasonValues: Recommendation['reasonValues'], specialty: string | null) {
    usedCaseIds.add(c.id);
    if (specialty) usedSpecialties.add(specialty);
    out.push({ kind, caseId: c.id, caseKind: c.caseKind, title: c.title, specialty, reasonKey, reasonValues });
  }

  // Motor 1 — ponto fraco. Promove a próxima elegível em vez de desistir (P3).
  const weakest = bySpecialty.filter(isScored).filter(s => s.attempts >= WEAK_MIN_ATTEMPTS).slice().sort(byWeakest)[0];
  if (weakest) {
    const c = pickBySpecialty(weakest.specialty);
    if (c) {
      push('weak', c, 'home.reco.weak', { score: weakest.average_score, attempts: weakest.attempts }, weakest.specialty);
    }
  }

  // Motor 2 — sem prática. Nunca dois cards da mesma especialidade (T6.7).
  const lastBySpecialty = new Map<string, number>();
  for (const a of history) {
    if (!a.specialty) continue;
    const t = new Date(a.started_at).getTime();
    const prev = lastBySpecialty.get(a.specialty);
    if (prev === undefined || t > prev) lastBySpecialty.set(a.specialty, t);
  }
  const stale = [...lastBySpecialty.entries()]
    .map(([specialty, t]) => ({ specialty, days: daysBetween(now, new Date(t)) }))
    .filter(s => s.days >= STALE_MIN_DAYS && !usedSpecialties.has(s.specialty))
    .sort((a, b) => b.days - a.days || a.specialty.localeCompare(b.specialty));
  for (const s of stale) {
    const c = pickBySpecialty(s.specialty);
    if (c) {
      push('stale', c, 'home.reco.stale', { days: s.days }, s.specialty);
      break;
    }
  }

  // Motor 3 — casos da turma. `AvailableCase` já traz o que precisamos (P4).
  const classCase = availableCases
    .filter(c => c.attempts_count === 0)
    .filter(c => {
      const deadline = deadlineOf(c);
      return deadline === null || deadline >= now.getTime();
    })
    .slice()
    .sort((a, b) => {
      const da = deadlineOf(a);
      const db = deadlineOf(b);
      if (da !== null && db !== null) return da - db;
      if (da !== null) return -1; // sem prazo vai para o fim
      if (db !== null) return 1;
      // Sem prazo em nenhum dos dois: o mais recente primeiro (`created_at` é nullable).
      return createdAt(b) - createdAt(a);
    })
    .map(classCandidate)
    .find(c => !usedCaseIds.has(c.id));
  if (classCase) {
    push('class', classCase, 'home.reco.class', {}, classCase.specialty);
  }

  // Motor 4 — manter o ritmo. Só caso básico; não rebaixa para outro nível (T6.15).
  const streak = studyStreak(history, now);
  const attemptedToday = history.some(a => daysBetween(now, new Date(a.started_at)) === 0);
  if (streak.current >= 1 && !attemptedToday) {
    const c = pickCase(pool.filter(x => x.isBasic));
    if (c) push('streak', c, 'home.reco.streak', { days: streak.current }, c.specialty);
  }

  return out.slice(0, MAX_RECOMMENDATIONS);
}
